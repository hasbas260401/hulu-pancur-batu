import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSessionUser } from '@/lib/require-admin'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET(request: Request) {
  // Daftar template hanya untuk pengguna yang sudah login
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '3', 10) || 3))

    const [total, data] = await Promise.all([
      prisma.templateSurat.count(),
      prisma.templateSurat.findMany({
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: { id: true, kode: true, nama: true, kodeKlasifikasi: true, filePath: true },
      }),
    ])

    return NextResponse.json({ data, total }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching template API:', error)
    return NextResponse.json({ error: 'Gagal mengambil data template' }, { status: 500 })
  }
}