import { revalidatePath } from 'next/cache'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import FormDanaDesa from './FormDanaDesa'
import TabelTransparansiClient from './TabelTransparansiClient'
import { getLatestBudgetYear, summarizeBudget } from '@/lib/budget'
import { prisma } from '@/lib/prisma'
import { getScope } from '@/lib/warga-scope'
import { PlusCircle, TrendingUp, Wallet, Coins } from 'lucide-react'

const JENIS_DANA = ['PENDAPATAN', 'BELANJA', 'PEMBIAYAAN']

function bacaTeks(value: FormDataEntryValue | null, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function bacaUang(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const angka = Number.parseFloat(raw)
  if (!Number.isFinite(angka) || angka < 0) return null
  return angka
}

/**
 * Semua aksi tulis pada halaman ini wajib memeriksa ulang izin ke database.
 * Server Action dapat dipanggil langsung tanpa melalui halaman, jadi pengecekan
 * di render halaman saja tidak cukup.
 */
async function pastikanBolehKelolaAnggaran() {
  const scope = await getScope('transparansi', 'data anggaran desa')
  if (!scope.ok) throw new Error(scope.message)
  return scope
}

export default function TransparansiPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tahun?: string;
    jenis?: string;
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
      <TransparansiContent searchParams={searchParams} />
    </Suspense>
  )
}

async function TransparansiContent({
  searchParams,
}: {
  searchParams?: Promise<{
    tahun?: string;
    jenis?: string;
  }>
}) {
  const resolvedParams = await searchParams

  const scope = await getScope('transparansi', 'data anggaran desa')
  if (!scope.ok) {
    redirect(scope.status === 401 ? '/login' : '/dashboard')
  }

  const latestYear = await getLatestBudgetYear()
  const tahunParam = Number.parseInt(resolvedParams?.tahun ?? '', 10)
  const tahunFilter =
    Number.isInteger(tahunParam) && tahunParam >= 2000 && tahunParam <= 2100
      ? tahunParam
      : latestYear
  const jenisFilter = (resolvedParams?.jenis || '').trim().toUpperCase()

  // Server Action untuk Menambah Data Dana Desa
  async function tambahDanaAction(formData: FormData) {
    'use server'
    await pastikanBolehKelolaAnggaran()

    const tahun = Number.parseInt(bacaTeks(formData.get('tahun'), 4), 10)
    const jenis = bacaTeks(formData.get('jenis'), 30).toUpperCase()
    const kategori = bacaTeks(formData.get('kategori'), 100)
    const uraian = bacaTeks(formData.get('uraian'), 255)
    const anggaran = bacaUang(formData.get('anggaran'))
    const realisasi = bacaUang(formData.get('realisasi'))
    const sumber = bacaTeks(formData.get('sumber'), 100)

    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return
    if (!JENIS_DANA.includes(jenis) || !kategori || !uraian) return
    if (anggaran === null || realisasi === null) return

    await prisma.danaDesa.create({
      data: {
        tahun,
        jenis,
        kategori,
        uraian,
        anggaran,
        realisasi,
        sumber: sumber || null,
        createdAt: new Date(),
      },
    })

    revalidatePath('/dashboard/transparansi')
    revalidatePath('/')
  }

  // Server Action untuk Mengubah Data (anggaran, realisasi, dan keterangan)
  async function ubahDanaAction(formData: FormData) {
    'use server'
    await pastikanBolehKelolaAnggaran()

    const id = bacaTeks(formData.get('id'), 100)
    const jenis = bacaTeks(formData.get('jenis'), 30).toUpperCase()
    const kategori = bacaTeks(formData.get('kategori'), 100)
    const uraian = bacaTeks(formData.get('uraian'), 255)
    const sumber = bacaTeks(formData.get('sumber'), 100)
    const anggaran = bacaUang(formData.get('anggaran'))
    const realisasi = bacaUang(formData.get('realisasi'))

    if (!id || !JENIS_DANA.includes(jenis) || !kategori || !uraian) return
    if (anggaran === null || realisasi === null) return

    await prisma.danaDesa.update({
      where: { id },
      data: {
        jenis,
        kategori,
        uraian,
        anggaran,
        realisasi,
        sumber: sumber || null,
      },
    })

    revalidatePath('/dashboard/transparansi')
    revalidatePath('/')
  }

  // Server Action untuk Menghapus Data
  async function hapusDanaAction(formData: FormData) {
    'use server'
    await pastikanBolehKelolaAnggaran()

    const id = bacaTeks(formData.get('id'), 100)
    if (!id) return

    await prisma.danaDesa.delete({ where: { id } })
    revalidatePath('/dashboard/transparansi')
    revalidatePath('/')
  }

  const whereClause: { tahun: number; jenis?: string } = { tahun: tahunFilter }
  if (jenisFilter) {
    whereClause.jenis = jenisFilter
  }

  // Ambil data tabel, jumlah baris, dan seluruh baris tahun aktif secara paralel.
  const [totalFilteredDana, rawInitialData, dataSemua] = await Promise.all([
    prisma.danaDesa.count({ where: whereClause }),
    prisma.danaDesa.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 5,
      skip: 0,
    }),
    prisma.danaDesa.findMany({ where: { tahun: tahunFilter } }),
  ])

  const initialData = rawInitialData.map((item) => ({
    ...item,
    anggaran: Number(item.anggaran),
    realisasi: Number(item.realisasi),
  }))

  // Rekap dihitung oleh fungsi yang sama dengan halaman publik agar tidak
  // pernah ada selisih angka antara dashboard dan website desa.
  const breakdown = summarizeBudget(dataSemua, tahunFilter)

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Transparansi Dana Desa & Anggaran</h1>
          <p className="text-sm text-slate-500">Kelola dan publikasikan laporan realisasi APBDes serta alokasi anggaran desa secara terbuka.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Tampil otomatis di halaman publik
        </span>
      </div>

      {/* KARTU REKAPITULASI KEUANGAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Pendapatan ({tahunFilter})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">Rp {breakdown.totalPendapatanRealisasi.toLocaleString('id-ID')}</div>
          <span className="text-[11px] text-slate-500 font-medium">Target Pagu: Rp {breakdown.totalPendapatanAnggaran.toLocaleString('id-ID')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Belanja & Pembiayaan</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">Rp {breakdown.totalKeluarRealisasi.toLocaleString('id-ID')}</div>
          <span className="text-[11px] text-slate-500 font-medium">Pagu Alokasi: Rp {breakdown.totalKeluarAnggaran.toLocaleString('id-ID')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Sisa Lebih / Saldo Kas (Silpa)</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className={`text-2xl font-bold ${breakdown.silpa >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            Rp {breakdown.silpa.toLocaleString('id-ID')}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Pendapatan dikurangi Realisasi Keluar</span>
        </div>
      </div>

      {/* FORM TAMBAH & TABEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Component Form Client */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-1 sticky top-6">
          <h2 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Tambah Alokasi / Dana Desa</span>
          </h2>
          <FormDanaDesa tambahDanaAction={tambahDanaAction} defaultTahun={tahunFilter} />
        </div>

        {/* Tabel Interaktif AJAX */}
        <TabelTransparansiClient 
          initialData={initialData}
          totalFilteredDana={totalFilteredDana}
          tahunFilter={tahunFilter}
          jenisFilter={jenisFilter}
          hapusDanaAction={hapusDanaAction}
          ubahDanaAction={ubahDanaAction}
        />
      </div>
    </div>
  )
}