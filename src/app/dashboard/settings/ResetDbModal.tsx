'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ShieldAlert, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react'
import { useAlert } from '@/components/ui/alert'

const KONFIRMASI_TEKS = 'HAPUS SEMUA DATA'

type Langkah = 'tertutup' | 'peringatan' | 'form'

/**
 * Tombol & modal "Kosongkan Database Warga".
 *
 * Sengaja memakai konfirmasi dua lapis:
 *   1. Peringatan risiko + tombol "Saya mengerti".
 *   2. Formulir kata sandi admin + kalimat konfirmasi yang harus diketik persis.
 * Tombol ini hanya dirender untuk ADMIN dan hanya muncul di Pengaturan Akun.
 */
export default function ResetDbModal() {
  const [langkah, setLangkah] = useState<Langkah>('tertutup')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const alert = useAlert()

  function tutup() {
    if (loading) return
    setLangkah('tertutup')
    setPassword('')
    setKonfirmasi('')
    setErrorMsg('')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, konfirmasi }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mereset database')
      }

      await alert.success('Berhasil', data.message)
      tutup()
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLangkah('peringatan')}
        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
      >
        <AlertTriangle className="h-4 w-4 text-rose-600" />
        <span>Kosongkan Database Warga</span>
      </button>

      {langkah === 'peringatan' && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Pertama</h3>
                <p className="mt-0.5 text-xs font-semibold text-rose-600">
                  Tindakan ini menghapus data secara permanen.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-slate-700">
              <p className="font-bold text-rose-900">Yang akan dihapus:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Seluruh data <strong>warga</strong> dan <strong>Kartu Keluarga</strong>.</li>
                <li>Seluruh data <strong>penerima bansos</strong>.</li>
                <li>Seluruh <strong>riwayat pengajuan surat</strong> warga.</li>
              </ul>
              <p className="pt-1 text-[11px] leading-relaxed text-slate-600">
                Akun pengguna tidak dihapus, tetapi tidak lagi terhubung ke data warga. Pastikan
                data sudah dicadangkan sebelum melanjutkan.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={tutup}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setLangkah('form')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
              >
                Saya Mengerti, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {langkah === 'form' && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Konfirmasi Kedua</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Verifikasi identitas admin sebelum menghapus data.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLangkah('peringatan')}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Kembali
              </button>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password Akun Anda *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun admin Anda"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ketik <span className="font-mono text-rose-600">{KONFIRMASI_TEKS}</span> *
                </label>
                <input
                  type="text"
                  required
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  placeholder={KONFIRMASI_TEKS}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-red-100 p-3 text-xs font-medium text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={tutup}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || konfirmasi.trim() !== KONFIRMASI_TEKS || !password}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menghapus Data...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Ya, Hapus Semua Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
