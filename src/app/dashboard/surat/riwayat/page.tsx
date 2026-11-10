import { PrismaClient } from '@prisma/client'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import RiwayatSuratClient from './RiwayatSuratClient'

const prisma = new PrismaClient()

async function clearRiwayatAction() {
  'use server'
  const session = await auth()
  const user = session?.user as any

  if (user?.role !== 'ADMIN') {
    throw new Error('Akses ditolak! Hanya Admin yang dapat menghapus atau mengarsip riwayat surat.')
  }

  await prisma.pengajuanSurat.deleteMany({})
  revalidatePath('/dashboard/surat/riwayat')
}

export default function RiwayatSuratPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; date?: string; page?: string }>
}) {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat data...</span>
          </div>
        </div>
      }
    >
      <RiwayatContent searchParams={searchParams} />
    </Suspense>
  )
}

async function RiwayatContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; date?: string; page?: string }>
}) {
  await connection()
  const resolvedParams = await searchParams

  const query = resolvedParams.q || ''
  const filterType = resolvedParams.filter || 'all'
  const dateQuery = resolvedParams.date || ''

  // Konfigurasi Pagination: 10 data per halaman sesuai permintaan
  const PAGE_SIZE = 10
  const currentPage = Number(resolvedParams.page) || 1
  const skip = (currentPage - 1) * PAGE_SIZE

  const session = await auth()
  const user = session?.user as any

  const isKadus = user?.role === 'KADUS'
  const userDusunId = user?.dusunId

  const dusunCondition = isKadus && userDusunId 
    ? { 
        OR: [
          { dusunId: userDusunId },
          { warga: { dusunId: userDusunId } }
        ] 
      } 
    : {}

  let searchCondition: any = {}

  if (query.trim() !== '') {
    if (filterType === 'nama') {
      searchCondition.warga = {
        ...(isKadus && userDusunId ? { dusunId: userDusunId } : {}),
        nama: { contains: query, mode: 'insensitive' }
      }
    } else if (filterType === 'nomor') {
      searchCondition.nomorSurat = { contains: query, mode: 'insensitive' }
    } else {
      searchCondition.OR = [
        { nomorSurat: { contains: query, mode: 'insensitive' } },
        { warga: { nama: { contains: query, mode: 'insensitive' } } }
      ]
    }
  }

  if (filterType === 'tanggal' && dateQuery) {
    const startDate = new Date(dateQuery)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(dateQuery)
    endDate.setHours(23, 59, 59, 999)

    searchCondition.createdAt = {
      gte: startDate,
      lte: endDate,
    }
  }

  const finalWhere = {
    AND: [
      dusunCondition,
      searchCondition
    ]
  }

  const totalFilteredRiwayat = await prisma.pengajuanSurat.count({ where: finalWhere })
  const totalPages = Math.ceil(totalFilteredRiwayat / PAGE_SIZE)

  const riwayat = await prisma.pengajuanSurat.findMany({
    where: finalWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      warga: true,
      template: true,
    },
    take: PAGE_SIZE,
    skip: skip,
  })

  return (
    <RiwayatSuratClient
      initialRiwayat={riwayat}
      isAdmin={!isKadus}
      isKadus={isKadus}
      dusunNama={user?.dusunNama}
      clearAction={clearRiwayatAction}
      currentPage={currentPage}
      totalPages={totalPages}
      totalFilteredRiwayat={totalFilteredRiwayat}
    />
  )
}