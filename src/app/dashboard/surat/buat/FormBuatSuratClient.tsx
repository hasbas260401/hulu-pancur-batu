'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Search, 
  X, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  Loader2,
  FileText,
  User,
  Hash,
  MessageSquareText
} from 'lucide-react'

interface WargaItem {
  id: string
  nik: string
  nama: string
  dusun: { nama: string } | null
}

interface TemplateItem {
  id: string
  kode: string
  nama: string
}

export default function FormBuatSuratClient({
  daftarTemplate,
  existingNomorSurat,
  suggestedNomorSurat,
  cariWargaAction,
  generateAction,
}: {
  daftarTemplate: TemplateItem[]
  existingNomorSurat: string[]
  suggestedNomorSurat: string
  cariWargaAction: (keyword: string) => Promise<WargaItem[]>
  generateAction: (formData: FormData) => Promise<void>
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WargaItem[]>([])
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [selectedWarga, setSelectedWarga] = useState<WargaItem | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [nomorSurat, setNomorSurat] = useState(suggestedNomorSurat)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sinkronisasi nomor surat otomatis dari server
  useEffect(() => {
    setNomorSurat(suggestedNomorSurat)
  }, [suggestedNomorSurat])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsLoadingSearch(true)
        try {
          const results = await cariWargaAction(searchQuery)
          setSearchResults(results)
        } catch (err) {
          console.error('Gagal mencari warga:', err)
        } finally {
          setIsLoadingSearch(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, cariWargaAction])

  const isNomorSuratExists =
    nomorSurat.trim() !== '' &&
    existingNomorSurat.some((no) => no.toLowerCase() === nomorSurat.trim().toLowerCase())

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(formRef.current!)
        try {
          await generateAction(formData)
          
          // Reset form secara total setelah berhasil
          formRef.current?.reset()
          setSelectedWarga(null)
          setSearchQuery('')
          setSearchResults([])
        } catch (error) {
          setIsSubmitting(false)
          throw error
        }
      }}
      className="space-y-6 text-xs relative"
    >
      {/* Loading Overlay Full Form dengan Indikator Proses Melingkar */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center z-50 rounded-2xl transition-all gap-4 shadow-md">
          <div className="w-14 h-14 rounded-full bg-blue-50 border-4 border-blue-600 border-t-transparent animate-spin flex items-center justify-center shadow-lg"></div>
          <div className="text-sm font-bold text-slate-800 tracking-wide animate-pulse">
            Sedang Memproses & Menggenerate Dokumen Surat...
          </div>
          <p className="text-xs text-slate-500 font-medium">Mohon tunggu sebentar, sistem sedang merangkai data dokumen.</p>
        </div>
      )}

      {/* 1. Pilih Template Surat */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>1. Pilih Jenis Surat / Template *</span>
        </label>
        <select
          name="templateId"
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none bg-slate-50 font-medium text-slate-800 disabled:opacity-50 cursor-pointer transition"
        >
          <option value="">-- Pilih Template Surat --</option>
          {daftarTemplate.map((t) => (
            <option key={t.id} value={t.id}>
              [{t.kode}] {t.nama}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Pilih Data Warga */}
      <div className="space-y-1.5 relative" ref={dropdownRef}>
        <label className="font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <User className="w-4 h-4 text-blue-600" />
          <span>2. Pilih Data Warga *</span>
        </label>
        
        <input type="hidden" name="wargaId" value={selectedWarga ? selectedWarga.id : ''} required />

        <div
          onClick={() => !isSubmitting && setIsOpen(true)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-50 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition"
        >
          <div className="flex items-center gap-2.5 w-full">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Ketik minimal 2 huruf Nama atau NIK Warga..."
              disabled={isSubmitting}
              value={isOpen ? searchQuery : (selectedWarga ? `${selectedWarga.nik} — ${selectedWarga.nama} (${selectedWarga.dusun?.nama || 'Dusun -'})` : '')}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsOpen(true)
                if (selectedWarga) setSelectedWarga(null)
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full outline-none bg-transparent cursor-pointer disabled:opacity-50 font-medium text-slate-800"
            />
          </div>
          {isLoadingSearch && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0 ml-2" />}
          {selectedWarga && !isSubmitting && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedWarga(null)
                setSearchQuery('')
                setSearchResults([])
              }}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg bg-slate-200/60 cursor-pointer ml-2 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isOpen && !isSubmitting && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {searchQuery.trim().length < 2 ? (
              <div className="p-4 text-xs text-slate-400 text-center font-medium">Ketik minimal 2 karakter untuk mencari warga...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center font-medium">
                {isLoadingSearch ? 'Mencari data...' : 'Warga tidak ditemukan'}
              </div>
            ) : (
              searchResults.map((w) => (
                <div
                  key={w.id}
                  onClick={() => {
                    setSelectedWarga(w)
                    setSearchQuery('')
                    setIsOpen(false)
                  }}
                  className="px-4 py-3 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{w.nama}</span>
                    <span className="text-slate-500 ml-2 font-mono">NIK: {w.nik}</span>
                  </div>
                  <span className="text-slate-600 font-semibold text-[11px] bg-slate-100 px-2.5 py-1 rounded-md">
                    {w.dusun?.nama || 'Dusun -'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 3. Nomor Surat */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-blue-600" />
          <span>3. Nomor Surat (Opsional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            name="nomorSurat"
            value={nomorSurat}
            disabled={isSubmitting}
            onChange={(e) => setNomorSurat(e.target.value)}
            placeholder="Contoh: 470/123/PB/2026"
            className={`w-full px-4 py-3 pr-10 border rounded-xl text-xs sm:text-sm focus:ring-2 outline-none disabled:opacity-50 transition bg-slate-50 font-mono font-medium ${
              isNomorSuratExists
                ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                : nomorSurat.trim() !== ''
                ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/10'
                : 'border-slate-200 focus:ring-blue-500'
            }`}
          />

          {nomorSurat.trim() !== '' && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
              {isNomorSuratExists ? (
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  <X className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          )}
        </div>

        {isNomorSuratExists ? (
          <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> No Surat sudah pernah dibuat
          </p>
        ) : nomorSurat.trim() !== '' ? (
          <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Nomor surat ini tersedia untuk digunakan
          </p>
        ) : null}
      </div>

      {/* 4. Keperluan */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <MessageSquareText className="w-4 h-4 text-blue-600" />
          <span>4. Keperluan / Keterangan Tambahan</span>
        </label>
        <textarea
          name="keperluan"
          rows={3}
          disabled={isSubmitting}
          placeholder="Contoh: Persyaratan Mengurus Kartu Indonesia Sehat (KIS)"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none bg-slate-50 font-medium text-slate-800 disabled:opacity-50 transition resize-none"
        />
      </div>

      <div className="pt-4 flex justify-end border-t border-slate-100">
        <button
          type="submit"
          disabled={isNomorSuratExists || isSubmitting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sedang Memproses Dokumen...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Generate Dokumen Surat</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}