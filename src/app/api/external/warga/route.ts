import { NextResponse } from 'next/server'
import { type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/api-key'
import { catatKejadianKeamanan, periksaParameterMencurigakan } from '@/lib/audit'
import { clientIp } from '@/lib/rate-limit'

const STATUS_VALID = ['AKTIF', 'PINDAH', 'MENINGGAL', 'SEMUA']
// Mode penyamaran NIK. Bawaannya "masked" agar NIK lengkap tidak keluar
// tanpa diminta secara eksplisit oleh pemilik API Key.
const NIK_MODE_VALID = ['masked', 'full']
const NO_STORE = { 'Cache-Control': 'no-store' }

// Format tanggal YYYY-MM-DD menurut zona waktu Indonesia (WIB)
function formatTanggal(d: Date) {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
}

// 1200000000000001 -> 1200********0001 (cukup untuk mencocokkan data tanpa
// membuka NIK utuh). NIK yang tidak berstandar 16 digit tetap disamarkan.
function maskNik(nik: string) {
  if (nik.length <= 8) return '*'.repeat(nik.length)
  return `${nik.slice(0, 4)}${'*'.repeat(nik.length - 8)}${nik.slice(-4)}`
}

export async function GET(req: Request) {
  const check = await verifyApiKey(req, 'WARGA')
  if (!check.ok) return check.response

  try {
    const { searchParams } = new URL(req.url)

    const mencurigakan = periksaParameterMencurigakan(searchParams)
    if (mencurigakan) {
      await catatKejadianKeamanan({
        aksi: 'SECURITY_INJEKSI_PAYLOAD',
        entitas: 'API Eksternal',
        detail: {
          sumber: 'API data warga',
          parameter: mencurigakan.parameter,
          pola: mencurigakan.pola,
        },
        ip: clientIp(req) === 'unknown' ? null : clientIp(req),
        tingkat: 'TINGGI',
      })
      return NextResponse.json(
        { error: 'Parameter permintaan tidak valid.' },
        { status: 400, headers: NO_STORE }
      )
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100))
    const status = (searchParams.get('status') || 'AKTIF').toUpperCase()
    const nikMode = (searchParams.get('nik') || 'masked').toLowerCase()

    if (!STATUS_VALID.includes(status)) {
      return NextResponse.json(
        { error: `Parameter status tidak valid. Pilihan: ${STATUS_VALID.join(', ')}.` },
        { status: 400, headers: NO_STORE }
      )
    }

    if (!NIK_MODE_VALID.includes(nikMode)) {
      return NextResponse.json(
        { error: `Parameter nik tidak valid. Pilihan: ${NIK_MODE_VALID.join(', ')}.` },
        { status: 400, headers: NO_STORE }
      )
    }

    const where: Prisma.WargaWhereInput = status === 'SEMUA' ? {} : { statusWarga: status }

    const [total, rows] = await prisma.$transaction([
      prisma.warga.count({ where }),
      prisma.warga.findMany({
        where,
        orderBy: [{ nama: 'asc' }, { id: 'asc' }], // urutan stabil agar paginasi konsisten
        skip: (page - 1) * limit,
        take: limit,
        // select eksplisit: data akun (passwordHash, email, dll) tidak pernah ikut keluar
        select: {
          nik: true,
          nama: true,
          jenisKelamin: true,
          tempatLahir: true,
          tanggalLahir: true,
          agama: true,
          pekerjaan: true,
          statusPerkawinan: true,
          hubunganKeluarga: true,
          statusWarga: true,
          kk: { select: { noKk: true, alamat: true, rt: true, rw: true } },
          dusun: { select: { nama: true } },
        },
      }),
    ])

    const data = rows.map((w) => ({
      nik: nikMode === 'full' ? w.nik : maskNik(w.nik),
      nama: w.nama,
      jenisKelamin: w.jenisKelamin,
      tempatLahir: w.tempatLahir,
      tanggalLahir: formatTanggal(w.tanggalLahir),
      agama: w.agama,
      pekerjaan: w.pekerjaan,
      statusPerkawinan: w.statusPerkawinan,
      hubunganKeluarga: w.hubunganKeluarga,
      status: w.statusWarga,
      noKk: w.kk.noKk,
      alamat: w.kk.alamat,
      rt: w.kk.rt,
      rw: w.kk.rw,
      dusun: w.dusun.nama,
    }))

    return NextResponse.json(
      { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), status, nik: nikMode } },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('External API warga error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500, headers: NO_STORE }
    )
  }
}
