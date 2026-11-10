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

export async function tambahWargaAction(formData: FormData): Promise<ActionResult> {
  // Wajib ADMIN, atau KADUS berizin 'warga' (sebelumnya siapa pun bisa menambah data penduduk)
  const scope = await getWargaScope()
  if (!scope.ok) return { success: false, message: scope.message }

  const nik = text(formData.get('nik'), 20)
  const noKk = text(formData.get('noKk'), 20)
  const nama = text(formData.get('nama'), 100)
  const jenisKelamin = text(formData.get('jenisKelamin'), 15)
  const tempatLahir = text(formData.get('tempatLahir'), 100)
  const tanggalLahirRaw = text(formData.get('tanggalLahir'), 12)
  const agama = text(formData.get('agama'), 15).toUpperCase()
  const statusPerkawinan = text(formData.get('statusPerkawinan'), 20)
  const pekerjaan = text(formData.get('pekerjaan'), 100)
  const alamatBaru = text(formData.get('alamat'), 255)

  if (!/^\d{16}$/.test(nik)) return { success: false, message: 'NIK harus 16 digit angka.' }
  if (!/^\d{16}$/.test(noKk)) return { success: false, message: 'Nomor KK harus 16 digit angka.' }
  if (nama.length < 2) return { success: false, message: 'Nama lengkap wajib diisi.' }
  if (!JENIS_KELAMIN.includes(jenisKelamin)) return { success: false, message: 'Jenis kelamin tidak valid.' }
  if (!AGAMA.includes(agama)) return { success: false, message: 'Agama tidak valid.' }
  if (!STATUS_KAWIN.includes(statusPerkawinan)) return { success: false, message: 'Status perkawinan tidak valid.' }

  const tanggalLahir = readBirthDate(tanggalLahirRaw)
  if (!tanggalLahir) return { success: false, message: 'Tanggal lahir tidak valid.' }

  // KADUS: dusun dipaksa dusunnya sendiri. ADMIN: dusun yang dipilih harus benar-benar ada.
  let dusunId = scope.dusunFilter.dusunId
  if (dusunId === undefined) {
    const n = parseInt(text(formData.get('dusunId'), 10), 10)
    if (!Number.isInteger(n)) return { success: false, message: 'Wilayah dusun wajib dipilih.' }
    const ada = await prisma.dusun.findUnique({ where: { id: n }, select: { id: true } })
    if (!ada) return { success: false, message: 'Dusun yang dipilih tidak ditemukan.' }
    dusunId = n
  }

  try {
    const sudahAda = await prisma.warga.findUnique({ where: { nik }, select: { id: true } })
    if (sudahAda) return { success: false, message: 'NIK tersebut sudah terdaftar.' }

    const wargaBaru = await prisma.$transaction(async (tx) => {
      let kk = await tx.kartuKeluarga.findUnique({ where: { noKk } })

      if (kk && kk.dusunId !== dusunId) {
        // Tidak boleh memasukkan warga ke KK milik dusun lain
        throw new Error('KK_DUSUN_BEDA')
      }

      if (!kk) {
        kk = await tx.kartuKeluarga.create({
          data: { noKk, alamat: alamatBaru || 'Desa Hulu Pancur Batu', dusunId },
        })
      }

      return tx.warga.create({
        data: {
          nik,
          nama,
          jenisKelamin: jenisKelamin as JenisKelamin,
          tempatLahir,
          tanggalLahir,
          agama,
          pekerjaan,
          statusPerkawinan,
          dusunId,
          kkId: kk.id,
        },
        select: { id: true },
      })
    })

    try {
      const h = await headers()
      await prisma.auditLog.create({
        data: {
          userId: scope.userId,
          aksi: 'TAMBAH_WARGA',
          entitas: 'Warga',
          entitasId: wargaBaru.id,
          detail: { nama },
          ip: h.get('x-forwarded-for')?.split(',')[0].trim() || null,
        },
      })
    } catch (error) {
      console.error('Gagal mencatat audit log:', error)
    }

    revalidatePath('/dashboard/warga')
    return { success: true, message: `Data ${nama} berhasil ditambahkan.` }
  } catch (error) {
    if (error instanceof Error && error.message === 'KK_DUSUN_BEDA') {
      return { success: false, message: 'Nomor KK tersebut sudah terdaftar di dusun lain.' }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: 'NIK atau Nomor KK tersebut sudah terdaftar.' }
    }
    console.error('Error tambah warga:', error)
    return { success: false, message: 'Gagal menyimpan data warga. Silakan coba lagi.' }
  }
}
