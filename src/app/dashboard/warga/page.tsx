import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { getWargaScope } from '@/lib/warga-scope'
import TabelWargaClient from './TabelWargaClient'
import FormUploadExcel from './FormUploadExcel'
import FilterWargaBar from './FilterWargaBar'
import { 
  Download, 
  UserPlus, 
  CheckCircle2, 
  UserX, 
  ArrowRightLeft
} from 'lucide-react'

type StatusWarga = 'AKTIF' | 'MENINGGAL' | 'PINDAH'

export default function DataWargaPage({
  searchParams,
}: {
  searchParams?: Promise<{ 
    query?: string; 
    status?: string;
    mode?: string;
    agama?: string;
    pekerjaan?: string;
    bantuan?: string;
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
      <WargaContent searchParams={searchParams} />
    </Suspense>
  )
}

async function WargaContent({
  searchParams,
}: {
  searchParams?: Promise<{ 
    query?: string; 
    status?: string;
    mode?: string;
    agama?: string;
    pekerjaan?: string;
    bantuan?: string;
  }>
}) {
  await connection()

  // Wajib login, wajib berperan ADMIN/KADUS, dan KADUS hanya melihat dusunnya sendiri.
  // (sebelumnya: tanpa sesi, filter kosong = SEMUA data penduduk tampil)
  const scope = await getWargaScope()
  if (!scope.ok) {
    if (scope.status === 401) redirect('/login')
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Akses ditolak</h1>
        <p className="mt-1 text-sm text-slate-500">{scope.message}</p>
      </div>
    )
  }

  const isKadus = scope.role === 'KADUS'
  const user = { dusunNama: scope.dusunNama }
  const baseDusunFilter = scope.dusunFilter

  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams?.query || ''
  const mode = resolvedSearchParams?.mode || 'semua'
  const agama = resolvedSearchParams?.agama || ''
  const pekerjaan = resolvedSearchParams?.pekerjaan || ''
  const bantuan = resolvedSearchParams?.bantuan || '' 
  const statusRaw = resolvedSearchParams?.status ?? ''
  const statusTab: StatusWarga = ['AKTIF', 'MENINGGAL', 'PINDAH'].includes(statusRaw)
    ? (statusRaw as StatusWarga)
    : 'AKTIF'

  const PAGE_SIZE = 15

  const [totalAktif, totalMeninggal, totalPindah] = await Promise.all([
    prisma.warga.count({ where: { statusWarga: 'AKTIF', ...baseDusunFilter } }),
    prisma.warga.count({ where: { statusWarga: 'MENINGGAL', ...baseDusunFilter } }),
    prisma.warga.count({ where: { statusWarga: 'PINDAH', ...baseDusunFilter } }),
  ])

  let textSearchCondition = undefined
  if (query) {
    if (mode === 'nik') {
      textSearchCondition = { nik: { contains: query, mode: 'insensitive' as const } }
    } else if (mode === 'kk') {
      textSearchCondition = { kk: { noKk: { contains: query, mode: 'insensitive' as const } } }
    } else if (mode === 'nama') {
      textSearchCondition = { nama: { contains: query, mode: 'insensitive' as const } }
    } else {
      textSearchCondition = {
        OR: [
          { nama: { contains: query, mode: 'insensitive' as const } },
          { nik: { contains: query, mode: 'insensitive' as const } },
          { kk: { noKk: { contains: query, mode: 'insensitive' as const } } },
        ],
      }
    }
  }

  let bansosCondition = undefined
  if (bantuan) {
    bansosCondition = {
      some: {
        program: { contains: bantuan, mode: 'insensitive' as const },
        status: 'AKTIF' as const,
      },
    }
  }

  const whereCondition = {
    statusWarga: statusTab,
    ...baseDusunFilter,
    ...textSearchCondition,
    agama: agama ? { equals: agama, mode: 'insensitive' as const } : undefined,
    pekerjaan: pekerjaan ? { contains: pekerjaan, mode: 'insensitive' as const } : undefined,
    ...(bansosCondition ? { bansos: bansosCondition } : {}),
  }

  const totalFilteredWarga = await prisma.warga.count({ where: whereCondition })

  const daftarWarga = await prisma.warga.findMany({
    where: whereCondition,
    include: {
      dusun: true,
      kk: {
        include: { dusun: true },
      },
      bansos: true,
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    skip: 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Data Kependudukan Warga</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isKadus
              ? `Menampilkan data warga khusus wilayah penugasan ${user?.dusunNama || 'Dusun Anda'}.`
              : 'Kelola data seluruh warga Desa Hulu Pancur Batu secara terstruktur.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="/api/warga/template"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" /> Download Template Excel
          </a>

          <Link
            href="/dashboard/warga/tambah"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" /> Tambah Warga Baru
          </Link>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <FormUploadExcel />
      </div>

      <div>
        <FilterWargaBar />
      </div>

      <div className="w-full overflow-x-auto scrollbar-none border-b border-slate-200">
        <div className="flex space-x-2 min-w-max">
          <Link
            href={`/dashboard/warga?status=AKTIF`}
            className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              statusTab === 'AKTIF'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Warga Aktif
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700">{totalAktif}</span>
          </Link>

          <Link
            href={`/dashboard/warga?status=MENINGGAL`}
            className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              statusTab === 'MENINGGAL'
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserX className="w-4 h-4 text-slate-600" /> Warga Meninggal
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700">{totalMeninggal}</span>
          </Link>

          <Link
            href={`/dashboard/warga?status=PINDAH`}
            className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              statusTab === 'PINDAH'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Warga Pindah
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700">{totalPindah}</span>
          </Link>
        </div>
      </div>

      <TabelWargaClient 
        initialData={daftarWarga}
        totalInitialFiltered={totalFilteredWarga}
      />
    </div>
  )
}