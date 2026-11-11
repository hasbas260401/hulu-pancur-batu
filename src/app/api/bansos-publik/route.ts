import { NextResponse } from 'next/server'
import { PrismaClient, type Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const NO_STORE = { 'Cache-Control': 'no-store' }
const PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

/** Sembunyikan sebagian NIK agar data pribadi tidak tampil utuh di halaman publik. */
function maskNik(nik: string) {
  const value = (nik || '').trim()
  if (!value) return '-'
  if (value.length <= 4) return '*'.repeat(value.length)
  if (value.length <= 8) return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`
}

/**
 * API publik daftar penerima bantuan sosial.
 *
 * Hanya mengembalikan data yang aman ditampilkan ke publik (nama, dusun,
 * program, periode, nominal, status) dengan NIK disamarkan. Pencarian
 * berdasarkan NIK tetap dilakukan di server terhadap NIK asli.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const q = (searchParams.get('q') || '').trim().slice(0, 60)
    const program = (searchParams.get('program') || '').trim().slice(0, 40)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE), 10) || PAGE_SIZE)
    )
    const skip = (page - 1) * pageSize

    const where: Prisma.BansosWhereInput = {}

    if (program) {
      where.program = { equals: program, mode: 'insensitive' }
    }

    if (q) {
      where.OR = [
        { warga: { nik: { contains: q } } },
        { warga: { nama: { contains: q, mode: 'insensitive' } } },
        { program: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, rows, programRows] = await Promise.all([
      prisma.bansos.count({ where }),
      prisma.bansos.findMany({
        where,
        include: {
          warga: {
            select: {
              nama: true,
              nik: true,
              dusun: { select: { nama: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: pageSize,
        skip,
      }),
      prisma.bansos.findMany({
        distinct: ['program'],
        select: { program: true },
        orderBy: { program: 'asc' },
      }),
    ])

    const data = rows.map((item) => ({
      id: item.id,
      nama: item.warga?.nama || 'Warga',
      nik: maskNik(item.warga?.nik || ''),
      dusun: item.warga?.dusun?.nama || '-',
      program: item.program,
      periode: item.periode,
      nominal: item.nominal === null ? null : Number(item.nominal),
      status: item.status,
    }))

    return NextResponse.json(
      {
        success: true,
        data,
        programs: programRows.map((row) => row.program),
        pagination: {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          totalItems: total,
          pageSize,
        },
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('API Bansos Publik Error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server.' },
      { status: 500, headers: NO_STORE }
    )
  }
}
