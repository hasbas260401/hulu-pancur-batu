import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const NO_STORE = { 'Cache-Control': 'no-store' }

// <helpers>
function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

// Token dibuat dari 32 byte acak = 64 karakter heksadesimal
function isTokenFormat(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
}
// </helpers>

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } })
}

function findByToken(token: string) {
  return prisma.user.findFirst({
    where: { emailOtp: sha256(token), emailOtpExpiresAt: { gt: new Date() } },
    select: { id: true, username: true, warga: { select: { nik: true } } },
  })
}

export async function GET(req: Request) {
  try {
    const rl = rateLimit(`rp-get:${clientIp(req)}`, 30, 15 * 60 * 1000)
    if (!rl.ok) return json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, 429, { 'Retry-After': String(rl.retryAfterSec) })

    const token = new URL(req.url).searchParams.get('token')
    if (!isTokenFormat(token)) {
      return json({ error: 'Tautan reset password tidak valid atau sudah kedaluwarsa.' }, 400)
    }

    const user = await findByToken(token)
    if (!user) {
      return json({ error: 'Tautan reset password tidak valid atau sudah kedaluwarsa.' }, 400)
    }

    return json({ success: true, nik: user.username || user.warga?.nik || '' })
  } catch (err) {
    console.error('Error GET reset-password:', err)
    return json({ error: 'Terjadi kesalahan pada server.' }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`rp-post:${clientIp(req)}`, 10, 15 * 60 * 1000)
    if (!rl.ok) return json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, 429, { 'Retry-After': String(rl.retryAfterSec) })

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Isi permintaan tidak valid.' }, 400)
    }

    const token = body?.token
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!isTokenFormat(token)) {
      return json({ error: 'Tautan sudah tidak berlaku atau sudah pernah digunakan.' }, 400)
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      return json({ error: 'Password harus 8 sampai 72 karakter.' }, 400)
    }

    const user = await findByToken(token)
    if (!user) {
      return json({ error: 'Tautan sudah tidak berlaku atau sudah pernah digunakan.' }, 400)
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    // updateMany + syarat token: hanya satu permintaan yang berhasil memakai token ini (sekali pakai)
    const result = await prisma.user.updateMany({
      where: { id: user.id, emailOtp: sha256(token) },
      data: { passwordHash, emailOtp: null, emailOtpExpiresAt: null, failedLogin: 0, lockedUntil: null },
    })
    if (result.count === 0) {
      return json({ error: 'Tautan sudah tidak berlaku atau sudah pernah digunakan.' }, 400)
    }

    // Semua perangkat yang masih login dengan password lama dikeluarkan
    await prisma.userSession.deleteMany({ where: { userId: user.id } })

    try {
      await prisma.auditLog.create({
        data: { userId: user.id, aksi: 'RESET_PASSWORD', entitas: 'User', entitasId: user.id, detail: {}, ip: clientIp(req) },
      })
    } catch (error) {
      console.error('Gagal mencatat audit log:', error)
    }

    return json({ success: true, message: 'Password berhasil diubah.' })
  } catch (err) {
    console.error('Error POST reset-password:', err)
    return json({ error: 'Terjadi kesalahan pada server.' }, 500)
  }
}