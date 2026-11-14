'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Home,
  LayoutTemplate,
  Loader2,
  MapPin,
  Save,
  Target,
  User,
  Users,
  Video,
  X,
} from 'lucide-react'
import type { CommunityStats } from '@/lib/community-stats'
import { formatCount, type LandingContent } from '@/lib/landing-content'
import LandingContentEditor from './LandingContentEditor'

type TabId = 'identitas' | 'profil' | 'konten'

const TABS: {
  id: TabId
  label: string
  description: string
  icon: typeof Globe
}[] = [
  {
    id: 'identitas',
    label: 'Identitas Desa',
    description: 'Nama, slogan, dan logo desa.',
    icon: Globe,
  },
  {
    id: 'profil',
    label: 'Profil Kepala Desa',
    description: 'Pimpinan, visi & misi, serta video profil.',
    icon: User,
  },
  {
    id: 'konten',
    label: 'Konten & Statistik',
    description: 'Statistik otomatis dan seluruh konten halaman depan.',
    icon: LayoutTemplate,
  },
]

function StatsSummary({ stats }: { stats: CommunityStats | null }) {
  const items = [
    {
      label: 'Total warga',
      value: stats ? `${formatCount(stats.totalWarga)} jiwa` : '—',
      icon: Users,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Kartu keluarga',
      value: stats ? `${formatCount(stats.totalKK)} KK` : '—',
      icon: Home,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Jumlah dusun',
      value: stats ? formatCount(stats.totalDusun) : '—',
      icon: MapPin,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Laki-laki / Perempuan',
      value: stats
        ? `${formatCount(stats.lakiLaki)} / ${formatCount(stats.perempuan)}`
        : '—',
      icon: Users,
      tone: 'bg-teal-50 text-teal-600',
    },
  ]

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" /> Statistik Kependudukan
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Otomatis dari database
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold text-slate-500">{label}</span>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400">
        Angka di atas dihitung langsung dari tabel warga, kartu keluarga, dan dusun.
        Hanya warga berstatus aktif yang dihitung. Perubahan data warga otomatis
        terlihat di halaman depan tanpa perlu mengisi form ini.
      </p>

      {!stats && (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Statistik belum dapat dimuat dari database. Periksa koneksi database lalu
          muat ulang halaman ini.
        </p>
      )}
    </div>
  )
}

export default function FormSettingWebClient({
  initialData,
  stats,
  updateAction,
}: {
  initialData: any
  stats: CommunityStats | null
  updateAction: (formData: FormData) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabId>('identitas')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [landingContent, setLandingContent] = useState<LandingContent>(
    initialData.landingContent
  )

  // Otomatis hilangkan toast setelah 4 detik
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setToast(null)

    const form = e.currentTarget

    // Validasi manual: karena panel tab yang tidak aktif disembunyikan,
    // validasi bawaan browser tidak bisa fokus ke isian yang kosong.
    const firstInvalid = Array.from(form.elements).find((element) => {
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLTextAreaElement)
      ) {
        return false
      }
      if (
        element instanceof HTMLInputElement &&
        (element.type === 'file' || element.type === 'hidden')
      ) {
        return false
      }
      return element.required && element.value.trim() === ''
    }) as HTMLInputElement | HTMLTextAreaElement | undefined

    if (firstInvalid) {
      const panel = firstInvalid.closest<HTMLElement>('[data-tab-panel]')
      const tab = panel?.dataset.tabPanel as TabId | undefined
      if (tab && tab !== activeTab) setActiveTab(tab)

      setToast({
        type: 'error',
        message: 'Masih ada isian wajib yang kosong. Lengkapi isian yang ditandai lalu simpan kembali.',
      })
      window.setTimeout(() => firstInvalid.focus(), 60)
      return
    }

    const formData = new FormData(form)

    startTransition(async () => {
      try {
        await updateAction(formData)
        setToast({ type: 'success', message: 'Perubahan konten web berhasil disimpan!' })
      } catch (err: any) {
        setToast({ type: 'error', message: err.message || 'Terjadi kesalahan saat menyimpan data.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* NOTIFIKASI POP-UP TOAST (MENGAMBANG DI POJOK KANAN ATAS) */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-bounce duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border text-xs font-bold backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-900/20'
                : 'bg-rose-900/90 text-white border-rose-700 shadow-rose-900/20'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigasi tab */}
      <div
        role="tablist"
        aria-label="Bagian pengaturan konten web"
        className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-start gap-3 rounded-xl px-3.5 py-3 text-left transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold">{tab.label}</span>
                <span
                  className={`mt-0.5 block text-[11px] leading-snug ${
                    isActive ? 'text-emerald-50/80' : 'text-slate-400'
                  }`}
                >
                  {tab.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Panel: Identitas Desa */}
      <div
        role="tabpanel"
        id="panel-identitas"
        aria-labelledby="tab-identitas"
        data-tab-panel="identitas"
        className={activeTab === 'identitas' ? 'space-y-5' : 'hidden'}
      >
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" /> Identitas & Logo Desa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nama Desa</label>
              <input type="text" name="namaDesa" defaultValue={initialData.namaDesa} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Slogan / Sub-Judul</label>
              <input type="text" name="sloganDesa" defaultValue={initialData.sloganDesa} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-600">Upload Logo Desa (Maksimal 2 MB)</label>
            <input type="file" name="logoDesa" accept="image/png, image/jpeg, image/jpg" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
            {initialData.logoDesa && (
              <div className="pt-2 flex items-center gap-3">
                <img src={initialData.logoDesa} alt="Logo Desa" className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1" />
                <span className="text-xs text-slate-500">Logo aktif saat ini</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel: Profil Kepala Desa */}
      <div
        role="tabpanel"
        id="panel-profil"
        aria-labelledby="tab-profil"
        data-tab-panel="profil"
        className={activeTab === 'profil' ? 'space-y-5' : 'hidden'}
      >
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" /> Profil Pimpinan & Foto Kepala Desa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nama Kepala Desa</label>
              <input type="text" name="namaKades" defaultValue={initialData.namaKades} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Periode Jabatan</label>
              <input type="text" name="periodeKades" defaultValue={initialData.periodeKades} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-600">Upload Foto Kepala Desa (Maksimal 2 MB)</label>
            <input type="file" name="fotoKades" accept="image/png, image/jpeg, image/jpg" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
            {initialData.fotoKades && (
              <div className="pt-2">
                <img src={initialData.fotoKades} alt="Foto Kades" className="w-20 h-24 object-cover rounded-xl border border-slate-200 shadow-sm" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" /> Visi & Misi Desa (Otomatis / Dinamis)
          </h2>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Visi Desa</label>
            <textarea name="visiDesa" rows={2} defaultValue={initialData.visiDesa} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Daftar Misi Desa (Tulis setiap poin di baris baru / Enter)</label>
            <textarea
              name="misiDesa"
              rows={5}
              defaultValue={initialData.misiDesa}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-400">Sistem akan otomatis membuat nomor urut (1, 2, 3, dst.) berdasarkan baris teks yang Anda masukkan.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Video className="w-4 h-4 text-rose-600" /> Tautan Video YouTube Profil
          </h2>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">URL Embed YouTube</label>
            <input type="text" name="youtubeUrl" defaultValue={initialData.youtubeUrl} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
          </div>
        </div>
      </div>

      {/* Panel: Konten & Statistik */}
      <div
        role="tabpanel"
        id="panel-konten"
        aria-labelledby="tab-konten"
        data-tab-panel="konten"
        className={activeTab === 'konten' ? 'space-y-5' : 'hidden'}
      >
        <StatsSummary stats={stats} />

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-amber-600" /> Konten Halaman Depan Publik
          </h2>
          <p className="text-xs text-slate-500">
            Semua teks, statistik, kontak, jam operasional, layanan, berita, dan
            informasi anggaran di bawah ini tampil di halaman depan.
          </p>
          <input
            type="hidden"
            name="landingContent"
            value={JSON.stringify(landingContent)}
            readOnly
          />
          <LandingContentEditor
            content={landingContent}
            stats={stats}
            onChange={setLandingContent}
          />
        </div>
      </div>

      {/* Tombol simpan selalu terlihat di bawah layar */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-snug text-slate-500">
          Perubahan baru tampil di halaman depan setelah tombol simpan ditekan.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Perubahan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Konten Web</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
