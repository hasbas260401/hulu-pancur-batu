import { prisma } from '@/lib/prisma'
import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { getBansosScope } from '@/lib/warga-scope'
import { redirect } from 'next/navigation'
import BansosClient from './BansosClient'

export default function BansosAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    program?: string;
    status?: string;
    q?: string;
    page?: string;
  }>
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
      <BansosContent searchParams={searchParams} />
    </Suspense>
  )
}

async function BansosContent({
  searchParams,
}: {
  searchParams?: Promise<{
    program?: string;
    status?: string;
    q?: string;
    page?: string;
  }>
}) {
  await connection()

  const resolvedParams = await searchParams
  const selectedProgram = resolvedParams?.program || ''
  const selectedStatus = resolvedParams?.status || ''
  const searchQuery = resolvedParams?.q || ''

  const PAGE_SIZE = 5
  const currentPage = Number(resolvedParams?.page) || 1
  const skip = (currentPage - 1) * PAGE_SIZE

  const scope = await getBansosScope()
  if (!scope.ok) {
    redirect(scope.status === 401 ? '/login' : '/dashboard')
  }

  const session = await auth()
  const user = {
    ...(session?.user as any),
    role: scope.role,
    dusunNama: scope.dusunNama,
  }

  const isKadus = scope.role === 'KADUS'
  const dusunFilter = isKadus ? { warga: { dusunId: scope.dusunFilter.dusunId } } : {}

  const [totalPkh, totalBpnt, totalBltDd, totalPbiJk, totalBst, totalKeseluruhan] = await Promise.all([
    prisma.bansos.count({ where: { AND: [dusunFilter, { program: { contains: 'PKH', mode: 'insensitive' } }] } }),
    prisma.bansos.count({ where: { AND: [dusunFilter, { program: { contains: 'BPNT', mode: 'insensitive' } }] } }),
    prisma.bansos.count({ where: { AND: [dusunFilter, { program: { contains: 'BLT-DD', mode: 'insensitive' } }] } }),
    prisma.bansos.count({ where: { AND: [dusunFilter, { program: { contains: 'PBI-JK', mode: 'insensitive' } }] } }),
    prisma.bansos.count({ where: { AND: [dusunFilter, { program: { contains: 'BST', mode: 'insensitive' } }] } }),
    prisma.bansos.count({ where: dusunFilter }),
  ])

  const whereClause: any = { ...dusunFilter }
  if (selectedProgram) whereClause.program = { contains: selectedProgram, mode: 'insensitive' }
  if (selectedStatus) whereClause.status = selectedStatus
  if (searchQuery) {
    whereClause.OR = [
      { warga: { nama: { contains: searchQuery, mode: 'insensitive' } } },
      { warga: { nik: { contains: searchQuery, mode: 'insensitive' } } },
      { program: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  const totalFilteredBansos = await prisma.bansos.count({ where: whereClause })
  const totalPages = Math.ceil(totalFilteredBansos / PAGE_SIZE)

  const daftarBansos = await prisma.bansos.findMany({
    where: whereClause,
    include: {
      warga: {
        include: { dusun: true, kk: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    skip: skip,
  })

  const stats = { totalPkh, totalBpnt, totalBltDd, totalPbiJk, totalBst, totalKeseluruhan }

  async function hapusBansosAction(formData: FormData) {
    'use server'
    // Diperiksa ulang ke database karena aksi dapat dipanggil tanpa lewat halaman.
    const access = await getBansosScope()
    if (!access.ok) throw new Error(access.message)

    const id = String(formData.get('id') ?? '').trim().slice(0, 100)
    if (!id) return

    const target = await prisma.bansos.findFirst({
      where: {
        id,
        ...(access.role === 'KADUS' ? { warga: { dusunId: access.dusunFilter.dusunId } } : {}),
      },
      select: { id: true },
    })
    if (!target) throw new Error('Data bansos tidak ditemukan atau bukan wilayah Anda.')

    await prisma.bansos.delete({ where: { id: target.id } })
    revalidatePath('/dashboard/bansos')
    revalidatePath(`/dashboard/warga`)
  }

  return (
    <BansosClient
      initialData={daftarBansos}
      initialPagination={{
        currentPage,
        totalPages,
        totalItems: totalFilteredBansos,
        pageSize: PAGE_SIZE,
      }}
      stats={stats}
      isKadus={isKadus}
      user={user}
      hapusBansosAction={hapusBansosAction}
    />
  )
}