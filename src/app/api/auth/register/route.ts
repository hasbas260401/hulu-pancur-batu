import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// <helpers>
const OTP_TTL_MS = 10 * 60 * 1000 // kode berlaku 10 menit
const MAX_WRONG = 5 // salah 5x -> kode dihanguskan, harus minta kode baru

type OtpEntry = { otp: string; expires: number; wrong: number }
type OtpResult = 'ok' | 'salah' | 'kedaluwarsa' | 'terlalu-banyak'

function normEmail(raw: unknown) {
  return String(raw ?? '').trim().toLowerCase()
}

function isEmail(v: string) {
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function cleanWhatsapp(raw: unknown): { ok: boolean; value: string | null } {
  const v = String(raw ?? '').replace(/[\s-]/g, '')
  if (!v) return { ok: true, value: null }
  return /^\+?[0-9]{8,15}$/.test(v) ? { ok: true, value: v } : { ok: false, value: null }
}

// Periksa kode OTP: ada masa berlaku, dibatasi jumlah tebakan salah, dan dibandingkan aman waktu
function checkOtp(store: Map<string, OtpEntry>, email: string, otp: string, now = Date.now()): OtpResult {
  const entry = store.get(email)
  if (!entry || now > entry.expires) {
    store.delete(email)
    return 'kedaluwarsa'
  }
  const cocok = /^\d{6}$/.test(otp) && crypto.timingSafeEqual(Buffer.from(entry.otp), Buffer.from(otp))
  if (cocok) return 'ok'

  entry.wrong++
  if (entry.wrong >= MAX_WRONG) {
    store.delete(email)
    return 'terlalu-banyak'
  }
  return 'salah'
}
// </helpers>

const g = globalThis as unknown as { regOtp?: Map<string, OtpEntry> }
const otpStore = g.regOtp ?? (g.regOtp = new Map<string, OtpEntry>())

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

const NO_STORE = { 'Cache-Control': 'no-store' }

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

function otpError(result: OtpResult) {
  if (result === 'terlalu-banyak') {
    return json({ error: 'Terlalu banyak percobaan salah. Silakan minta kode OTP yang baru.' }, 429)
  }
  return json({ error: 'Kode OTP salah atau sudah kedaluwarsa.' }, 400)
}

export async function POST(req: Request) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Isi permintaan tidak valid.' }, 400)
    }

    const action = String(body?.action ?? '')
    const ip = clientIp(req)

    // 1. KIRIM OTP KE EMAIL
    if (action === 'send-otp') {
      const email = normEmail(body?.email)
      if (!isEmail(email)) return json({ error: 'Alamat email tidak valid.' }, 400)

      const rlIp = rateLimit(`reg-otp-ip:${ip}`, 10, 60 * 60 * 1000)
      if (!rlIp.ok) return tooMany(rlIp.retryAfterSec)
      const rlCool = rateLimit(`reg-otp-cool:${email}`, 1, 60 * 1000) // jeda 60 detik per email
      if (!rlCool.ok) return tooMany(rlCool.retryAfterSec)
      const rlMail = rateLimit(`reg-otp-mail:${email}`, 5, 60 * 60 * 1000)
      if (!rlMail.ok) return tooMany(rlMail.retryAfterSec)

      const emailExist = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      })
      if (emailExist) {
        return json({ error: 'Email sudah digunakan oleh akun lain.' }, 400)
      }

      const generatedOtp = crypto.randomInt(100000, 1000000).toString()
      otpStore.set(email, { otp: generatedOtp, expires: Date.now() + OTP_TTL_MS, wrong: 0 })

      try {
        await transporter.sendMail({
          from: `"Desa Hulu Pancur Batu" <${process.env.EMAIL_SERVER_USER}>`,
          to: email,
          subject: 'Kode Verifikasi OTP Pendaftaran Akun Warga',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #1e3a8a; margin-bottom: 5px;">Pemerintahan Desa Hulu Pancur Batu</h2>
              <p style="color: #64748b; font-size: 14px;">Sistem Administrasi & Layanan Kependudukan</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
              <p>Halo,</p>
              <p>Berikut adalah kode verifikasi OTP Anda untuk pendaftaran akun warga:</p>
              <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb; border-radius: 8px; margin: 20px 0;">
                ${generatedOtp}
              </div>
              <p style="font-size: 13px; color: #64748b;">Kode ini berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.</p>
            </div>
          `,
        })
      } catch (mailError) {
        otpStore.delete(email)
        console.error('Gagal mengirim email:', mailError)
        return json({ error: 'Gagal mengirim email OTP. Silakan coba lagi nanti.' }, 500)
      }

      return json({ message: `Kode OTP berhasil dikirim ke ${email}. Silakan cek inbox/spam email Anda.` })
    }

    // 2. PENDAFTARAN AKUN AKHIR
    if (action === 'register') {
      const rl = rateLimit(`reg-ip:${ip}`, 10, 60 * 60 * 1000)
      if (!rl.ok) return tooMany(rl.retryAfterSec)

      const nik = String(body?.nik ?? '').trim()
      const email = normEmail(body?.email)
      const password = typeof body?.password === 'string' ? body.password : ''
      const otp = String(body?.otp ?? '').trim()
      const wa = cleanWhatsapp(body?.noWhatsapp)

      if (!nik || !email || !password || !otp) return json({ error: 'Semua kolom wajib diisi.' }, 400)
      if (!/^\d{16}$/.test(nik)) return json({ error: 'NIK harus 16 digit angka.' }, 400)
      if (!isEmail(email)) return json({ error: 'Alamat email tidak valid.' }, 400)
      if (password.length < 8 || password.length > 72) {
        return json({ error: 'Password harus 8 sampai 72 karakter.' }, 400)
      }
      if (!wa.ok) return json({ error: 'Nomor WhatsApp tidak valid.' }, 400)

      const hasil = checkOtp(otpStore, email, otp)
      if (hasil !== 'ok') return otpError(hasil)

      const warga = await prisma.warga.findUnique({
        where: { nik },
        select: { id: true, dusunId: true, statusWarga: true },
      })
      if (!warga) return json({ error: 'NIK tidak valid dalam database.' }, 400)
      if (warga.statusWarga !== 'AKTIF') {
        return json({ error: 'Data warga ini tidak berstatus aktif. Silakan hubungi kantor desa.' }, 400)
      }

      const passwordHash = await bcrypt.hash(password, 10)

      let userId: string
      try {
        const created = await prisma.user.create({
          data: {
            username: nik,
            email,
            passwordHash,
            role: 'WARGA',
            statusAkun: 'PENDING',
            wargaId: warga.id,
            dusunId: warga.dusunId,
            noWhatsapp: wa.value,
            permissions: ['warga-home', 'warga-profil', 'warga-surat', 'settings'],
          },
          select: { id: true },
        })
        userId = created.id
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return json({ error: 'NIK atau email ini sudah memiliki akun terdaftar.' }, 409)
        }
        throw error
      }

      otpStore.delete(email)

      try {
        await prisma.auditLog.create({
          data: { userId, aksi: 'REGISTER_WARGA', entitas: 'User', entitasId: userId, detail: { status: 'PENDING' }, ip },
        })
      } catch (error) {
        console.error('Gagal mencatat audit log:', error)
      }

      return json({ message: 'Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi Admin/Kadus.' }, 201)
    }

    // 3. VERIFIKASI OTP (cek langsung di formulir)
    if (action === 'verify-otp') {
      const email = normEmail(body?.email)
      const otp = String(body?.otp ?? '').trim()
      if (!email || !otp) return json({ valid: false, error: 'Email dan OTP diperlukan.' }, 400)

      const rl = rateLimit(`reg-verify-ip:${ip}`, 40, 15 * 60 * 1000)
      if (!rl.ok) return tooMany(rl.retryAfterSec)

      // Isian yang belum lengkap 6 angka tidak dihitung sebagai tebakan
      if (!/^\d{6}$/.test(otp)) return json({ valid: false, error: 'Kode OTP tidak sesuai.' })

      const hasil = checkOtp(otpStore, email, otp)
      if (hasil === 'ok') return json({ valid: true, message: 'OTP valid.' })
      if (hasil === 'terlalu-banyak') return otpError(hasil)
      return json({ valid: false, error: 'Kode OTP tidak sesuai.' })
    }

    return json({ error: 'Aksi tidak valid.' }, 400)
  } catch (error) {
    console.error('Register API Error:', error)
    return json({ error: 'Terjadi kesalahan pada server.' }, 500)
  }
}