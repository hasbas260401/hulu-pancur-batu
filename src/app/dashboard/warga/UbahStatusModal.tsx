'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, UserX, ArrowRightLeft, Loader2 } from 'lucide-react'

interface UbahStatusModalProps {
  warga: {
    id: string
    nama: string
    nik: string
    statusWarga: string
  }
  isOpen: boolean
  onClose: () => void
}

export default function UbahStatusModal({ warga, isOpen, onClose }: UbahStatusModalProps) {
  const router = useRouter()
  const [statusBaru, setStatusBaru] = useState<string>(warga.statusWarga || 'AKTIF')
  const [loading, setLoading] = useState(false)

  // Form State
  const [tanggalMeninggal, setTanggalMeninggal] = useState('')
  const [sebabMeninggal, setSebabMeninggal] = useState('')
  const [tanggalPindah, setTanggalPindah] = useState('')
  const [alamatTujuan, setAlamatTujuan] = useState('')
  const [alasanPindah, setAlasanPindah] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/warga/${warga.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusWarga: statusBaru,
          tanggalMeninggal: statusBaru === 'MENINGGAL' ? tanggalMeninggal : null,
          sebabMeninggal: statusBaru === 'MENINGGAL' ? sebabMeninggal : null,
          tanggalPindah: statusBaru === 'PINDAH' ? tanggalPindah : null,
          alamatTujuan: statusBaru === 'PINDAH' ? alamatTujuan : null,
          alasanPindah: statusBaru === 'PINDAH' ? alasanPindah : null,
        }),
      })

      if (!res.ok) throw new Error('Gagal memperbarui status warga')

      onClose()
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Ubah Status Kependudukan</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Warga: <span className="font-bold text-slate-700">{warga.nama}</span> ({warga.nik})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pilih Status */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Status Baru *
            </label>
            <select
              value={statusBaru}
              onChange={(e) => setStatusBaru(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium cursor-pointer"
            >
              <option value="AKTIF">AKTIF</option>
              <option value="MENINGGAL">MENINGGAL</option>
              <option value="PINDAH">PINDAH</option>
            </select>
          </div>

          {/* Form Dinamis: Meninggal */}
          {statusBaru === 'MENINGGAL' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1.5">
                <UserX className="w-4 h-4" /> Input Data Meninggal
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Tanggal Meninggal *</label>
                <input
                  type="date"
                  required
                  value={tanggalMeninggal}
                  onChange={(e) => setTanggalMeninggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Sebab / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Sakit / Usia Lanjut"
                  value={sebabMeninggal}
                  onChange={(e) => setSebabMeninggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          )}

          {/* Form Dinamis: Pindah */}
          {statusBaru === 'PINDAH' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" /> Input Data Pindah Domisili
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Tanggal Pindah *</label>
                <input
                  type="date"
                  required
                  value={tanggalPindah}
                  onChange={(e) => setTanggalPindah(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Alamat Tujuan Pindah *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kota Medan / Kabupaten Lain"
                  value={alamatTujuan}
                  onChange={(e) => setAlamatTujuan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Alasan Pindah</label>
                <input
                  type="text"
                  placeholder="Contoh: Pekerjaan / Mengikuti Keluarga"
                  value={alasanPindah}
                  onChange={(e) => setAlasanPindah(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}