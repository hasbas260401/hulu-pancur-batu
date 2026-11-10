import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { Suspense } from 'react'
import FormDanaDesa from './FormDanaDesa'
import TabelTransparansiClient from './TabelTransparansiClient'
import { PlusCircle, TrendingUp, Wallet, Coins } from 'lucide-react'

const prisma = new PrismaClient()

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
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
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
  const tahunFilter = resolvedParams?.tahun ? parseInt(resolvedParams.tahun) : 2026
  const jenisFilter = resolvedParams?.jenis || ''

  // Server Action untuk Menambah Data Dana Desa
  async function tambahDanaAction(formData: FormData) {
    'use server'
    const tahun = formData.get('tahun') as string
    const jenis = formData.get('jenis') as string
    const kategori = formData.get('kategori') as string
    const uraian = formData.get('uraian') as string
    const anggaranRaw = formData.get('anggaran') as string
    const realisasiRaw = formData.get('realisasi') as string
    const sumber = formData.get('sumber') as string

    if (!tahun || !jenis || !kategori || !uraian || !anggaranRaw) return

    await prisma.danaDesa.create({
      data: {
        tahun: parseInt(tahun),
        jenis: jenis.toUpperCase(),
        kategori,
        uraian,
        anggaran: parseFloat(anggaranRaw),
        realisasi: realisasiRaw ? parseFloat(realisasiRaw) : 0,
        sumber: sumber || null,
        createdAt: new Date(),
      },
    })

    revalidatePath('/dashboard/transparansi')
  }

  // Server Action untuk Menghapus Data
  async function hapusDanaAction(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (id) {
      await prisma.danaDesa.delete({ where: { id } })
      revalidatePath('/dashboard/transparansi')
    }
  }

  const whereClause: any = { tahun: tahunFilter }
  if (jenisFilter) {
    whereClause.jenis = jenisFilter
  }

  // Ambil total data untuk filter aktif
  const totalFilteredDana = await prisma.danaDesa.count({ where: whereClause })

  // Ambil data halaman pertama (5 item awal) untuk inisialisasi awal di client
  const rawInitialData = await prisma.danaDesa.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 5,
    skip: 0,
  })
  const initialData = rawInitialData.map((item) => ({
    ...item,
    anggaran: Number(item.anggaran),
    realisasi: Number(item.realisasi),
  }))

  // Hitung Rekapitulasi Keuangan Desa Secara Utuh
  const dataSemua = await prisma.danaDesa.findMany({ where: { tahun: tahunFilter } })
  
  const listPendapatan = dataSemua.filter((i) => i.jenis === 'PENDAPATAN')
  const totalPendapatanAnggaran = listPendapatan.reduce((acc, curr) => acc + Number(curr.anggaran), 0)
  const totalPendapatanRealisasi = listPendapatan.reduce((acc, curr) => acc + Number(curr.realisasi), 0)

  const listKeluar = dataSemua.filter((i) => i.jenis !== 'PENDAPATAN')
  const totalKeluarAnggaran = listKeluar.reduce((acc, curr) => acc + Number(curr.anggaran), 0)
  const totalKeluarRealisasi = listKeluar.reduce((acc, curr) => acc + Number(curr.realisasi), 0)

  const silpa = totalPendapatanRealisasi - totalKeluarRealisasi

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transparansi Dana Desa & Anggaran</h1>
          <p className="text-sm text-slate-500">Kelola dan publikasikan laporan realisasi APBDes serta alokasi anggaran desa secara terbuka.</p>
        </div>
      </div>

      {/* KARTU REKAPITULASI KEUANGAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Pendapatan ({tahunFilter})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">Rp {totalPendapatanRealisasi.toLocaleString('id-ID')}</div>
          <span className="text-[11px] text-slate-500 font-medium">Target Pagu: Rp {totalPendapatanAnggaran.toLocaleString('id-ID')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Belanja & Pembiayaan</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">Rp {totalKeluarRealisasi.toLocaleString('id-ID')}</div>
          <span className="text-[11px] text-slate-500 font-medium">Pagu Alokasi: Rp {totalKeluarAnggaran.toLocaleString('id-ID')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Sisa Lebih / Saldo Kas (Silpa)</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className={`text-2xl font-bold ${silpa >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            Rp {silpa.toLocaleString('id-ID')}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Pendapatan dikurangi Realisasi Keluar</span>
        </div>
      </div>

      {/* FORM TAMBAH & TABEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Component Form Client */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-1 sticky top-6">
          <h2 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Tambah Alokasi / Dana Desa</span>
          </h2>
          <FormDanaDesa tambahDanaAction={tambahDanaAction} />
        </div>

        {/* Tabel Interaktif AJAX */}
        <TabelTransparansiClient 
          initialData={initialData}
          totalFilteredDana={totalFilteredDana}
          tahunFilter={tahunFilter}
          jenisFilter={jenisFilter}
          hapusDanaAction={hapusDanaAction}
        />
      </div>
    </div>
  )
}