'use client'

import { useState, useTransition } from 'react'
import { 
  Search, 
  Eye, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'

export default function BansosClient({
  initialData,
  initialPagination,
  stats,
  isKadus,
  user,
  hapusBansosAction
}: {
  initialData: any[]
  initialPagination: any
  stats: any
  isKadus: boolean
  user: any
  hapusBansosAction: (formData: FormData) => Promise<any>
}) {
  const [isPending, startTransition] = useTransition()

  const [data, setData] = useState(initialData)
  const [pagination, setPagination] = useState(initialPagination)

  const [q, setQ] = useState('')
  const [program, setProgram] = useState('')
  const [status, setStatus] = useState('')

  // Fungsi fetch data via AJAX API murni berdasarkan parameter state lokal
  const fetchBansosData = async (searchQ: string, searchProgram: string, searchStatus: string, page: number) => {
    try {
      const params = new URLSearchParams()
      if (searchQ) params.set('q', searchQ)
      if (searchProgram) params.set('program', searchProgram)
      if (searchStatus) params.set('status', searchStatus)
      if (page > 1) params.set('page', page.toString())

      const res = await fetch(`/api/bansos?${params.toString()}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setPagination(result.pagination)
      }
    } catch (err) {
      console.error('Gagal mengambil data bansos:', err)
    }
  }

  // Handle saat input pencarian atau dropdown filter berubah (Otomatis AJAX tanpa refresh)
  const handleFilterChange = (field: string, value: string) => {
    let newQ = q
    let newProgram = program
    let newStatus = status

    if (field === 'q') {
      newQ = value
      setQ(value)
    }
    if (field === 'program') {
      newProgram = value
      setProgram(value)
    }
    if (field === 'status') {
      newStatus = value
      setStatus(value)
    }

    startTransition(() => {
      fetchBansosData(newQ, newProgram, newStatus, 1) // Selalu kembali ke halaman 1 saat filter berubah
    })
  }

  // Handle klik tombol paginasi (Murni AJAX tanpa refresh & tanpa mengubah URL browser)
  const handlePageChange = (targetPage: number) => {
    if (targetPage < 1 || targetPage > pagination.totalPages) return

    startTransition(() => {
      fetchBansosData(q, program, status, targetPage)
    })
  }

  const handleReset = () => {
    setQ('')
    setProgram('')
    setStatus('')
    startTransition(() => {
      fetchBansosData('', '', '', 1)
    })
  }

  // Fungsi khusus handle hapus data menggunakan SweetAlert2
  const handleDelete = async (id: string, namaWarga: string, programBansos: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Bansos?',
      text: `Apakah Anda yakin ingin menghapus program ${programBansos} untuk warga ${namaWarga}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl text-xs',
        confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
        cancelButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
      }
    })

    if (result.isConfirmed) {
      const formData = new FormData()
      formData.append('id', id)

      try {
        await hapusBansosAction(formData)
        
        Swal.fire({
          title: 'Berhasil!',
          text: 'Data bansos berhasil dihapus dari sistem.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl text-xs' }
        })

        // Ambil ulang data terbaru setelah berhasil dihapus
        fetchBansosData(q, program, status, pagination.currentPage)
      } catch (error: any) {
        Swal.fire({
          title: 'Gagal!',
          text: error.message || 'Gagal menghapus data bansos.',
          icon: 'error',
          confirmButtonColor: '#2563eb',
          customClass: { popup: 'rounded-2xl text-xs' }
        })
      }
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    const currentPage = pagination.currentPage
    const totalPages = pagination.totalPages

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Bantuan Sosial (Bansos)</h1>
          <p className="text-sm text-slate-500">
            {isKadus
              ? `Kelola dan pantau data penyaluran bantuan sosial khusus wilayah ${user?.dusunNama || 'Dusun Anda'}.`
              : 'Kelola dan pantau data penyaluran bantuan sosial warga desa secara transparan.'}
          </p>
        </div>
      </div>

      {/* KARTU REKAPITULASI STATISTIK PROGRAM BANSOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Keseluruhan</span>
          <div className="text-xl font-bold text-slate-900">{stats.totalKeseluruhan}</div>
          <span className="text-[10px] text-blue-600 font-medium">Penerima Bansos</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-blue-600 uppercase">PKH</span>
          <div className="text-xl font-bold text-slate-900">{stats.totalPkh}</div>
          <span className="text-[10px] text-slate-400">Keluarga Harapan</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">BPNT</span>
          <div className="text-xl font-bold text-slate-900">{stats.totalBpnt}</div>
          <span className="text-[10px] text-slate-400">Bantuan Pangan</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-600 uppercase">BLT-DD</span>
          <div className="text-xl font-bold text-slate-900">{stats.totalBltDd}</div>
          <span className="text-[10px] text-slate-400">Dana Desa</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-purple-600 uppercase">PBI-JK</span>
          <div className="text-xl font-bold text-slate-900">{stats.totalPbiJk}</div>
          <span className="text-[10px] text-slate-400">Iuran Kesehatan</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-rose-600 uppercase">BST</span>
          <div className="text-xl font-bold text-slate-900">{stats.totalBst}</div>
          <span className="text-[10px] text-slate-400">Sosial Tunai</span>
        </div>
      </div>

      {/* FILTER & PENCARIAN DATA BANSOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <Search className="w-4 h-4 text-blue-600" />
          <span>Filter Data Penyaluran</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <input
              type="text"
              value={q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              placeholder="Cari nama warga / NIK..."
              className="w-full px-3.5 py-2.5 bg-white text-slate-800 placeholder:text-slate-400 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={program}
              onChange={(e) => handleFilterChange('program', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">-- Semua Program Bansos --</option>
              <option value="PKH">PKH</option>
              <option value="BPNT">BPNT</option>
              <option value="BLT-DD">BLT-DD</option>
              <option value="PBI-JK">PBI-JK</option>
              <option value="BST">BST</option>
            </select>
          </div>
          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">-- Semua Status --</option>
              <option value="AKTIF">Aktif</option>
              <option value="SELESAI">Selesai</option>
              <option value="DICABUT">Dicabut</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center transition flex items-center justify-center cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* TABEL MANAJEMEN PENERIMA BANSOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative min-h-[400px] flex flex-col justify-between">
        {/* Indikator Loading AJAX Overlay */}
        {isPending && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-30 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Memperbarui Data...</span>
            </div>
          </div>
        )}

        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Daftar Penerima Bantuan Sosial ({pagination.totalItems})</h2>
            <p className="text-xs text-slate-400">Data bersumber dari input profil masing-masing warga.</p>
          </div>

          {data.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Belum ada data penerima bantuan sosial yang sesuai dengan filter di wilayah ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">No. KK / NIK</th>
                    <th className="px-5 py-3">Nama Warga</th>
                    <th className="px-5 py-3 text-center">Dusun</th>
                    <th className="px-5 py-3">Program Bansos</th>
                    <th className="px-5 py-3">Periode</th>
                    <th className="px-5 py-3">Nominal</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3">
                        <div className="font-mono font-bold text-slate-800">{b.warga?.kk?.noKk || '-'}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{b.warga?.nik}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800">
                          {b.warga?.nama || 'Warga Dihapus'}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700 text-center">
                        {b.warga?.dusun?.nama ? b.warga.dusun.nama.replace(/Dusun\s+/i, '') : '-'}
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-800">{b.program}</td>
                      <td className="px-5 py-3 font-medium text-slate-600">{b.periode || '-'}</td>
                      <td className="px-5 py-3 font-semibold text-emerald-600">
                        {b.nominal ? `Rp ${Number(b.nominal).toLocaleString('id-ID')}` : <span className="text-slate-400 italic font-normal">Non-Tunai / Layanan</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                          b.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/warga/${b.wargaId}`}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition border border-blue-200 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id, b.warga?.nama || 'Warga', b.program)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg transition border border-rose-200 inline-flex items-center gap-1 cursor-pointer"
                            title="Hapus data bansos ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Navigasi Pagination AJAX Lokal */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Menampilkan halaman <span className="font-semibold text-slate-800">{pagination.currentPage}</span> dari{' '}
              <span className="font-semibold text-slate-800">{pagination.totalPages}</span> (Total <span className="font-semibold text-slate-800">{pagination.totalItems}</span> data bansos)
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition shadow-xs ${
                  pagination.currentPage > 1
                    ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>

              {getPageNumbers().map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePageChange(num)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer ${
                    pagination.currentPage === num
                      ? 'bg-blue-600 text-white shadow-blue-600/30'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition shadow-xs ${
                  pagination.currentPage < pagination.totalPages
                    ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}