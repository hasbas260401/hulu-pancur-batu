import { prisma } from '@/lib/prisma'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import SuratPendingBanner from './SuratPendingBanner'
import type { DemographicPoint, ReligionPoint } from './DashboardCharts'
import { Sparkles } from 'lucide-react'

type CountRow = { dusunId: number; _count: { _all: number } }

type ChartRows = [
  { id: number; nama: string }[],
  (CountRow & { jenisKelamin: string })[],
  (CountRow & { agama: string | null })[],
  CountRow[],
]

/**
 * Ubah hasil agregasi database menjadi data grafik siap pakai.
 * Semua perhitungan dilakukan di SQL, lalu hanya angka kecil yang dikirim
 * ke browser — bukan seluruh baris tabel warga.
 */
function buildChartData(rows: ChartRows | null): {
  demographicData: DemographicPoint[]
  religionData: ReligionPoint[]
} {
  if (!rows) return { demographicData: [], religionData: [] }

  const [dusunList, genderGroups, religionGroups, kkGroups] = rows

  type Bucket = {
    name: string
    laki: number
    perempuan: number
    kk: number
    total: number
    agama: Record<string, number>
  }

  const buckets = new Map<number, Bucket>()
  for (const dusun of dusunList) {
    buckets.set(dusun.id, {
      name: dusun.nama,
      laki: 0,
      perempuan: 0,
      kk: 0,
      total: 0,
      agama: {},
    })
  }

  for (const group of genderGroups) {
    const bucket = buckets.get(group.dusunId)
    if (!bucket) continue
    const jumlah = group._count._all
    bucket.total += jumlah
    if (group.jenisKelamin === 'LAKI_LAKI' || group.jenisKelamin === 'L') bucket.laki += jumlah
    else if (group.jenisKelamin === 'PEREMPUAN' || group.jenisKelamin === 'P') bucket.perempuan += jumlah
  }

  for (const group of religionGroups) {
    const bucket = buckets.get(group.dusunId)
    if (!bucket) continue
    const kunci = (group.agama ?? '').trim().toLowerCase()
    if (!kunci) continue
    bucket.agama[kunci] = (bucket.agama[kunci] ?? 0) + group._count._all
  }

  for (const group of kkGroups) {
    const bucket = buckets.get(group.dusunId)
    if (bucket) bucket.kk += group._count._all
  }

  const values = [...buckets.values()]
  return {
    demographicData: values.map((v) => ({
      name: v.name,
      'Laki-Laki': v.laki,
      Perempuan: v.perempuan,
      'Kartu Keluarga': v.kk,
      'Total Warga': v.total,
    })),
    religionData: values.map((v) => ({
      name: v.name,
      Islam: v.agama['islam'] ?? 0,
      Kristen: v.agama['kristen'] ?? 0,
      Katolik: v.agama['katolik'] ?? 0,
      Hindu: v.agama['hindu'] ?? 0,
      Buddha: v.agama['buddha'] ?? 0,
      Konghucu: v.agama['konghucu'] ?? 0,
    })),
  }
}


export default function DashboardPage() {
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
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
  // Wajibkan Next.js merender halaman ini secara dinamis pada setiap request
  await connection()

  const session = await auth()
  
  if (!session || !session.user) {
    redirect('/login')
  }

  // Peran & dusun dibaca dari database (bukan dari token login),
  // agar perubahan penugasan oleh admin langsung berlaku
  const me = await prisma.user.findUnique({
    where: { id: (session.user as any).id as string },
    select: { role: true, dusunId: true, dusun: { select: { nama: true } } },
  })
  if (!me) redirect('/login')

  const user = {
    ...(session.user as any),
    role: me.role,
    dusunId: me.dusunId,
    dusunNama: me.dusun?.nama ?? null,
  }
  const role = me.role as string

  // =========================================================
  // SOLUSI UTAMA: Jika role pengguna adalah WARGA,
  // langsung alihkan (redirect) ke halaman warga-home secara server-side!
  // =========================================================
  if (role === 'WARGA') {
    redirect('/dashboard/warga-home')
  }

  const isKadus = role === 'KADUS'
  const userDusunId = user.dusunId as number | null

  // Hanya ADMIN dan KADUS yang boleh melihat dashboard ini.
  // (sebelumnya peran apa pun selain KADUS otomatis dianggap admin)
  // KADUS tanpa dusun penugasan juga tidak boleh melihat data apa pun
  // (sebelumnya filter kosong berarti SEMUA data penduduk tampil).
  if ((role !== 'ADMIN' && role !== 'KADUS') || (isKadus && !userDusunId)) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Akses belum tersedia</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isKadus
            ? 'Akun Kadus Anda belum ditetapkan ke sebuah dusun. Silakan hubungi Administrator.'
            : 'Akun Anda tidak memiliki akses ke halaman ini. Silakan hubungi Administrator.'}
        </p>
      </div>
    )
  }

  // Filter wilayah
  const filterDusunWarga = isKadus && userDusunId ? { dusunId: userDusunId } : {}
  const filterDusunKK = isKadus && userDusunId ? { anggota: { some: { dusunId: userDusunId } } } : {}
  const filterDusunBansos = isKadus && userDusunId ? { warga: { dusunId: userDusunId } } : {}

  // PROMISE.ALL YANG DIOPTIMALKAN (PARALEL)
  const [
    totalWarga, 
    totalKK, 
    totalSurat, 
    totalDusun,
    totalLakiLaki,
    totalPerempuan,
    agamaIslam,
    agamaKristen,
    agamaKatolik,
    agamaHindu,
    agamaBuddha,
    agamaKonghucu,
    totalBansos,
    chartRows
  ] = await Promise.all([
    prisma.warga.count({ where: filterDusunWarga }),
    prisma.kartuKeluarga.count({ where: filterDusunKK }),
    prisma.pengajuanSurat ? prisma.pengajuanSurat.count() : Promise.resolve(0),
    prisma.dusun.count(),
    prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'LAKI_LAKI' as any } }).catch(() => 
      prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'L' as any } })
    ),
    prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'PEREMPUAN' as any } }).catch(() => 
      prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'P' as any } })
    ),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Islam', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Kristen', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Katolik', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Hindu', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Buddha', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Konghucu', mode: 'insensitive' } } }),
    prisma.bansos ? prisma.bansos.count({
      where: { status: 'AKTIF', ...filterDusunBansos }
    }) : Promise.resolve(0),

    // Data grafik dihitung di database (bukan dengan mengirim seluruh baris warga
    // ke browser). Ini menjaga ukuran muatan halaman tetap kecil meskipun jumlah
    // warga terus bertambah.
    role === 'ADMIN'
      ? Promise.all([
          prisma.dusun.findMany({
            select: { id: true, nama: true },
            orderBy: { nama: 'asc' },
          }),
          prisma.warga.groupBy({
            by: ['dusunId', 'jenisKelamin'],
            _count: { _all: true },
          }),
          prisma.warga.groupBy({
            by: ['dusunId', 'agama'],
            _count: { _all: true },
          }),
          prisma.kartuKeluarga.groupBy({
            by: ['dusunId'],
            _count: { _all: true },
          }),
        ])
      : Promise.resolve(null)
  ])

  const { demographicData, religionData } = buildChartData(chartRows)

  // Permohonan surat warga yang belum diproses (Pending). KADUS hanya melihat
  // dusun penugasannya, ADMIN melihat seluruh desa.
  const suratMasukPending = await prisma.pengajuanSurat.count({
    where: {
      status: 'DIAJUKAN',
      ...(isKadus && userDusunId ? { dusunId: userDusunId } : {}),
    },
  })

  const stats = {
    totalWarga,
    totalKK,
    totalSurat,
    totalDusun,
    totalLakiLaki,
    totalPerempuan,
    agamaIslam,
    agamaKristen,
    agamaKatolik,
    agamaHindu,
    agamaBuddha,
    agamaKonghucu,
    totalBansos
  }

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isKadus ? `Wilayah Kerja: ${user?.dusunNama || 'Dusun Anda'}` : 'Panel Kontrol Utama Desa'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Dashboard Utama</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isKadus
              ? `Ringkasan data kependudukan dan statistik spesifik wilayah penugasan.`
              : 'Ringkasan data kependudukan menyeluruh dari Dusun I sampai Dusun V.'}
          </p>
        </div>
      </div>

      {/* Notifikasi surat masuk (diperbarui otomatis lewat polling) */}
      <SuratPendingBanner initialCount={suratMasukPending} />

      {/* Render Komponen Interaktif (Grafik & Animasi Hitung) */}
      <DashboardClient 
        stats={stats} 
        demographicData={demographicData}
        religionData={religionData}
        isKadus={isKadus} 
        user={user} 
      />
    </div>
  )
}