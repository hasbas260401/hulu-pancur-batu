'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Home,
  Mars,
  Venus,
  BarChart3,
  HandHeart,
  MapPin,
  Building2,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts'

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

// Pembungkus grafik: ikon + judul + deskripsi
function ChartCard({
  icon: Icon,
  tone,
  title,
  desc,
  children,
}: {
  icon: LucideIcon
  tone: string
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="mt-6 h-72 w-full">{children}</div>
    </section>
  )
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  color: '#0f172a',
  fontSize: '12px',
  boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.18)',
}

export default function DashboardClient({ stats, daftarDusun, isKadus, user }: { stats: any; daftarDusun: any[]; isKadus: boolean; user: any }) {
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

  // Data Grafik 1: Demografi Kependudukan per Dusun
  const demographicData = daftarDusun.map((dusun: any) => {
    const warga = dusun.warga || []
    const kkIds = new Set(warga.map((w: any) => w.kkId).filter(Boolean))
    return {
      name: dusun.nama,
      'Laki-Laki': warga.filter((w: any) => w.jenisKelamin === 'LAKI_LAKI' || w.jenisKelamin === 'L').length,
      'Perempuan': warga.filter((w: any) => w.jenisKelamin === 'PEREMPUAN' || w.jenisKelamin === 'P').length,
      'Kartu Keluarga': kkIds.size,
      'Total Warga': warga.length
    }
  })

  // Data Grafik 2: Statistik Agama per Dusun
  const religionData = daftarDusun.map((dusun: any) => {
    const warga = dusun.warga || []
    return {
      name: dusun.nama,
      Islam: warga.filter((w: any) => w.agama?.toLowerCase() === 'islam').length,
      Kristen: warga.filter((w: any) => w.agama?.toLowerCase() === 'kristen').length,
      Katolik: warga.filter((w: any) => w.agama?.toLowerCase() === 'katolik').length,
      Hindu: warga.filter((w: any) => w.agama?.toLowerCase() === 'hindu').length,
      Buddha: warga.filter((w: any) => w.agama?.toLowerCase() === 'buddha').length,
      Konghucu: warga.filter((w: any) => w.agama?.toLowerCase() === 'konghucu').length,
    }
  })

  const axisTick = { fill: '#64748b', fontSize: 12 }

  return (
    <div className="space-y-6 pb-10">

      {/* Info Cakupan Administratif */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800 p-6 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            {isKadus ? <MapPin className="h-6 w-6 text-blue-200" /> : <Building2 className="h-6 w-6 text-blue-200" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-slate-300">
              {isKadus ? 'Status Wilayah Tugas' : 'Cakupan Administrasi Desa'}
            </p>
            <p className="mt-0.5 text-lg font-semibold leading-snug">
              {isKadus ? `${user?.dusunNama} (Aktif)` : `${totalDusun} Dusun Terdaftar di Desa Hulu Pancur Batu (I - V)`}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Kartu Statistik Utama */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Users} tone="bg-blue-50 text-blue-600" label="Total warga" value={totalWarga} />
        <StatCard icon={Home} tone="bg-teal-50 text-teal-600" label="Kartu keluarga" value={totalKK} />
        <StatCard icon={Mars} tone="bg-sky-50 text-sky-600" label="Laki-laki" value={totalLakiLaki} />
        <StatCard icon={Venus} tone="bg-rose-50 text-rose-500" label="Perempuan" value={totalPerempuan} />
        <StatCard
          icon={HandHeart}
          tone="bg-amber-50 text-amber-600"
          label="Penerima bansos"
          value={totalBansos}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Grid Grafik */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* GRAFIK 1: Demografi Kependudukan */}
        {!isKadus && demographicData.length > 0 && (
          <ChartCard
            icon={BarChart3}
            tone="bg-blue-50 text-blue-600"
            title="Demografi kependudukan per dusun"
            desc="Perbandingan laki-laki, perempuan, KK, dan total warga."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="Laki-Laki" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Perempuan" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Kartu Keluarga" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Total Warga" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* GRAFIK 2: Statistik Agama */}
        {!isKadus && religionData.length > 0 && (
          <ChartCard
            icon={BookOpen}
            tone="bg-violet-50 text-violet-600"
            title="Rincian agama per dusun"
            desc="Distribusi pemeluk agama di setiap wilayah dusun."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={religionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="Islam" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Kristen" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Katolik" fill="#db2777" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Hindu" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Buddha" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Konghucu" fill="#64748b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

      </div>
    </div>
  )
}