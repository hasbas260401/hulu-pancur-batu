import { prisma } from '@/lib/prisma'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getScope } from '@/lib/warga-scope'
import { requireAdmin } from '@/lib/require-admin'
import RiwayatSuratClient from './RiwayatSuratClient'
import { ubahStatusSuratAction } from './actions'

async function clearRiwayatAction() {
  'use server'
  // Peran dibaca dari database, bukan dari token.
  const admin = await requireAdmin()
  if (!admin.ok) {
    throw new Error('Akses ditolak! Hanya Admin yang dapat menghapus atau mengarsip riwayat surat.')
  }

  await prisma.pengajuanSurat.deleteMany({})
  revalidatePath('/dashboard/surat/riwayat')
}

export default function RiwayatSuratPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; date?: string; status?: string; page?: string }>
}) {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
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
  searchParams: Promise<{ q?: string; filter?: string; date?: string; status?: string; page?: string }>
}) {
  await connection()
  const resolvedParams = await searchParams

  const query = resolvedParams.q || ''
  const filterType = resolvedParams.filter || 'all'
  const dateQuery = resolvedParams.date || ''

  const STATUS_TABS = ['SEMUA', 'DIAJUKAN', 'DIVERIFIKASI', 'SELESAI', 'DITOLAK'] as const
  const rawStatus = (resolvedParams.status || 'SEMUA').toUpperCase()
  const statusFilter = (STATUS_TABS as readonly string[]).includes(rawStatus) ? rawStatus : 'SEMUA'

  // Konfigurasi Pagination: 10 data per halaman sesuai permintaan
  const PAGE_SIZE = 10
  const currentPage = Number(resolvedParams.page) || 1
  const skip = (currentPage - 1) * PAGE_SIZE

  const scope = await getScope('surat', 'riwayat surat')
  if (!scope.ok) {
    redirect(scope.status === 401 ? '/login' : '/dashboard')
  }

  const isKadus = scope.role === 'KADUS'

  const dusunCondition = isKadus ? { dusunId: scope.dusunFilter.dusunId } : {}

  // Jumlah per status (mengikuti scoping dusun, tanpa filter pencarian) untuk
  // tab ringkasan surat masuk.
  const [countDiajukan, countDiverifikasi, countSelesai, countDitolak] = await Promise.all([
    prisma.pengajuanSurat.count({ where: { ...dusunCondition, status: 'DIAJUKAN' } }),
    prisma.pengajuanSurat.count({ where: { ...dusunCondition, status: 'DIVERIFIKASI' } }),
    prisma.pengajuanSurat.count({ where: { ...dusunCondition, status: 'SELESAI' } }),
    prisma.pengajuanSurat.count({ where: { ...dusunCondition, status: 'DITOLAK' } }),
  ])
  const statusCounts = {
    SEMUA: countDiajukan + countDiverifikasi + countSelesai + countDitolak,
    DIAJUKAN: countDiajukan,
    DIVERIFIKASI: countDiverifikasi,
    SELESAI: countSelesai,
    DITOLAK: countDitolak,
  }

  const statusCondition = statusFilter === 'SEMUA' ? {} : { status: statusFilter }

  let searchCondition: any = {}

  if (query.trim() !== '') {
    if (filterType === 'nama') {
      searchCondition.warga = {
        ...(isKadus ? { dusunId: scope.dusunFilter.dusunId } : {}),
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
      searchCondition,
      statusCondition,
    ]
  }

  const totalFilteredRiwayat = await prisma.pengajuanSurat.count({ where: finalWhere })
  const totalPages = Math.ceil(totalFilteredRiwayat / PAGE_SIZE)

  const riwayat = await prisma.pengajuanSurat.findMany({
    where: finalWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
      isAdmin={scope.role === 'ADMIN'}
      isKadus={isKadus}
      dusunNama={scope.dusunNama ?? undefined}
      clearAction={clearRiwayatAction}
      statusAction={ubahStatusSuratAction}
      currentStatus={statusFilter}
      statusCounts={statusCounts}
      currentPage={currentPage}
      totalPages={totalPages}
      totalFilteredRiwayat={totalFilteredRiwayat}
    />
  )
}