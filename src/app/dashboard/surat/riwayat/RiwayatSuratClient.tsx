'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  ChevronDown, 
  FileText, 
  FileSpreadsheet, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react'

export default function RiwayatSuratClient({
  initialRiwayat,
  isAdmin,
  isKadus,
  dusunNama,
  clearAction,
  currentPage,
  totalPages,
  totalFilteredRiwayat,
}: {
  initialRiwayat: any[]
  isAdmin: boolean
  isKadus: boolean
  dusunNama?: string
  clearAction: () => Promise<void>
  currentPage: number
  totalPages: number
  totalFilteredRiwayat: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [filterType, setFilterType] = useState(searchParams.get('filter') || 'all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [dateQuery, setDateQuery] = useState(searchParams.get('date') || '')
  const [isDeleting, setIsDeleting] = useState(false)

  // AJAX Real-time Search dengan Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      const currentFilter = searchParams.get('filter') || 'all'
      const currentDate = searchParams.get('date') || ''

      if (searchQuery !== currentQ || filterType !== currentFilter || dateQuery !== currentDate) {
        const params = new URLSearchParams()
        params.set('filter', filterType)
        if (filterType === 'tanggal') {
          if (dateQuery) params.set('date', dateQuery)
        } else {
          if (searchQuery) params.set('q', searchQuery)
        }
        params.set('page', '1')

        startTransition(() => {
          router.push(`/dashboard/surat/riwayat?${params.toString()}`, { scroll: false })
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filterType, dateQuery, router, searchParams])

  const handleReset = () => {
    setFilterType('all')
    setSearchQuery('')
    setDateQuery('')
    startTransition(() => {
      router.push('/dashboard/surat/riwayat', { scroll: false })
    })
  }

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNumber.toString())
    return `/dashboard/surat/riwayat?${params.toString()}`
  }

  const handleDownloadExcel = () => {
    if (initialRiwayat.length === 0) {
      alert('Tidak ada data riwayat untuk di-backup.')
      return
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
    csvContent += 'Tanggal,Nomor Surat,Nama Warga,Jenis Surat,Keperluan\r\n'

    initialRiwayat.forEach((item) => {
      const tanggal = new Date(item.createdAt).toLocaleString('id-ID')
      const nomor = `"${item.nomorSurat || '-'}"`
      const nama = `"${item.warga?.nama || '-'}"`
      const jenis = `"${item.template?.nama || '-'}"`
      const keperluan = `"${(item.keperluan || '').replace(/"/g, '""')}"`

      const row = [tanggal, nomor, nama, jenis, keperluan].join(',')
      csvContent += row + '\r\n'
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Backup_Riwayat_Surat_Desa_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClearData = async () => {
    if (confirm('PERINGATAN KERAS!\n\nApakah Anda yakin ingin menghapus SELURUH riwayat surat ini? Tindakan ini biasanya dilakukan saat arsip akhir tahun dan data yang dihapus tidak dapat dikembalikan.')) {
      setIsDeleting(true)
      try {
        await clearAction()
        alert('Riwayat surat berhasil dibersihkan/diarsip.')
      } catch (error) {
        alert('Gagal membersihkan riwayat surat.')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman dengan Tata Letak Profesional & Seimbang */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-2xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Riwayat Cetak Surat</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isKadus
                ? `Daftar seluruh riwayat surat warga khusus wilayah ${dusunNama || 'Dusun Anda'}.`
                : 'Daftar seluruh surat yang pernah di-generate oleh sistem secara otomatis.'}
            </p>
          </div>
        </div>

        {/* Tombol Aksi di Kanan Berderet Horizontal Rapi & Ukuran Sama Seragam */}
        <div className="flex items-center flex-wrap justify-start md:justify-end gap-2.5 w-full md:w-auto shrink-0">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" /> 
                <span>Backup CSV</span>
              </button>
              <button
                type="button"
                onClick={handleClearData}
                disabled={isDeleting}
                className="h-10 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="w-4 h-4 shrink-0" />
                )}
                <span>Arsip & Bersihkan</span>
              </button>
            </>
          )}

          <Link
            href="/dashboard/surat/buat"
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 shrink-0" /> 
            <span>Buat Surat Baru</span>
          </Link>
        </div>
      </div>

      {/* Kartu Pencarian AJAX */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-56">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setSearchQuery('')
                setDateQuery('')
              }}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition"
            >
              <option value="all">Cari Semua (Nama/No)</option>
              <option value="nama">Berdasarkan Nama Warga</option>
              <option value="nomor">Berdasarkan Nomor Surat</option>
              <option value="tanggal">Berdasarkan Tanggal</option>
            </select>
          </div>

          <div className="flex-1 w-full relative flex items-center">
            {filterType === 'tanggal' ? (
              <input
                type="date"
                value={dateQuery}
                onChange={(e) => setDateQuery(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            ) : (
              <div className="relative flex items-center w-full">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    filterType === 'nama'
                      ? 'Ketik nama warga yang dicari (AJAX)...'
                      : filterType === 'nomor'
                      ? 'Ketik nomor surat (contoh: 470/II/2026)...'
                      : 'Ketik nama warga atau nomor surat...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 text-slate-800 placeholder:text-slate-400 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {isPending && (
                  <Loader2 className="absolute right-3.5 w-4 h-4 text-blue-500 animate-spin" />
                )}
              </div>
            )}
          </div>

          {(searchQuery || dateQuery || filterType !== 'all') && (
            <button
              type="button"
              onClick={handleReset}
              className="w-full md:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel Data Riwayat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">Nomor Surat</th>
                <th className="px-6 py-3.5">Warga</th>
                <th className="px-6 py-3.5">Jenis Surat</th>
                <th className="px-6 py-3.5">Keperluan</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialRiwayat.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Tidak ada riwayat surat yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                initialRiwayat.map((item) => {
                  const pdfPath = item.filePath ? item.filePath.replace('.docx', '.pdf') : '#'

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                        {item.nomorSurat || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-xs">{item.warga?.nama}</div>
                        <div className="text-[11px] text-slate-500 font-mono">NIK: {item.warga?.nik}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                        {item.template?.nama || <span className="text-slate-400 italic">Template Dihapus</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs max-w-xs truncate">{item.keperluan}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <details className="relative inline-block text-left group">
                          <summary className="cursor-pointer list-none px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-2xs">
                            <span>Download</span>
                            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                          </summary>
                          
                          <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-left">
                            <a
                              href={item.filePath || '#'}
                              download
                              className="w-full px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg flex items-center gap-2 transition"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" /> Unduh Word (.docx)
                            </a>
                            <a
                              href={pdfPath}
                              download
                              className="w-full px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600" /> Unduh PDF (.pdf)
                            </a>
                          </div>
                        </details>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Komponen Paginasi 10 Data per Halaman */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{' '}
              <span className="font-bold text-slate-800">{totalPages}</span> (Total <span className="font-bold text-slate-800">{totalFilteredRiwayat}</span> riwayat)
            </div>

            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </span>
              )}

              {currentPage < totalPages ? (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  Selanjutnya <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed">
                  Selanjutnya <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}