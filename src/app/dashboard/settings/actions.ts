'use server'

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { generateApiKey } from '@/lib/api-key'

const prisma = new PrismaClient()

// 1. GANTI PASSWORD
export async function updatePassword(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, message: 'Semua kolom password wajib diisi.' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'Konfirmasi password baru tidak cocok.' }
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'Password baru minimal harus 6 karakter.' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.passwordHash) {
      return { success: false, message: 'Akun tidak ditemukan.' }
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      return { success: false, message: 'Password saat ini salah.' }
    }

    const salt = await bcrypt.genSalt(10)
    const newPasswordHash = await bcrypt.hash(newPassword, salt)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    return { success: true, message: 'Password berhasil diperbarui!' }
  } catch (error) {
    console.error('Error update password:', error)
    return { success: false, message: 'Terjadi kesalahan pada server.' }
  }
}

// 2. GANTI NOMOR HP / WHATSAPP
export async function updatePhone(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' }

  const noWhatsapp = formData.get('noWhatsapp') as string

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { noWhatsapp: noWhatsapp || null },
    })

    revalidatePath('/dashboard/settings')
    return { success: true, message: 'Nomor WhatsApp berhasil diperbarui!' }
  } catch (error) {
    console.error('Error update phone:', error)
    return { success: false, message: 'Gagal memperbarui nomor HP.' }
  }
}

// 3. REVOKE / HAPUS SESI PERANGKAT LAIN
export async function revokeSession(sessionId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' }

  // Jangan izinkan mencabut sesi perangkat yang sedang dipakai
  if ((session.user as any).sessionId === sessionId) {
    return { success: false, message: 'Tidak dapat mencabut sesi perangkat yang sedang dipakai.' }
  }

  try {
    const result = await prisma.userSession.deleteMany({
      where: { id: sessionId, userId: session.user.id },
    })

    if (result.count === 0) {
      return { success: false, message: 'Sesi tidak ditemukan.' }
    }

    revalidatePath('/dashboard/settings')
    return { success: true, message: 'Sesi perangkat berhasil dicabut.' }
  } catch (error) {
    console.error('Error revoke session:', error)
    return { success: false, message: 'Gagal mencabut sesi perangkat.' }
  }
}


// =====================================================================
// 4. API KEY INTEGRASI DATA (khusus ADMIN)
// =====================================================================

type JenisApiKey = 'WARGA' | 'BANSOS'

function isJenis(value: unknown): value is JenisApiKey {
  return value === 'WARGA' || value === 'BANSOS'
}

// Pastikan yang memanggil adalah ADMIN. Role dicek langsung dari database
// (bukan dari token login) agar perubahan role langsung berlaku.
async function requireAdmin() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return { ok: false as const, message: 'Unauthorized' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role !== 'ADMIN') {
    return { ok: false as const, message: 'Hanya admin yang dapat mengelola API Key.' }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null

  return { ok: true as const, userId, ip }
}

async function catatAudit(
  userId: string,
  aksi: string,
  jenis: JenisApiKey,
  entitasId: string | null,
  ip: string | null
) {
  try {
    await prisma.auditLog.create({
      data: { userId, aksi, entitas: 'ApiKey', entitasId, detail: { jenis }, ip },
    })
  } catch (error) {
    console.error('Gagal mencatat audit log:', error)
  }
}

// Generate (atau generate ulang) API key. Key lama langsung tidak berlaku.
// Key lengkap hanya dikembalikan SEKALI di sini dan tidak disimpan di database.
export async function generateApiKeyAction(jenis: string) {
  if (!isJenis(jenis)) return { success: false, message: 'Jenis data tidak valid.' }

  const admin = await requireAdmin()
  if (!admin.ok) return { success: false, message: admin.message }

  try {
    const { key, keyHash, keyPrefix } = generateApiKey()

    const row = await prisma.apiKey.upsert({
      where: { jenis },
      update: { keyHash, keyPrefix, isActive: true, createdById: admin.userId, lastUsedAt: null },
      create: { jenis, keyHash, keyPrefix, isActive: true, createdById: admin.userId },
    })

    await catatAudit(admin.userId, 'GENERATE_API_KEY', jenis, row.id, admin.ip)

    revalidatePath('/dashboard/settings')
    return {
      success: true,
      message: 'API Key berhasil dibuat. Salin sekarang, key tidak akan ditampilkan lagi.',
      key,
      keyPrefix,
    }
  } catch (error) {
    console.error('Error generate API key:', error)
    return { success: false, message: 'Gagal membuat API Key.' }
  }
}

// Aktifkan / nonaktifkan akses API tanpa mengganti key.
export async function toggleApiKeyAction(jenis: string, isActive: boolean) {
  if (!isJenis(jenis)) return { success: false, message: 'Jenis data tidak valid.' }

  const admin = await requireAdmin()
  if (!admin.ok) return { success: false, message: admin.message }

  try {
    const existing = await prisma.apiKey.findUnique({ where: { jenis } })
    if (!existing) {
      return { success: false, message: 'Belum ada API Key. Buat dulu dengan tombol Generate.' }
    }

    await prisma.apiKey.update({ where: { jenis }, data: { isActive: !!isActive } })

    await catatAudit(
      admin.userId,
      isActive ? 'AKTIFKAN_API_KEY' : 'NONAKTIFKAN_API_KEY',
      jenis,
      existing.id,
      admin.ip
    )

    revalidatePath('/dashboard/settings')
    return {
      success: true,
      message: isActive ? 'Akses API diaktifkan.' : 'Akses API dinonaktifkan.',
    }
  } catch (error) {
    console.error('Error toggle API key:', error)
    return { success: false, message: 'Gagal mengubah status API Key.' }
  }
}