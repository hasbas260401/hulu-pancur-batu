'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getWargaScope } from '@/lib/warga-scope'

type ActionResult = { success: boolean; message: string }

const STATUS_VALID = ['AKTIF', 'MENINGGAL', 'PINDAH']

// <helpers>
function text(value: FormDataEntryValue | null, max = 255) {
  return String(value ?? '').trim().slice(0, max)
}

// Tanggal "YYYY-MM-DD" yang valid dan tidak di masa depan (toleransi 1 hari untuk zona waktu)
function readPastDate(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null
  return d
}

function maskNik(nik: string) {
  return nik.length > 8 ? `${nik.slice(0, 4)}••••••••${nik.slice(-3)}` : nik
}
// </helpers>

async function clientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null
}

async function catatAudit(
  userId: string,
  aksi: string,
  entitasId: string,
  detail: Record<string, string>
) {
  try {
    await prisma.auditLog.create({
      data: { userId, aksi, entitas: 'Warga', entitasId, detail, ip: await clientIp() },
    })
  } catch (error) {
    console.error('Gagal mencatat audit log:', error)
  }
}

export async function hapusWargaAction(id: string): Promise<ActionResult> {
  const scope = await getWargaScope()
  if (!scope.ok) return { success: false, message: scope.message }

  if (typeof id !== 'string' || !id || id.length > 100) {
    return { success: false, message: 'Data warga tidak valid.' }
  }

  try {
    // Filter dusun ikut di query: KADUS tidak bisa menyentuh warga dusun lain
    const target = await prisma.warga.findFirst({
      where: { id, ...scope.dusunFilter },
      select: { id: true, nama: true, nik: true },
    })
    if (!target) {
      return { success: false, message: 'Data warga tidak ditemukan atau bukan bagian dari wilayah Anda.' }
    }

    await prisma.warga.deleteMany({ where: { id, ...scope.dusunFilter } })

    await catatAudit(scope.userId, 'HAPUS_WARGA', id, { nama: target.nama, nik: maskNik(target.nik) })

    revalidatePath('/dashboard/warga')
    return { success: true, message: `Data ${target.nama} berhasil dihapus.` }
  } catch (error) {
    // P2003: warga masih direferensikan data lain (misalnya tercatat sebagai penerima bansos)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return {
        success: false,
        message:
          'Warga ini tidak dapat dihapus karena masih tercatat di data lain (misalnya sebagai penerima bansos). Hapus data terkait terlebih dahulu, atau ubah statusnya menjadi Pindah/Meninggal.',
      }
    }
    console.error('Error hapus warga:', error)
    return { success: false, message: 'Gagal menghapus data warga. Silakan coba lagi.' }
  }
}

export async function updateStatusWargaAction(formData: FormData): Promise<ActionResult> {
  const scope = await getWargaScope()
  if (!scope.ok) return { success: false, message: scope.message }

  const id = text(formData.get('id'), 100)
  const statusWarga = text(formData.get('statusWarga'), 20)
  const keterangan = text(formData.get('keterangan'))
  const alasanPindah = text(formData.get('alasanPindah'))

  if (!id) return { success: false, message: 'Data warga tidak valid.' }
  if (!STATUS_VALID.includes(statusWarga)) return { success: false, message: 'Status tidak valid.' }

  const data: Prisma.WargaUpdateManyMutationInput = { statusWarga }

  if (statusWarga === 'MENINGGAL') {
    const tanggal = readPastDate(text(formData.get('tanggalMeninggal'), 30))
    if (!tanggal) {
      return { success: false, message: 'Tanggal meninggal wajib diisi dengan benar dan tidak boleh di masa depan.' }
    }
    data.tanggalMeninggal = tanggal
    data.sebabMeninggal = keterangan || '-'
    data.tanggalPindah = null
    data.alamatTujuan = null
    data.alasanPindah = null
  } else if (statusWarga === 'PINDAH') {
    const tanggal = readPastDate(text(formData.get('tanggalPindah'), 30))
    if (!tanggal) {
      return { success: false, message: 'Tanggal pindah wajib diisi dengan benar dan tidak boleh di masa depan.' }
    }
    data.tanggalPindah = tanggal
    data.alamatTujuan = keterangan || '-'
    data.alasanPindah = alasanPindah || 'Pindah Domisili'
    data.tanggalMeninggal = null
    data.sebabMeninggal = null
  } else {
    // AKTIF
    data.tanggalMeninggal = null
    data.sebabMeninggal = null
    data.tanggalPindah = null
    data.alamatTujuan = null
    data.alasanPindah = null
  }

  try {
    const before = await prisma.warga.findFirst({
      where: { id, ...scope.dusunFilter },
      select: { nama: true, statusWarga: true },
    })
    if (!before) {
      return { success: false, message: 'Data warga tidak ditemukan atau bukan bagian dari wilayah Anda.' }
    }

    await prisma.warga.updateMany({ where: { id, ...scope.dusunFilter }, data })

    await catatAudit(scope.userId, 'UBAH_STATUS_WARGA', id, {
      nama: before.nama,
      dari: before.statusWarga,
      ke: statusWarga,
    })

    revalidatePath('/dashboard/warga')
    revalidatePath(`/dashboard/warga/${id}`)
    return { success: true, message: `Status ${before.nama} berhasil diubah menjadi ${statusWarga}.` }
  } catch (error) {
    console.error('Error ubah status warga:', error)
    return { success: false, message: 'Gagal mengubah status warga. Silakan coba lagi.' }
  }
}
