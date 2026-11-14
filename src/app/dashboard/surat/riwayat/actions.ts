'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { getScope } from '@/lib/warga-scope'
import { catatKejadianKeamanan, ipDariHeaders } from '@/lib/audit'
import { kirimNotifikasiStatusSurat } from '@/lib/whatsapp'

/** IP pemanggil untuk catatan audit; tidak pernah menggagalkan aksi utama. */
async function ipPemanggil() {
  try {
    return ipDariHeaders(await headers())
  } catch {
    return null
  }
}

export type UbahStatusSuratResult = { success: boolean; message: string }

const STATUS_VALID = ['DIAJUKAN', 'DIVERIFIKASI', 'SELESAI', 'DITOLAK'] as const
type StatusSuratValue = (typeof STATUS_VALID)[number]

// Alur status yang diizinkan. Admin tidak bisa melompati tahapan (mis. Pending
// langsung Selesai) agar riwayat tetap dapat dipertanggungjawabkan.
const TRANSISI: Record<StatusSuratValue, StatusSuratValue[]> = {
  DIAJUKAN: ['DIVERIFIKASI', 'DITOLAK'],
  DIVERIFIKASI: ['SELESAI', 'DITOLAK'],
  DITOLAK: ['DIAJUKAN'],
  SELESAI: [],
}

function isStatusValid(value: string): value is StatusSuratValue {
  return (STATUS_VALID as readonly string[]).includes(value)
}

/**
 * Mengubah status pengajuan surat warga (Pending -> Proses -> Selesai).
 *
 * Keamanan:
 * - Hanya ADMIN, atau KADUS yang punya izin menu `surat` (dicek ke database).
 * - KADUS hanya boleh mengubah pengajuan di dusun penugasannya (anti-IDOR).
 * - Transisi status divalidasi agar tidak melompati tahapan.
 */
export async function ubahStatusSuratAction(formData: FormData): Promise<UbahStatusSuratResult> {
  try {
    const scope = await getScope('surat', 'pengelolaan surat masuk')
    if (!scope.ok) return { success: false, message: scope.message }

    const id = String(formData.get('id') ?? '').trim()
    const statusBaru = String(formData.get('status') ?? '').trim().toUpperCase()
    const catatanField = formData.get('catatan')
    const catatan = catatanField === null ? '' : String(catatanField).trim().slice(0, 500)
    const nomorField = formData.get('nomorSurat')
    const nomorSurat =
      nomorField === null ? undefined : String(nomorField).trim().slice(0, 100)

    if (!id) return { success: false, message: 'Pengajuan surat tidak dikenali.' }
    if (!isStatusValid(statusBaru)) {
      return { success: false, message: 'Status surat tidak valid.' }
    }
    if (statusBaru === 'DITOLAK' && catatan.length < 3) {
      return { success: false, message: 'Alasan penolakan wajib diisi minimal 3 karakter.' }
    }

    const pengajuan = await prisma.pengajuanSurat.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        dusunId: true,
        nomorSurat: true,
        warga: {
          select: {
            nama: true,
            user: { select: { noWhatsapp: true } },
          },
        },
        template: { select: { nama: true } },
      },
    })
    if (!pengajuan) {
      return { success: false, message: 'Pengajuan surat tidak ditemukan.' }
    }

    // KADUS dibatasi ke dusun penugasannya. ADMIN bebas (dusunFilter kosong).
    if (scope.role === 'KADUS') {
      const dusunId = scope.dusunFilter.dusunId
      if (!dusunId || pengajuan.dusunId !== dusunId) {
        await catatKejadianKeamanan({
          userId: scope.userId,
          aksi: 'SECURITY_AKSES_ILEGAL',
          entitas: 'PengajuanSurat',
          entitasId: pengajuan.id,
          detail: {
            area: 'pengelolaan surat',
            peran: scope.role,
            alasan: 'mencoba mengubah pengajuan dari dusun lain',
            dusun_tugas: dusunId ?? null,
            dusun_pengajuan: pengajuan.dusunId,
          },
          ip: await ipPemanggil(),
        })
        return { success: false, message: 'Anda tidak berwenang mengubah pengajuan dari dusun lain.' }
      }
    }

    const statusLama = pengajuan.status as StatusSuratValue
    if (!TRANSISI[statusLama]?.includes(statusBaru)) {
      return {
        success: false,
        message: `Status tidak dapat diubah dari ${statusLama} ke ${statusBaru}.`,
      }
    }

    // Nomor surat resmi harus unik. Abaikan baris ini sendiri agar admin bisa
    // menyimpan ulang nomor yang sudah tercatat pada permohonan yang sama.
    if (nomorSurat) {
      const bentrok = await prisma.pengajuanSurat.findFirst({
        where: { nomorSurat, NOT: { id } },
        select: { id: true },
      })
      if (bentrok) {
        return {
          success: false,
          message: `Nomor surat "${nomorSurat}" sudah digunakan pada pengajuan lain. Gunakan nomor lain.`,
        }
      }
    }

    const data: Prisma.PengajuanSuratUpdateInput = {
      status: statusBaru,
      diprosesOlehId: scope.userId,
      diprosesAt: new Date(),
    }

    if (statusBaru === 'DITOLAK') {
      data.catatan = catatan
    } else if (statusBaru === 'SELESAI') {
      // Catatan saat Selesai bersifat opsional (mis. instruksi pengambilan surat).
      data.catatan = catatan || null
    } else {
      data.catatan = null
    }

    if (nomorSurat) {
      data.nomorSurat = nomorSurat
    }

    await prisma.pengajuanSurat.update({
      where: { id },
      data,
    })

    // Catat perubahan status agar riwayat aktivitas lengkap dan dapat diaudit.
    try {
      await prisma.auditLog.create({
        data: {
          userId: scope.userId,
          aksi: 'UBAH_STATUS_SURAT',
          entitas: 'PengajuanSurat',
          entitasId: id,
          detail: {
            status_lama: statusLama,
            status_baru: statusBaru,
            nomor_surat: nomorSurat ?? null,
            catatan: catatan || null,
          },
          ip: await ipPemanggil(),
        },
      })
    } catch (error) {
      console.error('Gagal mencatat audit log:', error)
    }

    // Notifikasi WhatsApp ke warga pemohon saat surat SELESAI atau DITOLAK.
    // Dijalankan lewat after() agar pengiriman ke gateway tidak menahan respons
    // admin. Helper WhatsApp tidak pernah melempar error, dan kegagalannya hanya
    // dicatat sebagai audit — perubahan status di database tetap berhasil.
    if (statusBaru === 'SELESAI' || statusBaru === 'DITOLAK') {
      const nomorWhatsApp = pengajuan.warga?.user?.noWhatsapp ?? null
      const namaWarga = pengajuan.warga?.nama ?? 'Warga'
      const jenisSurat = pengajuan.template?.nama ?? 'Surat Desa'
      const nomorFinal = statusBaru === 'SELESAI' ? nomorSurat ?? pengajuan.nomorSurat ?? null : null
      const catatanFinal = catatan || null
      const statusFinal = statusBaru

      after(async () => {
        const hasil = await kirimNotifikasiStatusSurat({
          namaWarga,
          nomorWhatsApp,
          jenisSurat,
          status: statusFinal,
          nomorSurat: nomorFinal,
          catatan: catatanFinal,
        })

        // Jangan membanjiri audit log saat gateway memang belum dikonfigurasi.
        if (hasil.status === 'dilewati') return

        try {
          await prisma.auditLog.create({
            data: {
              userId: scope.userId,
              aksi: 'KIRIM_WA_SURAT',
              entitas: 'PengajuanSurat',
              entitasId: id,
              detail: {
                status_surat: statusFinal,
                hasil: hasil.status,
                nomor_tujuan: hasil.nomorTujuan ?? null,
                alasan: hasil.alasan ?? null,
              },
            },
          })
        } catch (error) {
          console.error('Gagal mencatat audit notifikasi WhatsApp:', error)
        }
      })
    }

    revalidatePath('/dashboard/surat/riwayat')
    revalidatePath('/dashboard/surat/buat')
    revalidatePath('/dashboard/warga-surat')
    revalidatePath('/dashboard')

    const pesan: Record<StatusSuratValue, string> = {
      DIAJUKAN: 'Pengajuan dikembalikan ke status Pending.',
      DIVERIFIKASI: 'Pengajuan berhasil dipindahkan ke status Proses.',
      SELESAI: 'Pengajuan berhasil diselesaikan dan catatan tersimpan.',
      DITOLAK: 'Pengajuan berhasil ditolak dengan catatan.',
    }
    return { success: true, message: pesan[statusBaru] }
  } catch (error: any) {
    console.error('Gagal mengubah status surat:', error)
    if (error?.code === 'P2002') {
      return {
        success: false,
        message: 'Nomor surat tersebut sudah digunakan. Gunakan nomor surat lain.',
      }
    }
    return { success: false, message: 'Terjadi kesalahan pada server. Silakan coba lagi.' }
  }
}
