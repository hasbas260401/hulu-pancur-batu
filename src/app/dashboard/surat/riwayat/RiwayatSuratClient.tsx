'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAlert } from '@/components/ui/alert'
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
  History,
  XCircle,
  CheckCircle2,
  Inbox,
  FilePenLine,
  MessageSquareText,
} from 'lucide-react'
import { StatusSuratBadge } from '@/components/ui/status-surat'

type StatusTab = 'SEMUA' | 'DIAJUKAN' | 'DIVERIFIKASI' | 'SELESAI' | 'DITOLAK'

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'SEMUA', label: 'Semua' },
  { id: 'DIAJUKAN', label: 'Pending' },
  { id: 'DIVERIFIKASI', label: 'Proses' },
  { id: 'SELESAI', label: 'Selesai' },
  { id: 'DITOLAK', label: 'Ditolak' },
]

export default function RiwayatSuratClient({
  initialRiwayat,
  isAdmin,
  isKadus,
  dusunNama,
  clearAction,
  statusAction,
  currentStatus,
  statusCounts,
  currentPage,
  totalPages,
  totalFilteredRiwayat,
}: {
  initialRiwayat: any[]
  isAdmin: boolean
  isKadus: boolean
  dusunNama?: string
  clearAction: () => Promise<void>
  statusAction: (formData: FormData) => Promise<{ success: boolean; message: string }>
  currentStatus: string
  statusCounts: Record<StatusTab, number>
  currentPage: number
  totalPages: number
  totalFilteredRiwayat: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alert = useAlert()
  const [isPending, startTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()

  const [filterType, setFilterType] = useState(searchParams.get('filter') || 'all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [dateQuery, setDateQuery] = useState(searchParams.get('date') || '')
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [statusTarget, setStatusTarget] = useState<{
    id: string
    nama: string
    status: 'SELESAI' | 'DITOLAK'
  } | null>(null)
  const [catatanInput, setCatatanInput] = useState('')
  const [nomorInput, setNomorInput] = useState('')

  // AJAX Real-time Search dengan Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      const currentFilter = searchParams.get('filter') || 'all'
      const currentDate = searchParams.get('date') || ''
      const currentStatusParam = searchParams.get('status') || 'SEMUA'

      if (searchQuery !== currentQ || filterType !== currentFilter || dateQuery !== currentDate) {
        const params = new URLSearchParams()
        params.set('filter', filterType)
        if (filterType === 'tanggal') {
          if (dateQuery) params.set('date', dateQuery)
        } else {
          if (searchQuery) params.set('q', searchQuery)
        }
        if (currentStatusParam !== 'SEMUA') params.set('status', currentStatusParam)
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

  const handleStatusTab = (status: StatusTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'SEMUA') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    params.set('page', '1')
    startTransition(() => {
      router.push(`/dashboard/surat/riwayat?${params.toString()}`, { scroll: false })
    })
  }

  const bukaModalStatus = (item: any, status: 'SELESAI' | 'DITOLAK') => {
    setStatusTarget({ id: item.id, nama: item.warga?.nama || 'warga', status })
    setCatatanInput(status === 'SELESAI' ? item.catatan || '' : '')
    setNomorInput(item.nomorSurat || '')
  }

  const tutupModalStatus = () => {
    setStatusTarget(null)
    setCatatanInput('')
    setNomorInput('')
  }

  const ubahStatus = (id: string, status: string, catatan?: string, nomorSurat?: string) => {
    const formData = new FormData()
    formData.set('id', id)
    formData.set('status', status)
    if (catatan) formData.set('catatan', catatan)
    if (nomorSurat !== undefined) formData.set('nomorSurat', nomorSurat)

    setStatusBusyId(id)
    startStatusTransition(async () => {
      const result = await statusAction(formData)
      setStatusBusyId(null)
      if (result.success) {
        tutupModalStatus()
        await alert.success('Status Diperbarui', result.message)
        router.refresh()
      } else {
        await alert.error('Gagal Mengubah Status', result.message)
      }
    })
  }

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNumber.toString())
    return `/dashboard/surat/riwayat?${params.toString()}`
  }

  const handleDownloadExcel = () => {
    if (initialRiwayat.length === 0) {
      alert.info('Tidak Ada Data', 'Belum ada riwayat surat yang dapat di-backup saat ini.')
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
    const confirmed = await alert.confirm({
      title: 'Hapus Seluruh Riwayat Surat?',
      message:
        'PERINGATAN KERAS!\n\nApakah Anda yakin ingin menghapus SELURUH riwayat surat ini? Tindakan ini biasanya dilakukan saat arsip akhir tahun dan data yang dihapus tidak dapat dikembalikan.',
      type: 'warning',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      persistent: true,
    })

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await clearAction()
      await alert.success('Berhasil', 'Riwayat surat berhasil dibersihkan/diarsip.')
    } catch (error) {
      await alert.error('Gagal', 'Riwayat surat gagal dibersihkan. Silakan coba lagi.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman dengan Tata Letak Profesional & Seimbang */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 shadow-2xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
              Surat Masuk &amp; Riwayat Surat
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isKadus
                ? `Permohonan surat warga khusus wilayah ${dusunNama || 'Dusun Anda'} beserta status pemrosesannya.`
                : 'Permohonan surat dari warga beserta status pemrosesan dan arsip surat yang telah dibuat.'}
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
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 shrink-0" /> 
            <span>Buat Surat Baru</span>
          </Link>
        </div>
      </div>

      {/* Notifikasi permohonan baru */}
      {statusCounts.DIAJUKAN > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <Inbox className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed">
            <p className="text-sm font-bold">
              {statusCounts.DIAJUKAN} permohonan surat baru menunggu diproses
            </p>
            <p className="mt-0.5 text-amber-800">
              Buka tab <span className="font-semibold">Pending</span> lalu tekan tombol{' '}
              <span className="font-semibold">Proses &amp; Buat Surat</span> untuk melengkapi nomor
              surat dan membuat dokumen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleStatusTab('DIAJUKAN')}
            className="ml-auto shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-amber-700"
          >
            Lihat Pending
          </button>
        </div>
      )}

      {/* Tab status */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        {STATUS_TABS.map((tab) => {
          const aktif = (currentStatus || 'SEMUA') === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleStatusTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                aktif
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 ${aktif ? 'text-emerald-100' : 'text-slate-400'}`}>
                ({statusCounts[tab.id] ?? 0})
              </span>
            </button>
          )
        })}
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
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition"
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
                className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 text-slate-800 placeholder:text-slate-400 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                {isPending && (
                  <Loader2 className="absolute right-3.5 w-4 h-4 text-emerald-500 animate-spin" />
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
          <table className="w-full min-w-[1000px] text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">Nomor Surat</th>
                <th className="px-6 py-3.5">Warga</th>
                <th className="px-6 py-3.5">Jenis Surat</th>
                <th className="px-6 py-3.5">Keperluan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialRiwayat.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    Tidak ada riwayat surat yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                initialRiwayat.map((item) => {
                  const pdfPath = `/api/surat/pdf/${item.id}`

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
                      <td className="px-6 py-4">
                        <StatusSuratBadge status={item.status} />
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.status === 'DIAJUKAN' && (
                            <>
                              <Link
                                href={`/dashboard/surat/buat?pengajuanId=${item.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-sky-700"
                              >
                                <FilePenLine className="h-3 w-3" />
                                Proses &amp; Buat Surat
                              </Link>
                              <button
                                type="button"
                                onClick={() => bukaModalStatus(item, 'DITOLAK')}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                              >
                                <XCircle className="h-3 w-3" /> Tolak
                              </button>
                            </>
                          )}
                          {item.status === 'DIVERIFIKASI' && (
                            <>
                              <button
                                type="button"
                                onClick={() => bukaModalStatus(item, 'SELESAI')}
                                disabled={isStatusPending && statusBusyId === item.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isStatusPending && statusBusyId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Selesai
                              </button>
                              <button
                                type="button"
                                onClick={() => bukaModalStatus(item, 'DITOLAK')}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                              >
                                <XCircle className="h-3 w-3" /> Tolak
                              </button>
                              {!item.filePath && (
                                <Link
                                  href={`/dashboard/surat/buat?pengajuanId=${item.id}`}
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100"
                                >
                                  <FilePenLine className="h-3 w-3" /> Buat Surat
                                </Link>
                              )}
                            </>
                          )}
                          {item.status === 'DITOLAK' && (
                            <button
                              type="button"
                              onClick={() => ubahStatus(item.id, 'DIAJUKAN')}
                              disabled={isStatusPending && statusBusyId === item.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                            >
                              Buka Kembali
                            </button>
                          )}
                          {item.status === 'SELESAI' && (
                            <span className="text-[10px] font-semibold text-slate-400">Final</span>
                          )}
                        </div>
                        {item.catatan && (item.status === 'DITOLAK' || item.status === 'SELESAI') && (
                          <p
                            className={`mt-1 max-w-[190px] whitespace-pre-line text-[10px] leading-relaxed ${
                              item.status === 'DITOLAK' ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            {item.catatan}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <details className="relative inline-block text-left group">
                          <summary className="cursor-pointer list-none px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-2xs">
                            <span>Download</span>
                            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                          </summary>
                          
                          <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-left">
                            {item.filePath ? (
                              <>
                                <a
                                  href={item.filePath}
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
                              </>
                            ) : (
                              <span className="block px-3 py-2 text-[11px] font-medium text-slate-400">
                                Dokumen belum dibuat
                              </span>
                            )}
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

      {/* Modal Selesai / Tolak dengan catatan & nomor surat */}
      {statusTarget && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                  statusTarget.status === 'SELESAI'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                }`}
              >
                {statusTarget.status === 'SELESAI' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {statusTarget.status === 'SELESAI'
                    ? 'Selesaikan Pengajuan Surat'
                    : 'Tolak Pengajuan Surat'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Pengajuan dari{' '}
                  <span className="font-semibold text-slate-200">{statusTarget.nama}</span>{' '}
                  {statusTarget.status === 'SELESAI'
                    ? 'akan ditandai Selesai. Catatan dan nomor surat akan terlihat oleh warga.'
                    : 'akan ditandai Ditolak. Alasan akan terlihat oleh warga.'}
                </p>
              </div>
            </div>

            {statusTarget.status === 'SELESAI' && (
              <div className="space-y-1.5">
                <label htmlFor="nomorSuratSelesai" className="text-xs font-semibold text-slate-300">
                  Nomor surat resmi <span className="text-slate-500">(opsional)</span>
                </label>
                <input
                  id="nomorSuratSelesai"
                  type="text"
                  value={nomorInput}
                  onChange={(e) => setNomorInput(e.target.value)}
                  maxLength={100}
                  placeholder="Contoh: 470/123/DS-HPB/2026"
                  className="field-on-dark w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 font-mono text-xs text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  Nomor ini akan tampil pada kolom Catatan / No. Surat di riwayat warga.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="catatanStatus" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <MessageSquareText className="h-3.5 w-3.5" />
                {statusTarget.status === 'SELESAI' ? 'Catatan / pesan untuk warga' : 'Alasan penolakan'}
                {statusTarget.status === 'DITOLAK' ? (
                  <span className="text-rose-400">*</span>
                ) : (
                  <span className="text-slate-500">(opsional)</span>
                )}
              </label>
              <textarea
                id="catatanStatus"
                value={catatanInput}
                onChange={(e) => setCatatanInput(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={
                  statusTarget.status === 'SELESAI'
                    ? 'Contoh: Silakan ambil fisik surat di kantor desa pada jam kerja.'
                    : 'Contoh: Data kependudukan belum lengkap, silakan perbarui di kantor desa.'
                }
                className={`field-on-dark w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-400 focus:ring-2 ${
                  statusTarget.status === 'SELESAI' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'
                }`}
              />
              <p className="text-[10px] text-slate-500">
                {statusTarget.status === 'SELESAI'
                  ? 'Opsional, maksimal 500 karakter. Catatan akan tersimpan di riwayat warga.'
                  : 'Wajib diisi minimal 3 karakter, maksimal 500 karakter.'}
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={tutupModalStatus}
                className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  isStatusPending ||
                  (statusTarget.status === 'DITOLAK' && catatanInput.trim().length < 3)
                }
                onClick={() => {
                  if (statusTarget.status === 'SELESAI') {
                    ubahStatus(statusTarget.id, 'SELESAI', catatanInput.trim(), nomorInput.trim())
                  } else {
                    ubahStatus(statusTarget.id, 'DITOLAK', catatanInput.trim())
                  }
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  statusTarget.status === 'SELESAI'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isStatusPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : statusTarget.status === 'SELESAI' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {isStatusPending
                  ? 'Memproses...'
                  : statusTarget.status === 'SELESAI'
                    ? 'Ya, Selesaikan'
                    : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}