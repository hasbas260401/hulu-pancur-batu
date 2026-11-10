'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

const DAFTAR_BANSOS_NASIONAL = [
  { nama: 'PKH (Program Keluarga Harapan)' },
  { nama: 'BPNT (Bantuan Pangan Non-Tunai / Sembako)' },
  { nama: 'BLT-DD (Bantuan Langsung Tunai Dana Desa)' },
  { nama: 'PBI-JK (Penerima Bantuan Iuran Jaminan Kesehatan)' },
  { nama: 'BST (Bantuan Sosial Tunai)' },
  { nama: 'Bansos Pemda / Kabupaten / Provinsi' },
  { nama: 'LAINNYA' },
]

const DAFTAR_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function BansosFormModal({
  actionServer,
}: {
  actionServer: (formData: FormData) => Promise<{ success: boolean; message: string }>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Menutup popup otomatis saat mengeklik di sembarang tempat di luar form
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2"
      >
        <span>+ Tambah Bantuan</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-5 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase">Form Pendaftaran Bansos</h3>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const formEl = e.currentTarget
              setSaving(true)
              setError(null)
              try {
                const res = await actionServer(new FormData(formEl))
                if (res.success) {
                  formEl.reset()
                  setSelectedProgram('')
                  setIsOpen(false)
                } else {
                  setError(res.message)
                }
              } catch (err) {
                console.error('Gagal menyimpan bansos:', err)
                setError('Terjadi kesalahan. Silakan coba lagi.')
              } finally {
                setSaving(false)
              }
            }}
            className="space-y-3"
          >
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <input type="hidden" name="actionType" value="add" />

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Program Bansos *</label>
              <select
                name="program_select"
                required
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="" disabled>-- Pilih Program Bansos --</option>
                {DAFTAR_BANSOS_NASIONAL.map((b) => (
                  <option key={b.nama} value={b.nama}>{b.nama}</option>
                ))}
              </select>
            </div>

            {/* Form Ketik Manual HANYA MUNCUL jika memilih LAINNYA */}
            {selectedProgram === 'LAINNYA' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Atau Ketik Manual (Nama Bansos) *</label>
                <input
                  type="text"
                  name="program_manual"
                  required
                  placeholder="Ketik nama bansos khusus..."
                  className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-blue-50/30 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bulan / Periode *</label>
                <select
                  name="bulan"
                  defaultValue="Januari"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {DAFTAR_BULAN.map((bln) => (
                    <option key={bln} value={bln}>{bln}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tahun *</label>
                {/* Tahun diubah kembali menjadi input teks biasa */}
                <input
                  type="text"
                  name="tahun"
                  inputMode="numeric"
                  pattern="\d{4}"
                  title="4 angka, contoh 2026"
                  defaultValue="2026"
                  required
                  placeholder="Contoh: 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue="AKTIF"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="AKTIF">Aktif</option>
                  <option value="SELESAI">Selesai</option>
                  <option value="DICABUT">Dicabut</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  name="nominal"
                  placeholder="Contoh: 600000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
              <input
                type="text"
                name="catatan"
                placeholder="Keterangan opsional..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Menyimpan…' : 'Simpan & Daftarkan Bansos'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}