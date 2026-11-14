import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { sendMail } from '@/lib/mailer'

const NO_STORE = { 'Cache-Control': 'no-store' }
const TOKEN_TTL_MS = 15 * 60 * 1000

// <helpers>
function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return '****@****'

  const maskedName = name.length > 4 ? name.substring(0, 2) + '*'.repeat(name.length - 4) + name.slice(-2) : name[0] + '***'

  const domainParts = domain.split('.')
  const maskedDomain = domainParts[0][0] + '***' + (domainParts.length > 1 ? '.' + domainParts.slice(1).join('.') : '')

  return `${maskedName}@${maskedDomain}`
}
// </helpers>

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

// Alamat dasar untuk tautan di email. TIDAK memakai header Host dari permintaan di produksi,
// karena penyerang bisa memalsukannya agar korban menerima tautan reset menuju situs milik penyerang.
function baseUrl(req: Request): string | null {
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL
  if (configured) return configured.replace(/\/+$/, '')

  if (process.env.NODE_ENV !== 'production') {
    const host = req.headers.get('host') || 'localhost:3000'
    return `${host.includes('localhost') ? 'http' : 'https'}://${host}`
  }
  return null
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req)
    const rlIp = rateLimit(`fp-ip:${ip}`, 20, 15 * 60 * 1000)
    if (!rlIp.ok) return tooMany(rlIp.retryAfterSec)

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Isi permintaan tidak valid.' }, 400)
    }

    const action = String(body?.action ?? '')
    const nik = String(body?.nik ?? '').trim()

    // 1. CEK NIK & BERIKAN KISI-KISI EMAIL
    if (action === 'check-nik') {
      if (!/^\d{16}$/.test(nik)) return json({ error: 'NIK harus 16 digit angka.' }, 400)

      const rlNik = rateLimit(`fp-check:${nik}`, 5, 15 * 60 * 1000)
      if (!rlNik.ok) return tooMany(rlNik.retryAfterSec)

      const user = await prisma.user.findFirst({
        where: { OR: [{ username: nik }, { warga: { nik } }] },
        select: { email: true },
      })

      if (!user || !user.email) {
        return json({ error: 'NIK tidak ditemukan dalam database.' }, 404)
      }

      return json({ success: true, maskedEmail: maskEmail(user.email) })
    }

    // 2. KIRIM LINK RESET PASSWORD KE EMAIL
    if (action === 'send-link') {
      const email = String(body?.email ?? '').trim().toLowerCase()
      if (!/^\d{16}$/.test(nik) || !email) return json({ error: 'NIK dan Email wajib diisi.' }, 400)

      const rlSend = rateLimit(`fp-send:${nik}`, 3, 60 * 60 * 1000)
      if (!rlSend.ok) return tooMany(rlSend.retryAfterSec)

      const user = await prisma.user.findFirst({
        where: { OR: [{ username: nik }, { warga: { nik } }] },
        select: { id: true, email: true },
      })

      if (!user || !user.email || user.email.toLowerCase() !== email) {
        return json({ error: 'NIK atau Email yang dimasukkan tidak cocok dengan data warga.' }, 400)
      }

      const base = baseUrl(req)
      if (!base) {
        console.error('APP_URL belum diatur: tautan reset password tidak dapat dibuat di produksi.')
        return json({ error: 'Layanan pemulihan kata sandi belum dikonfigurasi. Hubungi administrator.' }, 500)
      }

      // Token acak; yang disimpan di database hanya hash-nya, satu token aktif per akun
      // (token baru otomatis mematikan tautan lama). Memakai kolom emailOtp/emailOtpExpiresAt yang sudah ada.
      const resetToken = crypto.randomBytes(32).toString('hex')
      await prisma.user.update({
        where: { id: user.id },
        data: { emailOtp: sha256(resetToken), emailOtpExpiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      })

      const resetUrl = `${base}/reset-password?token=${resetToken}`

      try {
        await sendMail({
          fromName: 'SIDU Desa Hulu Pancur Batu',
          to: user.email,
          subject: 'Link Reset Password - SIDU Desa Hulu Pancur Batu',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #065f46; text-align: center;">Pemulihan Kata Sandi Akun</h2>
              <p>Halo,</p>
              <p>Anda menerima email ini karena ada permintaan pemulihan kata sandi untuk akun Layanan Kependudukan Desa Hulu Pancur Batu.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #047857; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password Sekarang</a>
              </p>
              <p style="font-size: 13px; color: #64748b;">Atau salin tautan berikut ke browser Anda:</p>
              <p style="font-size: 12px; color: #047857; word-break: break-all;">${resetUrl}</p>
              <p style="font-size: 13px; color: #64748b; margin-top: 20px;">Tautan ini hanya berlaku selama 15 menit dan hanya dapat dipakai sekali. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
            </div>
          `,
        })
      } catch (mailError) {
        await prisma.user.update({ where: { id: user.id }, data: { emailOtp: null, emailOtpExpiresAt: null } })
        console.error('Gagal mengirim email reset password:', mailError)
        return json({ error: 'Gagal mengirim email. Silakan coba lagi nanti.' }, 500)
      }

      try {
        await prisma.auditLog.create({
          data: { userId: user.id, aksi: 'MINTA_RESET_PASSWORD', entitas: 'User', entitasId: user.id, detail: {}, ip },
        })
      } catch (error) {
        console.error('Gagal mencatat audit log:', error)
      }

      return json({ success: true, message: 'Link reset password berhasil dikirim ke email terdaftar.' })
    }

    return json({ error: 'Aksi tidak valid.' }, 400)
  } catch (err) {
    console.error('Error Forgot Password Link:', err)
    return json({ error: 'Terjadi kesalahan pada server.' }, 500)
  }
}