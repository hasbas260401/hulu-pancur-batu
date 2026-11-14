'use client'

import {
  BarChart3,
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
  Legend,
} from 'recharts'

/**
 * Grafik dashboard dipisah ke berkas sendiri dan dimuat secara dinamis.
 *
 * `recharts` adalah salah satu pustaka terberat di aplikasi. Dengan pemisahan
 * ini, ukurannya hanya diunduh ketika grafik benar-benar tampil (setelah data
 * siap), sehingga halaman dashboard terasa lebih cepat dibuka.
 */

export type DemographicPoint = {
  name: string
  'Laki-Laki': number
  Perempuan: number
  'Kartu Keluarga': number
  'Total Warga': number
}

export type ReligionPoint = {
  name: string
  Islam: number
  Kristen: number
  Katolik: number
  Hindu: number
  Buddha: number
  Konghucu: number
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  color: '#0f172a',
  fontSize: '12px',
  boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.18)',
}

const axisTick = { fill: '#64748b', fontSize: 12 }

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

export default function DashboardCharts({
  demographicData,
  religionData,
}: {
  demographicData: DemographicPoint[]
  religionData: ReligionPoint[]
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {demographicData.length > 0 && (
        <ChartCard
          icon={BarChart3}
          tone="bg-emerald-50 text-emerald-600"
          title="Demografi kependudukan per dusun"
          desc="Perbandingan laki-laki, perempuan, KK, dan total warga."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={demographicData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barCategoryGap="24%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Bar dataKey="Laki-Laki" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Perempuan" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Kartu Keluarga" fill="#0d9488" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Total Warga" fill="#334155" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {religionData.length > 0 && (
        <ChartCard
          icon={BookOpen}
          tone="bg-teal-50 text-teal-600"
          title="Rincian agama per dusun"
          desc="Distribusi pemeluk agama di setiap wilayah dusun."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={religionData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barCategoryGap="24%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Bar dataKey="Islam" fill="#047857" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Kristen" fill="#0d9488" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Katolik" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Hindu" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Buddha" fill="#64748b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Konghucu" fill="#334155" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
