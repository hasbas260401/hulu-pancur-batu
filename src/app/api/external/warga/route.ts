import { NextResponse } from 'next/server'
import { PrismaClient, type Prisma } from '@prisma/client'
import { verifyApiKey } from '@/lib/api-key'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const STATUS_VALID = ['AKTIF', 'PINDAH', 'MENINGGAL', 'SEMUA']
const NO_STORE = { 'Cache-Control': 'no-store' }

// Format tanggal YYYY-MM-DD menurut zona waktu Indonesia (WIB)
function formatTanggal(d: Date) {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
}

export async function GET(req: Request) {
  const check = await verifyApiKey(req, 'WARGA')
  if (!check.ok) return check.response

  try {
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100))
    const status = (searchParams.get('status') || 'AKTIF').toUpperCase()

    if (!STATUS_VALID.includes(status)) {
      return NextResponse.json(
        { error: `Parameter status tidak valid. Pilihan: ${STATUS_VALID.join(', ')}.` },
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
      nik: w.nik,
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
      { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), status } },
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
