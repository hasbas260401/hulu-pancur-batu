'use server'

import { PrismaClient, Prisma, type JenisKelamin } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getWargaScope } from '@/lib/warga-scope'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

type ActionResult = { success: boolean; message: string }

const JENIS_KELAMIN = ['LAKI_LAKI', 'PEREMPUAN']
const AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDHA', 'KONGHUCU']
const STATUS_KAWIN = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
const HUBUNGAN = [
  'Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Cucu',
  'Orang Tua', 'Mertua', 'Famili Lain', 'Lainnya',
]

// <helpers>
function text(value: FormDataEntryValue | null, max = 255) {
  return String(value ?? '').trim().slice(0, max)
}

// Tanggal lahir: valid, tidak di masa depan, tidak sebelum 1900
function readBirthDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null
  if (d.getUTCFullYear() < 1900) return null
  return d
}
// </helpers>

export async function updateWargaAction(id: string, formData: FormData): Promise<ActionResult> {
  // Wajib ADMIN, atau KADUS berizin 'warga'. KADUS hanya boleh mengubah warga di dusunnya sendiri.
  const scope = await getWargaScope()
  if (!scope.ok) return { success: false, message: scope.message }

  if (typeof id !== 'string' || !id || id.length > 100) {
    return { success: false, message: 'Data warga tidak valid.' }
  }

  // Filter dusun ikut di query, jadi warga dusun lain tidak akan ditemukan
  const current = await prisma.warga.findFirst({
    where: { id, ...scope.dusunFilter },
    include: { kk: true },
  })
  if (!current) {
    return { success: false, message: 'Data warga tidak ditemukan atau bukan bagian dari wilayah Anda.' }
  }

  const nama = text(formData.get('nama'), 100)
  const nik = text(formData.get('nik'), 20)
  const noKk = text(formData.get('noKk'), 20)
  const jenisKelamin = text(formData.get('jenisKelamin'), 15)
  const tempatLahir = text(formData.get('tempatLahir'), 100)
  const tanggalLahirRaw = text(formData.get('tanggalLahir'), 12)
  const agama = text(formData.get('agama'), 15).toUpperCase()
  const pekerjaan = text(formData.get('pekerjaan'), 100)
  const statusPerkawinan = text(formData.get('statusPerkawinan'), 20)
  const hubunganKeluarga = text(formData.get('hubunganKeluarga'), 30)
  const alamatKK = text(formData.get('alamatKK'), 255)

  if (nama.length < 2) return { success: false, message: 'Nama lengkap wajib diisi.' }
  if (!JENIS_KELAMIN.includes(jenisKelamin)) return { success: false, message: 'Jenis kelamin tidak valid.' }
  if (!AGAMA.includes(agama)) return { success: false, message: 'Agama tidak valid.' }
  if (!STATUS_KAWIN.includes(statusPerkawinan)) return { success: false, message: 'Status perkawinan tidak valid.' }
  if (!HUBUNGAN.includes(hubunganKeluarga)) return { success: false, message: 'Hubungan keluarga tidak valid.' }

  // Format 16 digit hanya diwajibkan bila NIK/KK diubah, agar data lama yang formatnya
  // tidak standar tetap bisa diedit tanpa harus memperbaiki NIK-nya dulu
  if (nik !== current.nik && !/^\d{16}$/.test(nik)) {
    return { success: false, message: 'NIK harus 16 digit angka.' }
  }
  if (!noKk) return { success: false, message: 'Nomor KK wajib diisi.' }
  if (noKk !== current.kk?.noKk && !/^\d{16}$/.test(noKk)) {
    return { success: false, message: 'Nomor KK harus 16 digit angka.' }
  }

  const tanggalLahir = readBirthDate(tanggalLahirRaw)
  if (!tanggalLahir) return { success: false, message: 'Tanggal lahir tidak valid.' }

  // KADUS: dusun tidak bisa dipindah (tetap dusunnya). ADMIN: dusun yang dipilih harus benar-benar ada.
  let dusunId = current.dusunId
  if (scope.role === 'ADMIN') {
    const n = parseInt(text(formData.get('dusunId'), 10), 10)
    if (!Number.isInteger(n)) return { success: false, message: 'Wilayah dusun wajib dipilih.' }
    if (n !== current.dusunId) {
      const ada = await prisma.dusun.findUnique({ where: { id: n }, select: { id: true } })
      if (!ada) return { success: false, message: 'Dusun yang dipilih tidak ditemukan.' }
    }
    dusunId = n
  }

  try {
    if (nik !== current.nik) {
      const dipakai = await prisma.warga.findUnique({ where: { nik }, select: { id: true } })
      if (dipakai) return { success: false, message: 'NIK tersebut sudah terdaftar pada warga lain.' }
    }

    await prisma.$transaction(async (tx) => {
      let targetKkId = current.kkId

      if (noKk !== current.kk?.noKk) {
        // Pindah ke KK lain: pakai KK yang sudah ada (harus satu dusun) atau buat KK baru
        let kk = await tx.kartuKeluarga.findUnique({ where: { noKk } })
        if (kk) {
          if (kk.dusunId !== dusunId) throw new Error('KK_DUSUN_BEDA')
        } else {
          kk = await tx.kartuKeluarga.create({
            data: { noKk, dusunId, alamat: alamatKK || current.kk?.alamat || 'Desa Hulu Pancur Batu' },
          })
        }
        targetKkId = kk.id
      } else if (dusunId !== current.dusunId && current.kk && current.kk.dusunId !== dusunId) {
        // Dusun diubah padahal tetap di KK yang sama: akan membuat dusun warga berbeda dari dusun KK-nya
        throw new Error('DUSUN_BEDA_KK')
      }

      await tx.warga.update({
        where: { id: current.id },
        data: {
          nama,
          nik,
          kkId: targetKkId,
          jenisKelamin: jenisKelamin as JenisKelamin,
          tempatLahir,
          tanggalLahir,
          agama,
          pekerjaan,
          statusPerkawinan,
          hubunganKeluarga,
          dusunId,
        },
      })

      if (targetKkId && alamatKK) {
        await tx.kartuKeluarga.update({ where: { id: targetKkId }, data: { alamat: alamatKK } })
      }
    })

    // Catat kolom apa saja yang berubah (tanpa menyimpan isinya)
    const berubah: string[] = []
    if (nama !== current.nama) berubah.push('nama')
    if (nik !== current.nik) berubah.push('nik')
    if (noKk !== current.kk?.noKk) berubah.push('noKk')
    if (dusunId !== current.dusunId) berubah.push('dusun')
    if (jenisKelamin !== current.jenisKelamin) berubah.push('jenisKelamin')
    if (agama !== (current.agama ?? '').toUpperCase()) berubah.push('agama')
    if (pekerjaan !== (current.pekerjaan ?? '')) berubah.push('pekerjaan')
    if (statusPerkawinan !== (current.statusPerkawinan ?? '')) berubah.push('statusPerkawinan')
    if (hubunganKeluarga !== (current.hubunganKeluarga ?? '')) berubah.push('hubunganKeluarga')
    if (alamatKK && alamatKK !== (current.kk?.alamat ?? '')) berubah.push('alamat')

    try {
      const h = await headers()
      await prisma.auditLog.create({
        data: {
          userId: scope.userId,
          aksi: 'UBAH_WARGA',
          entitas: 'Warga',
          entitasId: current.id,
          detail: { kolom: berubah.join(', ') || '-' },
          ip: h.get('x-forwarded-for')?.split(',')[0].trim() || null,
        },
      })
    } catch (error) {
      console.error('Gagal mencatat audit log:', error)
    }

    revalidatePath('/dashboard/warga')
    revalidatePath(`/dashboard/warga/${id}`)
    revalidatePath(`/dashboard/warga/${id}/edit`)
    return { success: true, message: 'Data warga berhasil diperbarui.' }
  } catch (error) {
    if (error instanceof Error && error.message === 'KK_DUSUN_BEDA') {
      return { success: false, message: 'Nomor KK tersebut terdaftar di dusun lain. Pilih KK yang berada di dusun yang sama.' }
    }
    if (error instanceof Error && error.message === 'DUSUN_BEDA_KK') {
      return {
        success: false,
        message: 'Dusun warga harus sama dengan dusun Kartu Keluarganya. Untuk memindahkan dusun, ubah juga Nomor KK ke KK di dusun tujuan.',
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: 'NIK atau Nomor KK tersebut sudah terdaftar.' }
    }
    console.error('Error ubah warga:', error)
    return { success: false, message: 'Gagal menyimpan perubahan. Silakan coba lagi.' }
  }
}
