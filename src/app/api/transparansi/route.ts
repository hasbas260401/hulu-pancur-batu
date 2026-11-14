import { NextResponse, connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLatestBudgetYear } from '@/lib/budget'

const JENIS_VALID = ['PENDAPATAN', 'BELANJA', 'PEMBIAYAAN']

// Rute ini SENGAJA publik: anggaran dan realisasi dana desa adalah informasi transparansi.
// Isinya tidak memuat data pribadi. Yang dibatasi hanyalah parameter agar tidak disalahgunakan.
export async function GET(request: Request) {
  await connection()
  try {
    const { searchParams } = new URL(request.url)

    // Tanpa parameter `tahun`, pakai tahun anggaran terbaru di database agar
    // hasil API sama dengan yang tampil di halaman publik.
    const tahunRaw = parseInt(searchParams.get('tahun') || '', 10)
    const tahun = Number.isInteger(tahunRaw) && tahunRaw >= 2000 && tahunRaw <= 2100
      ? tahunRaw
      : await getLatestBudgetYear()

    const jenisRaw = (searchParams.get('jenis') || '').trim().toUpperCase()
    const page = Math.min(100000, Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '5', 10) || 5))
    const skip = (page - 1) * pageSize

    const whereClause: { tahun: number; jenis?: string } = { tahun }
    if (JENIS_VALID.includes(jenisRaw)) {
      whereClause.jenis = jenisRaw
    }

    const rawData = await prisma.danaDesa.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    })

    // Konversi Decimal ke Number
    const data = rawData.map((item) => ({
      ...item,
      anggaran: Number(item.anggaran),
      realisasi: Number(item.realisasi),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API Transparansi Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 })
  }
}