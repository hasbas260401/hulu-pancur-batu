'use client'

import { useState, useTransition } from 'react'
import { Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export default function TabelTransparansiClient({ 
  initialData, 
  totalFilteredDana, 
  tahunFilter, 
  jenisFilter, 
  hapusDanaAction 
}: { 
  initialData: any[]; 
  totalFilteredDana: number; 
  tahunFilter: number; 
  jenisFilter: string; 
  hapusDanaAction: any;
}) {
  const [data, setData] = useState(initialData)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const PAGE_SIZE = 4
  const totalPages = Math.ceil(totalFilteredDana / PAGE_SIZE)

  // Fungsi untuk mengambil data halaman berikutnya via AJAX (tanpa refresh halaman)
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/transparansi?tahun=${tahunFilter}&jenis=${jenisFilter}&page=${newPage}&pageSize=${PAGE_SIZE}`)
        const result = await res.json()
        if (result && result.data) {
          setData(result.data)
          setCurrentPage(newPage)
        }
      } catch (error) {
        console.error("Gagal memuat data:", error)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden lg:col-span-2 flex flex-col justify-between relative">
      {/* Loading Overlay saat AJAX berjalan */}
      {isPending && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-3xs flex items-center justify-center z-10 transition-all">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Memuat data...
          </div>
        </div>
      )}

      <div>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800">Daftar Anggaran & Realisasi ({totalFilteredDana})</h2>
          <span className="text-xs text-slate-400">Maksimal 4 item per halaman</span>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs my-auto">
            Belum ada data anggaran tersimpan di tahun {tahunFilter}. Silakan gunakan form di samping.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Jenis / Kategori</th>
                  <th className="px-4 py-3">Uraian Kegiatan & Tanggal</th>
                  <th className="px-4 py-3">Anggaran</th>
                  <th className="px-4 py-3">Realisasi</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item: any) => {
                  const formattedDate = new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition align-top">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                          item.jenis === 'PENDAPATAN' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : item.jenis === 'BELANJA' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {item.jenis}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 font-medium">{item.kategori}</div>
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <div className="font-bold text-slate-800">{item.uraian}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.sumber && <span className="text-[11px] text-slate-400">Sumber: {item.sumber}</span>}
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                            📅 {formattedDate}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Rp {Number(item.anggaran).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        Rp {Number(item.realisasi).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <form action={hapusDanaAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg transition border border-rose-200 inline-flex items-center gap-1 cursor-pointer"
                            title="Hapus data ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Navigasi Pagination AJAX */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
          <div className="text-xs text-slate-500">
            Menampilkan halaman <span className="font-semibold text-slate-800">{currentPage}</span> dari{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span> (Total <span className="font-semibold text-slate-800">{totalFilteredDana}</span> item)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition shadow-xs ${
                currentPage <= 1 || isPending
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition shadow-xs ${
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
    </div>
  )
}