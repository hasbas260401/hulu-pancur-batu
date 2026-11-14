import { NextResponse } from 'next/server'
import { type Prisma, type StatusBansos } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getBansosScope } from '@/lib/warga-scope'

const NO_STORE = { 'Cache-Control': 'no-store' }
const STATUS_VALID = ['AKTIF', 'SELESAI', 'DICABUT']

function param(sp: URLSearchParams, key: string, max = 100) {
  return (sp.get(key) || '').trim().slice(0, max)
}

export async function GET(request: Request) {
  // Wajib login, hanya ADMIN atau KADUS berizin 'bansos'; KADUS hanya melihat dusunnya sendiri
  const scope = await getBansosScope()
  if (!scope.ok) {
    return NextResponse.json({ success: false, error: scope.message }, { status: scope.status, headers: NO_STORE })
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = param(searchParams, 'q')
    const program = param(searchParams, 'program')
    const statusRaw = param(searchParams, 'status', 20).toUpperCase()
    const page = Math.min(100000, Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1))

    const PAGE_SIZE = 5 // sinkron dengan page.tsx
    const skip = (page - 1) * PAGE_SIZE

    const dusunId = scope.dusunFilter.dusunId
    const whereClause: Prisma.BansosWhereInput = dusunId ? { warga: { dusunId } } : {}

    if (program) {
      whereClause.program = { contains: program, mode: 'insensitive' }
    }
    if (STATUS_VALID.includes(statusRaw)) {
      whereClause.status = statusRaw as StatusBansos
    }
    if (q) {
      whereClause.OR = [
        { warga: { nama: { contains: q, mode: 'insensitive' } } },
        { warga: { nik: { contains: q, mode: 'insensitive' } } },
        { program: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [totalFilteredBansos, daftarBansos] = await Promise.all([
      prisma.bansos.count({ where: whereClause }),
      prisma.bansos.findMany({
        where: whereClause,
        include: {
          warga: {
            include: {
              dusun: true,
              kk: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip,
      }),
    ])

    const totalPages = Math.ceil(totalFilteredBansos / PAGE_SIZE)

    return NextResponse.json(
      {
        success: true,
        data: daftarBansos,
        pagination: { currentPage: page, totalPages, totalItems: totalFilteredBansos, pageSize: PAGE_SIZE },
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('API Bansos Error:', error)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server.' }, { status: 500, headers: NO_STORE })
  }
}