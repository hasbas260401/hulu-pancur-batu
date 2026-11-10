import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { auth } from '@/auth'

const globalForSettings = globalThis as unknown as {
  prisma?: PrismaClient
  settingsOtp?: Map<string, { otp: string; email: string; expires: number }>
}
const prisma = globalForSettings.prisma ?? new PrismaClient()
const otpStore = globalForSettings.settingsOtp ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForSettings.prisma = prisma
  globalForSettings.settingsOtp = otpStore
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login ulang.' }, { status: 401 })
    }

    const { action, newEmail: rawEmail, otp } = await req.json()
    const newEmail = String(rawEmail || '').trim().toLowerCase()

    // 1. KIRIM OTP GANTI EMAIL
    if (action === 'send-email-otp') {
      if (!newEmail || !newEmail.includes('@')) {
        return NextResponse.json({ error: 'Format email baru tidak valid.' }, { status: 400 })
      }

      const existing = await prisma.user.findUnique({ where: { email: newEmail } })
      if (existing) {
        return NextResponse.json({ error: 'Email tersebut sudah terdaftar di akun lain.' }, { status: 400 })
      }

      const generatedOtp = crypto.randomInt(100000, 1000000).toString()
      otpStore.set(userId, {
        otp: generatedOtp,
        email: newEmail,
        expires: Date.now() + 10 * 60 * 1000, // berlaku 10 menit
      })

      await transporter.sendMail({
        from: `"Desa Hulu Pancur Batu" <${process.env.EMAIL_SERVER_USER}>`,
        to: newEmail,
        subject: 'Kode Verifikasi OTP Perubahan Email Akun',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #1e3a8a; margin-bottom: 5px;">Pemerintahan Desa Hulu Pancur Batu</h2>
            <p style="color: #64748b; font-size: 14px;">Sistem Administrasi & Layanan Kependudukan</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
            <p>Halo,</p>
            <p>Berikut adalah kode verifikasi OTP untuk mengubah alamat email akun Anda:</p>
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb; border-radius: 8px; margin: 20px 0;">
              ${generatedOtp}
            </div>
            <p style="font-size: 13px; color: #64748b;">Kode ini berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.</p>
          </div>
        `,
      })

      return NextResponse.json({ message: `Kode OTP telah dikirim ke ${newEmail}.` })
    }

    // 2. VERIFIKASI & SIMPAN EMAIL BARU
    if (action === 'verify-and-save-email') {
      if (!newEmail || !otp) {
        return NextResponse.json({ error: 'Email baru dan kode OTP wajib diisi.' }, { status: 400 })
      }

      const saved = otpStore.get(userId)
      if (!saved || saved.expires < Date.now() || saved.email !== newEmail || saved.otp !== String(otp)) {
        return NextResponse.json({ error: 'Kode OTP salah atau sudah kedaluwarsa.' }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      })

      otpStore.delete(userId)

      return NextResponse.json({ message: 'Email berhasil diverifikasi dan diperbarui!' })
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 })
  } catch (error) {
    console.error('Settings API Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengirim email. Periksa konfigurasi server.' },
      { status: 500 }
    )
  }
}