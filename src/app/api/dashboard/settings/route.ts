import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { auth } from '@/auth'
import { sendMail } from '@/lib/mailer'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { isSameOrigin, forbiddenOriginResponse } from '@/lib/same-origin'

const NO_STORE = { 'Cache-Control': 'no-store' }
const OTP_TTL_MS = 10 * 60 * 1000
const MAX_WRONG = 5

type SettingsOtp = {
  otp: string
  email: string
  expires: number
  wrong: number
}

const globalForSettings = globalThis as unknown as {
  settingsOtp?: Map<string, SettingsOtp>
}
const otpStore = globalForSettings.settingsOtp ?? new Map<string, SettingsOtp>()
if (process.env.NODE_ENV !== 'production') {
  globalForSettings.settingsOtp = otpStore
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } })
}

function tooMany(retryAfterSec: number) {
  return json(
    { error: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSec} detik.` },
    429,
    { 'Retry-After': String(retryAfterSec) }
  )
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** Perbandingan kode OTP yang aman terhadap serangan timing. */
function otpMatches(expected: string, given: string) {
  if (!/^\d{6}$/.test(given) || expected.length !== given.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOriginResponse()

  try {
    const session = await auth()
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return json({ error: 'Unauthorized. Silakan login ulang.' }, 401)
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return json({ error: 'Isi permintaan tidak valid.' }, 400)
    }

    const { action, newEmail: rawEmail, otp } = body as {
      action?: string
      newEmail?: unknown
      otp?: unknown
    }
    const newEmail = String(rawEmail ?? '').trim().toLowerCase()

    // 1. KIRIM OTP GANTI EMAIL
    if (action === 'send-email-otp') {
      // Batasi pengiriman: per akun dan per IP, agar email tidak bisa dibanjiri.
      const perUser = rateLimit(`settings-otp:user:${userId}`, 5, 15 * 60 * 1000)
      if (!perUser.ok) return tooMany(perUser.retryAfterSec)
      const perIp = rateLimit(`settings-otp:ip:${clientIp(req)}`, 10, 15 * 60 * 1000)
      if (!perIp.ok) return tooMany(perIp.retryAfterSec)

      if (!isValidEmail(newEmail)) {
        return json({ error: 'Format email baru tidak valid.' }, 400)
      }

      const existing = await prisma.user.findUnique({ where: { email: newEmail } })
      if (existing) {
        return json({ error: 'Email tersebut sudah terdaftar di akun lain.' }, 400)
      }

      const generatedOtp = crypto.randomInt(100000, 1000000).toString()
      otpStore.set(userId, {
        otp: generatedOtp,
        email: newEmail,
        expires: Date.now() + OTP_TTL_MS,
        wrong: 0,
      })

      await sendMail({
        fromName: 'Desa Hulu Pancur Batu',
        to: newEmail,
        subject: 'Kode Verifikasi OTP Perubahan Email Akun',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #065f46; margin-bottom: 5px;">Pemerintahan Desa Hulu Pancur Batu</h2>
            <p style="color: #64748b; font-size: 14px;">Sistem Administrasi &amp; Layanan Kependudukan</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
            <p>Halo,</p>
            <p>Berikut adalah kode verifikasi OTP untuk mengubah alamat email akun Anda:</p>
            <div style="background: #f0fdf4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #047857; border-radius: 8px; margin: 20px 0;">
              ${generatedOtp}
            </div>
            <p style="font-size: 13px; color: #64748b;">Kode ini berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.</p>
          </div>
        `,
      })

      return json({ message: `Kode OTP telah dikirim ke ${newEmail}.` })
    }

    // 2. VERIFIKASI & SIMPAN EMAIL BARU
    if (action === 'verify-and-save-email') {
      const perUser = rateLimit(`settings-otp-verify:${userId}`, 10, 15 * 60 * 1000)
      if (!perUser.ok) return tooMany(perUser.retryAfterSec)

      if (!isValidEmail(newEmail) || typeof otp !== 'string') {
        return json({ error: 'Email baru dan kode OTP wajib diisi.' }, 400)
      }

      const saved = otpStore.get(userId)
      if (!saved || saved.expires < Date.now() || saved.email !== newEmail) {
        return json({ error: 'Kode OTP salah atau sudah kedaluwarsa.' }, 400)
      }

      if (!otpMatches(saved.otp, otp)) {
        saved.wrong++
        if (saved.wrong >= MAX_WRONG) {
          otpStore.delete(userId)
          return json({ error: 'Terlalu banyak percobaan salah. Silakan minta kode OTP baru.' }, 429)
        }
        return json({ error: 'Kode OTP salah atau sudah kedaluwarsa.' }, 400)
      }

      // Bisa saja email baru sempat dipakai akun lain setelah OTP dikirim.
      const existing = await prisma.user.findUnique({ where: { email: newEmail } })
      if (existing && existing.id !== userId) {
        otpStore.delete(userId)
        return json({ error: 'Email tersebut sudah terdaftar di akun lain.' }, 400)
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      })

      // Sesi di perangkat lain dicabut setelah alamat email berubah.
      const currentSessionId = (session?.user as any)?.sessionId as string | undefined
      await prisma.userSession.deleteMany({
        where: {
          userId,
          ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
        },
      })

      otpStore.delete(userId)

      return json({ message: 'Email berhasil diverifikasi dan diperbarui!' })
    }

    return json({ error: 'Aksi tidak valid.' }, 400)
  } catch (error) {
    console.error('Settings API Error:', error)
    return json({ error: 'Gagal memproses permintaan. Silakan coba lagi.' }, 500)
  }
}
