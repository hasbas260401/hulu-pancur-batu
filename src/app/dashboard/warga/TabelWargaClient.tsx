'use client'

import Link from 'next/link'
import { useState, useTransition, useEffect } from 'react'
import { 
  Pencil, 
  CheckCircle2, 
  UserX, 
  ArrowRightLeft, 
  X, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAlert } from '@/components/ui/alert'
import { hapusWargaAction, updateStatusWargaAction } from './actions'

interface WargaProps {
  id: string
  nik: string
  nama: string
  jenisKelamin: string
  tempatLahir: string | null
  tanggalLahir: string | Date
  agama: string | null
  pekerjaan: string | null
  statusWarga: string
  hubunganKeluarga?: string | null
  statusPerkawinan?: string | null
  dusunId?: number | null
  dusun?: { id: number; nama: string } | null
  kk?: { 
    noKk: string
    dusunId?: number | null
    dusun?: { id: number; nama: string } | null
  } | null
}

/**
 * Nama dusun ditampilkan apa adanya dari relasi `Warga.dusun` (mis. "Dusun II").
 *
 * Sebelumnya ada fungsi yang menebak angka Romawi dari nama dusun, tetapi
 * memakai `text.includes('I')`. Karena "Dusun II"/"III"/"IV" semuanya memuat
 * huruf "I", hasilnya selalu "I" walau `dusunId` sudah benar. Sumber
 * kebenaran tetap relasi database, bukan tebakan dari teks.
 */
function formatDusun(
  dusun: { nama?: string | null } | null | undefined,
  fallbackDusun?: { nama?: string | null } | null
): string {
  const nama = (dusun?.nama || fallbackDusun?.nama || '').trim()
  return nama || '-'
}

export default function TabelWargaClient({
  initialData,
  totalInitialFiltered,
}: {
  initialData: WargaProps[]
  totalInitialFiltered: number
}) {
  const searchParams = useSearchParams()
  const alert = useAlert()
  const [dataWarga, setDataWarga] = useState<WargaProps[]>(initialData)
  const [totalFiltered, setTotalFiltered] = useState<number>(totalInitialFiltered)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isPending, startTransition] = useTransition()

  const PAGE_SIZE = 15
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeModalWarga, setActiveModalWarga] = useState<WargaProps | null>(null)
  const [newStatus, setNewStatus] = useState<string>('AKTIF')
  const [tanggalMeninggal, setTanggalMeninggal] = useState<string>('')
  const [tanggalPindah, setTanggalPindah] = useState<string>('')
  const [keterangan, setKeterangan] = useState<string>('')
  const [alasanPindah, setAlasanPindah] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchWargaData = (pageToFetch: number) => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', pageToFetch.toString())

        const res = await fetch(`/api/warga?${params.toString()}`)
        const result = await res.json()

        if (result && result.dataWarga) {
          setDataWarga(result.dataWarga)
          setTotalFiltered(result.totalFilteredWarga)
          setCurrentPage(pageToFetch)
        }
      } catch (error) {
        console.error('Gagal mengambil data AJAX warga:', error)
      }
    })
  }

  useEffect(() => {
    setCurrentPage(1)
    fetchWargaData(1)
  }, [searchParams])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    fetchWargaData(newPage)
  }

  const handleOpenModal = (warga: WargaProps) => {
    setActiveModalWarga(warga)
    setNewStatus(warga.statusWarga || 'AKTIF')
    setTanggalMeninggal('')
    setTanggalPindah('')
    setKeterangan('')
    setAlasanPindah('')
  }

  // Fungsi handle hapus warga
  const handleDeleteWarga = async (warga: WargaProps) => {
    const confirmed = await alert.confirm({
      title: 'Hapus Data Warga?',
      message: `Apakah Anda yakin ingin menghapus data warga atas nama ${warga.nama}? Tindakan ini tidak dapat dibatalkan.`,
      type: 'warning',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      persistent: true,
    })

    if (!confirmed) return

    setDeletingId(warga.id)

    try {
      const res = await hapusWargaAction(warga.id)
      if (!res.success) throw new Error(res.message)

      await alert.success('Berhasil', 'Data warga berhasil dihapus dari sistem.')

      // Refresh data pada halaman aktif
      fetchWargaData(currentPage)
    } catch (error: any) {
      await alert.error('Gagal', error.message || 'Gagal menghapus data warga.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-3xs flex items-center justify-center z-10 transition-all">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Memuat data warga...
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">No. KK / NIK</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">L/P</th>
                <th className="py-3.5 px-4">TTL</th>
                <th className="py-3.5 px-4">Agama</th>
                <th className="py-3.5 px-4">Pekerjaan</th>
                <th className="py-3.5 px-4 text-center">Dusun</th>
                <th className="py-3.5 px-4 text-center">Status Warga (Klik)</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dataWarga.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada data warga yang ditemukan.
                  </td>
                </tr>
              ) : (
                dataWarga.map((warga) => {
                  // Nama dusun diambil dari relasi dusunId, bukan ditebak dari teks.
                  const namaDusun = formatDusun(warga.dusun, warga.kk?.dusun)

                  const status = (warga.statusWarga || 'AKTIF').toUpperCase()
                  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  let statusLabel = 'Aktif'

                  if (status === 'MENINGGAL') {
                    badgeClass = 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                    statusIcon = <UserX className="w-3.5 h-3.5 text-slate-600" />
                    statusLabel = 'Meninggal'
                  } else if (status === 'PINDAH') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    statusIcon = <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                    statusLabel = 'Pindah'
                  }

                  return (
                    <tr key={warga.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-semibold">
                        <div className="text-slate-900">{warga.kk?.noKk || '-'}</div>
                        <div className="text-slate-400 text-[11px]">{warga.nik}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{warga.nama}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          warga.jenisKelamin === 'LAKI_LAKI' ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {warga.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>{warga.tempatLahir || '-'}</div>
                        <div className="text-slate-400 text-[11px]">
                          {new Date(warga.tanggalLahir).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="py-3 px-4">{warga.agama || '-'}</td>
                      <td className="py-3 px-4">{warga.pekerjaan || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-extrabold rounded-md text-[11px]">
                          {namaDusun}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(warga)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-bold rounded-md text-[10px] border transition cursor-pointer shadow-2xs ${badgeClass}`}
                          title="Klik untuk ubah status warga"
                        >
                          {statusIcon}
                          <span>{statusLabel}</span>
                          <Pencil className="w-3 h-3 ml-0.5 opacity-70" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/dashboard/warga/${warga.id}`}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                          >
                            Detail
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteWarga(warga)}
                            disabled={deletingId === warga.id}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold transition disabled:opacity-50 cursor-pointer"
                          >
                            {deletingId === warga.id ? '...' : 'Hapus'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
            Menampilkan halaman <span className="font-semibold text-slate-800">{currentPage}</span> dari{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span> (Total <span className="font-semibold text-slate-800">{totalFiltered}</span> data)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition ${
                currentPage <= 1 || isPending
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition ${
                currentPage >= totalPages || isPending
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeModalWarga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            action={async (formData) => {
              setIsSubmitting(true)
              try {
                const res = await updateStatusWargaAction(formData)
                if (!res.success) {
                  await alert.error('Gagal', res.message)
                } else {
                  setActiveModalWarga(null)
                  fetchWargaData(currentPage)
                }
              } catch (err) {
                await alert.error('Gagal', 'Gagal mengubah status warga.')
              } finally {
                setIsSubmitting(false)
              }
            }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200"
          >
            <input type="hidden" name="id" value={activeModalWarga.id} />

            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Ubah Status Kependudukan
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalWarga(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Nama Warga</span>
                  <span className="text-sm font-bold text-slate-800">{activeModalWarga.nama}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">NIK</span>
                  <span className="font-mono font-semibold text-slate-700">{activeModalWarga.nik}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Status Kependudukan Baru:</label>
                <select
                  name="statusWarga"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold cursor-pointer"
                >
                  <option value="AKTIF">Warga Aktif</option>
                  <option value="MENINGGAL">Meninggal Dunia</option>
                  <option value="PINDAH">Pindah Domisili</option>
                </select>
              </div>

              {newStatus === 'MENINGGAL' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Tanggal Meninggal:</label>
                    <input
                      type="date"
                      name="tanggalMeninggal"
                      value={tanggalMeninggal}
                      onChange={(e) => setTanggalMeninggal(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Penyebab / Keterangan:</label>
                    <input
                      type="text"
                      name="keterangan"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Sakit di RS, Usia Lanjut, dll."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {newStatus === 'PINDAH' && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Tanggal Pindah:</label>
                    <input
                      type="date"
                      name="tanggalPindah"
                      value={tanggalPindah}
                      onChange={(e) => setTanggalPindah(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Alamat Tujuan Pindah:</label>
                    <input
                      type="text"
                      name="keterangan"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Kota Medan, Kec. Medan Tembung..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Alasan Pindah:</label>
                    <input
                      type="text"
                      name="alasanPindah"
                      value={alasanPindah}
                      onChange={(e) => setAlasanPindah(e.target.value)}
                      placeholder="Contoh: Bekerja, Mengikuti Keluarga, dll."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              )}

              {newStatus === 'AKTIF' && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Keterangan Tambahan (Opsional):</label>
                  <input
                    type="text"
                    name="keterangan"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Contoh: Kembali menetap di desa..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalWarga(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}