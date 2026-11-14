'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { DemographicPoint, ReligionPoint } from './DashboardCharts'
import {
  Users,
  Home,
  Mars,
  Venus,
  HandHeart,
  MapPin,
  Landmark,
  type LucideIcon,
} from 'lucide-react'

// Grafik (recharts) dimuat terpisah: pustaka ini berat, jadi baru diunduh
// setelah komponen ini tampil di browser.
const DashboardCharts = dynamic(() => import('./DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-6 h-72 w-full animate-pulse rounded-xl bg-slate-50" />
        </div>
      ))}
    </div>
  ),
})

// Komponen Animasi Hitung Angka (Count-Up)
function AnimatedCounter({ end, duration = 1000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeProgress = progress * (2 - progress)
      setCount(Math.floor(easeProgress * end))

      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return <span>{count.toLocaleString()}</span>
}

// Kartu statistik: label + ikon di atas, angka besar di bawah
function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  className = '',
}: {
  icon: LucideIcon
  tone: string
  label: string
  value: number
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        <AnimatedCounter end={value} />
      </div>
    </div>
  )
}

// Pembungkus grafik dipindah ke DashboardCharts agar recharts tidak ikut
// bundel awal dashboard.

export default function DashboardClient({
  stats,
  demographicData,
  religionData,
  isKadus,
  user,
}: {
  stats: any
  demographicData: DemographicPoint[]
  religionData: ReligionPoint[]
  isKadus: boolean
  user: any
}) {
  const {
    totalWarga,
    totalKK,
    totalLakiLaki,
    totalPerempuan,
    totalBansos,
    totalDusun,
    agamaIslam,
    agamaKristen,
    agamaKatolik,
    agamaHindu,
    agamaBuddha,
    agamaKonghucu
  } = stats

  return (
    <div className="space-y-6 pb-10">

      {/* Info Cakupan Administratif */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-6 text-white shadow-lg shadow-emerald-950/20 sm:p-7">
        {/* Aksen dekoratif lembut agar kartu tidak terasa polos */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-teal-300/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-100 ring-1 ring-white/15 backdrop-blur">
              {isKadus ? <MapPin className="h-7 w-7" /> : <Landmark className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/70">
                {isKadus ? 'Status Wilayah Tugas' : 'Cakupan Administrasi Desa'}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-snug sm:text-xl">
                {isKadus
                  ? user?.dusunNama || 'Dusun Anda'
                  : 'Desa Hulu Pancur Batu'}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-emerald-100/70">
                {isKadus
                  ? 'Anda bertugas mengelola data kependudukan dan layanan administrasi pada wilayah ini.'
                  : `${totalDusun} dusun terdaftar (Dusun I–V) dengan pelayanan administrasi terpadu.`}
              </p>
              {isKadus && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Wilayah Aktif
                </span>
              )}
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/60">
                {isKadus ? 'Wilayah' : 'Dusun'}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {isKadus ? 1 : totalDusun}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/60">
                Warga
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {Number(totalWarga).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/60">
                KK
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {Number(totalKK).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Kartu Statistik Utama */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Users} tone="bg-emerald-50 text-emerald-600" label="Total warga" value={totalWarga} />
        <StatCard icon={Home} tone="bg-teal-50 text-teal-600" label="Kartu keluarga" value={totalKK} />
        <StatCard icon={Mars} tone="bg-emerald-50 text-emerald-600" label="Laki-laki" value={totalLakiLaki} />
        <StatCard icon={Venus} tone="bg-rose-50 text-rose-500" label="Perempuan" value={totalPerempuan} />
        <StatCard
          icon={HandHeart}
          tone="bg-amber-50 text-amber-600"
          label="Penerima bansos"
          value={totalBansos}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Grid Grafik (dimuat terpisah agar bundel awal dashboard ringan) */}
      {!isKadus && (demographicData.length > 0 || religionData.length > 0) && (
        <DashboardCharts
          demographicData={demographicData}
          religionData={religionData}
        />
      )}
    </div>
  )
}