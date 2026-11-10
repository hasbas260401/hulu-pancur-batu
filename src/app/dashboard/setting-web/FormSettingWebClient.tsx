'use client'

import { useState, useTransition, useEffect } from 'react'
import { Save, Globe, User, Target, Video, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function FormSettingWebClient({
  initialData,
  updateAction,
}: {
  initialData: any
  updateAction: (formData: FormData) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

    const formData = new FormData(e.currentTarget)

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
    <form onSubmit={handleSubmit} className="space-y-6 relative">
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

      {/* Identitas & Logo Desa */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" /> Identitas & Logo Desa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Nama Desa</label>
            <input type="text" name="namaDesa" defaultValue={initialData.namaDesa} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Slogan / Sub-Judul</label>
            <input type="text" name="sloganDesa" defaultValue={initialData.sloganDesa} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-slate-600">Upload Logo Desa (Maksimal 2 MB)</label>
          <input type="file" name="logoDesa" accept="image/png, image/jpeg, image/jpg" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          {initialData.logoDesa && (
            <div className="pt-2 flex items-center gap-3">
              <img src={initialData.logoDesa} alt="Logo Desa" className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1" />
              <span className="text-xs text-slate-500">Logo aktif saat ini</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Judul Utama (Hero Heading)</label>
          <input type="text" name="heroTitle" defaultValue={initialData.heroTitle} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Deskripsi Utama (Hero Description)</label>
          <textarea name="heroDescription" rows={3} defaultValue={initialData.heroDescription} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Profil Kepala Desa & Foto */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" /> Profil Pimpinan & Foto Kepala Desa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Nama Kepala Desa</label>
            <input type="text" name="namaKades" defaultValue={initialData.namaKades} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Periode Jabatan</label>
            <input type="text" name="periodeKades" defaultValue={initialData.periodeKades} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-slate-600">Upload Foto Kepala Desa (Maksimal 2 MB)</label>
          <input type="file" name="fotoKades" accept="image/png, image/jpeg, image/jpg" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          {initialData.fotoKades && (
            <div className="pt-2">
              <img src={initialData.fotoKades} alt="Foto Kades" className="w-20 h-24 object-cover rounded-xl border border-slate-200 shadow-sm" />
            </div>
          )}
        </div>
      </div>

      {/* Visi & Misi Dinamis */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-600" /> Visi & Misi Desa (Otomatis / Dinamis)
        </h2>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Visi Desa</label>
          <textarea name="visiDesa" rows={2} defaultValue={initialData.visiDesa} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Daftar Misi Desa (Tulis setiap poin di baris baru / Enter)</label>
          <textarea 
            name="misiDesa" 
            rows={5} 
            defaultValue={initialData.misiDesa} 
            required 
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
          />
          <p className="text-[11px] text-slate-400">Sistem akan otomatis membuat nomor urut (1, 2, 3, dst.) berdasarkan baris teks yang Anda masukkan.</p>
        </div>
      </div>

      {/* Video & Media */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Video className="w-4 h-4 text-rose-600" /> Tautan Video YouTube Profil
        </h2>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">URL Embed YouTube</label>
          <input type="text" name="youtubeUrl" defaultValue={initialData.youtubeUrl} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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