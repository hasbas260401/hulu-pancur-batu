'use server'

import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const TEMPLATE_DIR = path.join(process.cwd(), 'public', 'templates')

type ActionResult = { success: boolean; message: string }

// <helpers>
// Bersihkan nama file: hanya huruf, angka, strip, dan garis bawah
function safeBaseName(original: string) {
  const base = path.basename(original).replace(/\.docx$/i, '')
  const cleaned = base
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return cleaned || 'template'
}

// File .docx adalah arsip ZIP, selalu diawali byte "PK\x03\x04"
function isDocxBytes(bytes: Uint8Array) {
  return (
    bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  )
}

// Pastikan sebuah path berada di dalam folder tertentu
function isInsideDir(target: string, dir: string) {
  const rel = path.relative(dir, target)
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}
// </helpers>

export async function uploadTemplateAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin.ok) return { success: false, message: admin.message }

  const nama = String(formData.get('nama') ?? '').trim()
  const kode = String(formData.get('kode') ?? '').trim().toUpperCase()
  const kodeKlasifikasi = String(formData.get('kodeKlasifikasi') ?? '').trim() || '470'
  const file = formData.get('file')

  if (!nama || !kode) {
    return { success: false, message: 'Nama surat dan kode surat wajib diisi.' }
  }
  if (nama.length > 100) {
    return { success: false, message: 'Nama surat maksimal 100 karakter.' }
  }
  if (!/^[A-Z0-9_-]{1,20}$/.test(kode)) {
    return {
      success: false,
      message: 'Kode surat hanya boleh huruf, angka, strip, atau garis bawah (maksimal 20 karakter).',
    }
  }
  if (kodeKlasifikasi.length > 20) {
    return { success: false, message: 'Kode klasifikasi maksimal 20 karakter.' }
  }
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'File template wajib diunggah.' }
  }
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return { success: false, message: 'File harus berformat .docx.' }
  }
  if (file.size > MAX_SIZE) {
    return { success: false, message: 'Ukuran file maksimal 5 MB.' }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isDocxBytes(bytes)) {
    return { success: false, message: 'File bukan dokumen .docx yang valid.' }
  }

  let savedPath: string | null = null
  try {
    const duplicate = await prisma.templateSurat.findUnique({ where: { kode } })
    if (duplicate) {
      return {
        success: false,
        message: `Kode "${kode}" sudah dipakai oleh template "${duplicate.nama}". Gunakan kode lain.`,
      }
    }

    await fs.mkdir(TEMPLATE_DIR, { recursive: true })
    const fileName = `${Date.now()}-${safeBaseName(file.name)}.docx`
    const fullPath = path.join(TEMPLATE_DIR, fileName)
    await fs.writeFile(fullPath, bytes)
    savedPath = fullPath

    await prisma.templateSurat.create({
      data: {
        nama,
        kode,
        kodeKlasifikasi,
        filePath: `/templates/${fileName}`,
        placeholders: ['nama', 'nik', 'alamat', 'tanggal_surat'],
        aktif: true,
      },
    })

    revalidatePath('/dashboard/surat/template')
    return { success: true, message: `Template "${nama}" berhasil ditambahkan.` }
  } catch (error) {
    // Database gagal setelah file tersimpan: bersihkan file agar tidak menjadi sampah
    if (savedPath) await fs.unlink(savedPath).catch(() => {})

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: `Kode "${kode}" sudah dipakai. Gunakan kode lain.` }
    }
    console.error('Error upload template:', error)
    return { success: false, message: 'Gagal menyimpan template. Silakan coba lagi.' }
  }
}

export async function hapusTemplateAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin.ok) return { success: false, message: admin.message }

  if (typeof id !== 'string' || !id) {
    return { success: false, message: 'Template tidak valid.' }
  }

  try {
    const template = await prisma.templateSurat.findUnique({ where: { id } })

    // Sudah terhapus sebelumnya (misalnya klik ganda): anggap berhasil, bukan error
    if (!template) {
      revalidatePath('/dashboard/surat/template')
      return { success: true, message: 'Template sudah dihapus sebelumnya.' }
    }

    // deleteMany tidak melempar error bila data sudah tidak ada
    await prisma.templateSurat.deleteMany({ where: { id } })

    // File fisik dihapus setelah database berhasil (dan hanya bila berada di folder templates)
    if (template.filePath) {
      try {
        const fullPath = path.join(process.cwd(), 'public', template.filePath)
        if (isInsideDir(fullPath, TEMPLATE_DIR)) {
          await fs.unlink(fullPath)
        }
      } catch (err) {
        console.error('Gagal menghapus file fisik:', err)
      }
    }

    revalidatePath('/dashboard/surat/template')
    revalidatePath('/dashboard/surat/riwayat')
    return { success: true, message: `Template "${template.nama}" berhasil dihapus.` }
  } catch (error) {
    console.error('Error hapus template:', error)
    return { success: false, message: 'Gagal menghapus template. Silakan coba lagi.' }
  }
}
