'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { generateApiKey } from '@/lib/api-key'
import {
  getWhatsAppConfig,
  isAuthTypeWhatsApp,
  isWhatsAppAktif,
  kirimWhatsApp,
  maskToken,
  normalisasiNomorWhatsApp,
  resolveAuthType,
  whatsAppGatewayHost,
  type AuthTypeWhatsApp,
  type WhatsAppConfig,
} from '@/lib/whatsapp'
import { gatewayBaseUrl } from '@/lib/whatsapp-gateway'

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

  if (newPassword.length < 8) {
    return { success: false, message: 'Password baru minimal 8 karakter.' }
  }
  if (newPassword.length > 72) {
    // Batas bcrypt: hanya 72 byte pertama yang diproses.
    return { success: false, message: 'Password baru maksimal 72 karakter.' }
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

    // Setelah password diganti, sesi di perangkat lain dicabut. Sesi yang
    // sedang dipakai tetap aktif agar pengguna tidak langsung ter-logout.
    const currentSessionId = (session.user as any).sessionId as string | undefined
    await prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
    })

    revalidatePath('/dashboard/settings')
    return { success: true, message: 'Password berhasil diperbarui! Perangkat lain telah dikeluarkan.' }
  } catch (error) {
    console.error('Error update password:', error)
    return { success: false, message: 'Terjadi kesalahan pada server.' }
  }
}

// 2. GANTI NOMOR HP / WHATSAPP
export async function updatePhone(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' }

  const raw = String(formData.get('noWhatsapp') ?? '').replace(/[\s-]/g, '')
  if (raw && !/^\+?[0-9]{8,15}$/.test(raw)) {
    return { success: false, message: 'Nomor WhatsApp tidak valid. Gunakan angka, contoh 081234567890.' }
  }
  const noWhatsapp = raw || null

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { noWhatsapp },
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

// =====================================================================
// 5. WHATSAPP GATEWAY (khusus ADMIN)
// =====================================================================

export type WhatsAppConfigView = {
  enabled: boolean
  apiUrl: string
  senderNumber: string | null
  format: 'form' | 'json'
  authType: AuthTypeWhatsApp
  hasToken: boolean
  tokenMasked: string | null
  gatewayUrl: string | null
}

export type SimpanWhatsAppResult = {
  success: boolean
  message: string
  config?: WhatsAppConfigView
}

function keView(config: WhatsAppConfig): WhatsAppConfigView {
  return {
    enabled: config.enabled,
    apiUrl: config.apiUrl,
    senderNumber: config.senderNumber,
    format: config.format,
    authType: config.authType,
    hasToken: Boolean(config.token),
    tokenMasked: maskToken(config.token),
    gatewayUrl: gatewayBaseUrl(config.apiUrl),
  }
}

/** Pastikan pemanggil ADMIN; pesan error disesuaikan untuk pengaturan WA. */
async function pastikanAdminWa() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return { ok: false as const, message: 'Hanya admin yang dapat mengubah pengaturan WhatsApp.' }
  }
  return admin
}

async function catatAuditWa(
  userId: string,
  aksi: string,
  entitasId: string,
  detail: Record<string, string | number | boolean | null>,
  ip: string | null
) {
  try {
    await prisma.auditLog.create({
      data: { userId, aksi, entitas: 'PengaturanWhatsApp', entitasId, detail, ip },
    })
  } catch (error) {
    console.error('Gagal mencatat audit log WhatsApp:', error)
  }
}

/** Simpan konfigurasi WhatsApp Gateway ke database. */
export async function simpanPengaturanWhatsApp(formData: FormData): Promise<SimpanWhatsAppResult> {
  const admin = await pastikanAdminWa()
  if (!admin.ok) return { success: false, message: admin.message }

  const apiUrl = String(formData.get('apiUrl') ?? '').trim().slice(0, 500)
  if (!apiUrl) return { success: false, message: 'API URL wajib diisi.' }

  try {
    const parsed = new URL(apiUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protokol')
  } catch {
    return { success: false, message: 'API URL tidak valid. Gunakan alamat http:// atau https://.' }
  }

  const tokenInput = String(formData.get('token') ?? '').trim()
  if (tokenInput.length > 500) {
    return { success: false, message: 'Token terlalu panjang (maksimal 500 karakter).' }
  }

  const senderRaw = String(formData.get('senderNumber') ?? '').trim()
  let senderNumber: string | null = null
  if (senderRaw) {
    senderNumber = normalisasiNomorWhatsApp(senderRaw)
    if (!senderNumber) {
      return {
        success: false,
        message: 'Sender Number tidak valid. Gunakan nomor Indonesia, contoh 081234567890.',
      }
    }
  }

  const format = formData.get('format') === 'json' ? 'json' : 'form'
  const authInput = formData.get('authType')
  const authType: AuthTypeWhatsApp = isAuthTypeWhatsApp(authInput) ? authInput : 'auto'
  const enabled = String(formData.get('enabled')) === 'true'

  try {
    const existing = await prisma.pengaturanWhatsApp.findUnique({ where: { id: 1 } })
    // Token kosong = pertahankan token lama (agar admin tidak perlu mengetik ulang).
    const tokenFinal = tokenInput || existing?.token || null

    if (enabled && !tokenFinal) {
      return {
        success: false,
        message: 'Isi token gateway terlebih dahulu sebelum mengaktifkan notifikasi.',
      }
    }

    await prisma.pengaturanWhatsApp.upsert({
      where: { id: 1 },
      create: { id: 1, apiUrl, token: tokenFinal, senderNumber, enabled, format, authType },
      update: { apiUrl, token: tokenFinal, senderNumber, enabled, format, authType },
    })

    await catatAuditWa(
      admin.userId,
      'UBAH_PENGATURAN_WA',
      '1',
      {
        gateway: whatsAppGatewayHost(apiUrl),
        sender_number: senderNumber,
        format,
        auth_type: authType,
        auth_efektif: resolveAuthType({ format, authType }),
        enabled,
        token_diubah: Boolean(tokenInput),
      },
      admin.ip
    )

    const saved = await getWhatsAppConfig()
    revalidatePath('/dashboard/settings')

    return {
      success: true,
      message: enabled
        ? 'Pengaturan WhatsApp tersimpan dan notifikasi diaktifkan.'
        : 'Pengaturan WhatsApp tersimpan. Notifikasi saat ini nonaktif.',
      config: keView(saved),
    }
  } catch (error) {
    console.error('Error menyimpan pengaturan WhatsApp:', error)
    return { success: false, message: 'Gagal menyimpan pengaturan WhatsApp.' }
  }
}

/** Kirim pesan uji ke nomor tertentu memakai konfigurasi yang tersimpan. */
export async function ujiKirimWhatsApp(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const admin = await pastikanAdminWa()
  if (!admin.ok) return { success: false, message: admin.message }

  const target = String(formData.get('target') ?? '').trim()
  if (!target) return { success: false, message: 'Masukkan nomor WhatsApp tujuan uji coba.' }

  try {
    const config = await getWhatsAppConfig()
    if (!isWhatsAppAktif(config)) {
      return {
        success: false,
        message: 'Notifikasi WhatsApp belum aktif. Simpan API URL dan token lalu centang Status Notifikasi.',
      }
    }

    const hasil = await kirimWhatsApp({
      nomor: target,
      pesan:
        '*SIDU — Uji Notifikasi WhatsApp*\n\n' +
        'Jika Anda menerima pesan ini, integrasi WhatsApp Gateway pada sistem SIDU berhasil.\n\n' +
        'Pesan ini dikirim otomatis oleh sistem. Mohon tidak dibalas.',
    })

    await catatAuditWa(
      admin.userId,
      'UJI_WA_GATEWAY',
      '1',
      {
        hasil: hasil.status,
        nomor_tujuan: hasil.nomorTujuan ?? null,
        alasan: hasil.alasan ?? null,
      },
      admin.ip
    )

    if (hasil.status === 'terkirim') {
      return { success: true, message: `Pesan uji berhasil dikirim ke ${hasil.nomorTujuan}.` }
    }

    return {
      success: false,
      message: `Pesan uji tidak terkirim: ${hasil.alasan ?? 'gateway menolak permintaan.'}`,
    }
  } catch (error) {
    console.error('Error uji WhatsApp:', error)
    return { success: false, message: 'Terjadi kesalahan saat mengirim pesan uji.' }
  }
}