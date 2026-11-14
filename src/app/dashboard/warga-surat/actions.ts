'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getWargaAccount } from '@/lib/warga-account'
import { ipDariHeaders } from '@/lib/audit'

export type AjukanSuratResult = { success: boolean; message: string }

// Batas pengajuan yang masih berjalan (belum selesai/ditolak) per warga.
// Mencegah warga membanjiri antrean surat dengan pengajuan berulang.
const MAX_PENGAJUAN_AKTIF = 3

const STATUS_AKTIF = ['DIAJUKAN', 'DIVERIFIKASI']

/**
 * Warga mengajukan permohonan surat baru.
 *
 * Keamanan:
 * - `wargaId` dan `dusunId` SELALU diambil dari relasi akun yang login, tidak
 *   pernah dari input formulir, sehingga warga tidak bisa mengajukan surat atas
 *   nama orang lain.
 * - Hanya akun warga yang sudah diverifikasi (ACTIVE/AKTIF) yang boleh mengajukan.
 */
export async function ajukanSuratAction(formData: FormData): Promise<AjukanSuratResult> {
  try {
    const account = await getWargaAccount()
    if (!account) {
      return { success: false, message: 'Sesi berakhir. Silakan login ulang.' }
    }
    if (account.role !== 'WARGA') {
      return { success: false, message: 'Hanya akun warga yang dapat mengajukan surat.' }
    }
    if (!account.isActive) {
      return {
        success: false,
        message: 'Akun Anda belum diverifikasi. Pengajuan surat aktif setelah akun disetujui admin.',
      }
    }
    if (!account.wargaId) {
      return {
        success: false,
        message: 'Akun Anda belum terhubung ke data kependudukan. Silakan hubungi Administrator.',
      }
    }

    const templateId = String(formData.get('templateId') ?? '').trim()
    const keperluan = String(formData.get('keperluan') ?? '').trim().slice(0, 500)

    if (!templateId) {
      return { success: false, message: 'Pilih jenis surat yang ingin diajukan.' }
    }
    if (keperluan.length < 5) {
      return { success: false, message: 'Keperluan surat wajib diisi minimal 5 karakter.' }
    }

    const template = await prisma.templateSurat.findUnique({
      where: { id: templateId },
      select: { id: true, nama: true, aktif: true },
    })
    if (!template || !template.aktif) {
      return { success: false, message: 'Jenis surat tidak tersedia. Silakan pilih yang lain.' }
    }

    const warga = await prisma.warga.findUnique({
      where: { id: account.wargaId },
      select: { id: true, dusunId: true, statusWarga: true },
    })
    if (!warga) {
      return { success: false, message: 'Data kependudukan Anda tidak ditemukan. Hubungi Administrator.' }
    }
    if (warga.statusWarga !== 'AKTIF') {
      return {
        success: false,
        message: 'Status kependudukan Anda tidak aktif (pindah/meninggal), sehingga pengajuan surat tidak dapat diproses.',
      }
    }

    const aktifCount = await prisma.pengajuanSurat.count({
      where: { wargaId: warga.id, status: { in: STATUS_AKTIF as any } },
    })
    if (aktifCount >= MAX_PENGAJUAN_AKTIF) {
      return {
        success: false,
        message: `Anda masih memiliki ${aktifCount} pengajuan yang sedang diproses. Mohon tunggu hingga selesai sebelum mengajukan surat baru.`,
      }
    }

    const pengajuan = await prisma.pengajuanSurat.create({
      data: {
        wargaId: warga.id,
        templateId: template.id,
        dusunId: warga.dusunId,
        keperluan,
        status: 'DIAJUKAN',
      },
      select: { id: true },
    })

    // Catat pengajuan surat agar aktivitas warga tampil di Audit Log.
    try {
      let ip: string | null = null
      try {
        ip = ipDariHeaders(await headers())
      } catch {
        ip = null
      }
      await prisma.auditLog.create({
        data: {
          userId: account.userId,
          aksi: 'AJUKAN_SURAT',
          entitas: 'PengajuanSurat',
          entitasId: pengajuan.id,
          detail: {
            jenis_surat: template.nama,
            keperluan: keperluan.slice(0, 200),
          },
          ip,
        },
      })
    } catch (error) {
      console.error('Gagal mencatat audit log:', error)
    }

    revalidatePath('/dashboard/warga-surat')
    revalidatePath('/dashboard/surat/riwayat')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `Pengajuan ${template.nama} berhasil dikirim. Pantau statusnya di tabel riwayat.`,
    }
  } catch (error) {
    console.error('Gagal mengajukan surat:', error)
    return { success: false, message: 'Terjadi kesalahan pada server. Silakan coba lagi.' }
  }
}
