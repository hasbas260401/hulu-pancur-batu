'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react'
import { useAlert } from '@/components/ui/alert'

const KONFIRMASI_TEKS = 'HAPUS SEMUA DATA'

export default function ResetDbModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const alert = useAlert()

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
      setIsOpen(false)
      setPassword('')
      setKonfirmasi('')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Tombol Merah Reset Database */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
      >
        <AlertTriangle className="w-4 h-4 text-rose-600" />
        <span>Kosongkan Database Warga</span>
      </button>

      {/* Modal Popup Konfirmasi & Password */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header Modal Warning */}
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Kosongkan Seluruh Data</h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
            </div>

            {/* Isi Peringatan */}
            <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl text-xs text-rose-900 space-y-2">
              <p className="font-semibold">Peringatan Keras:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Seluruh data <strong>Warga</strong> akan dihapus permanen.</li>
                <li>Seluruh data <strong>Kartu Keluarga (KK)</strong> akan dihapus permanen.</li>
                <li>Seluruh data <strong>Penerima Bansos</strong> akan dihapus permanen.</li>
                <li>Seluruh <strong>Riwayat Pengajuan Surat</strong> warga ikut terhapus.</li>
                <li>Statistik dashboard akan kembali ke angka <strong>0</strong>.</li>
                <li>Akun pengguna tidak dihapus, tetapi tidak lagi terhubung ke data warga.</li>
                <li>Pastikan data sudah dicadangkan sebelum melanjutkan.</li>
              </ul>
            </div>

            {/* Form Password */}
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password Akun Anda *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun admin Anda"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ketik <span className="font-mono text-rose-600">{KONFIRMASI_TEKS}</span> untuk melanjutkan *
                </label>
                <input
                  type="text"
                  required
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  placeholder={KONFIRMASI_TEKS}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-100 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsOpen(false)
                    setErrorMsg('')
                    setPassword('')
                    setKonfirmasi('')
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || konfirmasi.trim() !== KONFIRMASI_TEKS}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus Data...</span>
                    </>
                  ) : (
                    <span>Ya, Hapus Semua Data</span>
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