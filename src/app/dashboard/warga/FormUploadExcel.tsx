'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function FormUploadExcel() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const router = useRouter()

  // Efek agar alert otomatis hilang sendiri setelah 5 detik
  useEffect(() => {
    if (resultMessage) {
      const timer = setTimeout(() => {
        setResultMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [resultMessage])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setProgress(10)
    setResultMessage(null)

    // Simulasi progress naik secara visual saat file dikirim & diproses
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 250)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/warga/import', {
        method: 'POST',
        body: formData,
      })

      clearInterval(interval)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah data')
      }

      setProgress(100)
      setResultMessage({
        type: 'success',
        text: `Berhasil! ${data.totalBerhasil} data disimpan dari total ${data.totalBaris} baris. (${data.totalDilewati} data duplikat/dilewati)`,
      })

      // Refresh tampilan data tabel
      router.refresh()
    } catch (err: any) {
      clearInterval(interval)
      setProgress(0)
      setResultMessage({
        type: 'error',
        text: `Error: ${err.message}`,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleUpload} className="flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Upload Data via Excel (.xlsx)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            required
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={uploading || !file}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition whitespace-nowrap cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Indikator Progress Bar */}
      {uploading && (
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Mengunggah & Memproses Data...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Info Pesan Hasil */}
      {resultMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold leading-relaxed animate-in fade-in zoom-in duration-200 flex items-start gap-2 ${
            resultMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {resultMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{resultMessage.text}</span>
        </div>
      )}
    </div>
  )
}