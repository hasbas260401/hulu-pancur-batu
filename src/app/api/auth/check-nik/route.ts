import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const NO_STORE = { 'Cache-Control': 'no-store' }

// <helpers>
// "ILHAM SAPUTRA" -> "I**** S******" (cukup untuk konfirmasi, tanpa membuka nama lengkap)
function maskNama(nama: string) {
  return nama
    .trim()
    .split(/\s+/)
    .map((kata) => kata[0] + '*'.repeat(Math.max(kata.length - 1, 0)))
    .join(' ')
}
// </helpers>

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } })
}

// Rute ini publik (dipakai formulir pendaftaran), jadi dibatasi agar tidak bisa dipakai
// menelusuri data penduduk: laju permintaan dibatasi dan nama warga hanya ditampilkan tersamar.
export async function POST(req: Request) {
  try {
    const ip = clientIp(req)
    const rlIp = rateLimit(`nik-ip:${ip}`, 15, 15 * 60 * 1000)
    if (!rlIp.ok) {
      return json(
        { valid: false, message: `Terlalu banyak pengecekan. Coba lagi dalam ${rlIp.retryAfterSec} detik.` },
        429,
        { 'Retry-After': String(rlIp.retryAfterSec) }
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ valid: false, message: 'Isi permintaan tidak valid.' }, 400)
    }

    const nik = String(body?.nik ?? '').trim()
    if (!/^\d{16}$/.test(nik)) {
      return json({ valid: false, message: 'NIK harus 16 digit angka.' }, 400)
    }

    const rlNik = rateLimit(`nik-key:${nik}`, 5, 15 * 60 * 1000)
    if (!rlNik.ok) {
      return json(
        { valid: false, message: `Terlalu banyak pengecekan untuk NIK ini. Coba lagi dalam ${rlNik.retryAfterSec} detik.` },
        429,
        { 'Retry-After': String(rlNik.retryAfterSec) }
      )
    }

    const warga = await prisma.warga.findUnique({
      where: { nik },
      select: { nama: true, statusWarga: true, dusun: { select: { nama: true } } },
    })

    if (!warga) {
      return json({ valid: false, message: 'NIK belum terdaftar di Desa Hulu Pancur Batu.' })
    }

    if (warga.statusWarga !== 'AKTIF') {
      return json({ valid: false, message: 'Data warga ini tidak berstatus aktif. Silakan hubungi kantor desa.' })
    }

    const existingUser = await prisma.user.findUnique({ where: { username: nik }, select: { id: true } })
    if (existingUser) {
      return json({ valid: false, message: 'NIK ini sudah memiliki akun terdaftar. Silakan login.' })
    }

    const dusunNama = warga.dusun?.nama ?? '-'
    return json({
      valid: true,
      nama: maskNama(warga.nama),
      dusunNama,
      message: `NIK terdaftar di ${dusunNama}`,
    })
  } catch (error) {
    console.error('Check NIK error:', error)
    return json({ valid: false, message: 'Terjadi kesalahan server.' }, 500)
  }
}