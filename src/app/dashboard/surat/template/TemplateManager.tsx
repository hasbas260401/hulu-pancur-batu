'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import { uploadTemplateAction, hapusTemplateAction } from './actions'

const PAGE_SIZE = 3

interface TemplateItem {
  id: string
  kode: string
  nama: string
  kodeKlasifikasi: string
  filePath: string | null
}

const labelCls = 'block font-bold text-slate-700 uppercase mb-1'
const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-medium'

/* ---------- Dialog konfirmasi hapus (<dialog> bawaan browser) ---------- */

function ConfirmDeleteDialog({
  item,
  busy,
  onCancel,
  onConfirm,
}: {
  item: TemplateItem
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onCancel={(e) => {
        if (busy) e.preventDefault() // jangan tutup (Esc) saat proses hapus berjalan
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) ref.current?.close()
      }}
      aria-labelledby="hapus-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="hapus-title" className="text-base font-bold text-slate-900">
              Hapus template surat?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Template <strong className="text-slate-800">{item.nama}</strong> ({item.kode}) akan dihapus
              beserta file .docx-nya. Surat yang sudah pernah dibuat tetap tersimpan di riwayat.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-4">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          disabled={busy}
          className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Menghapus…' : 'Ya, Hapus'}
        </button>
      </div>
    </dialog>
  )
}

/* ---------- Komponen utama ---------- */

export default function TemplateManager({
  initialData,
  initialTotal,
  canManage,
  sidePanel,
}: {
  initialData: TemplateItem[]
  initialTotal: number
  canManage: boolean
  sidePanel: React.ReactNode // hanya ditampilkan untuk ADMIN
}) {
  const [items, setItems] = useState<TemplateItem[]>(initialData)
  const [total, setTotal] = useState<number>(initialTotal)
  const [page, setPage] = useState<number>(1)
  const [loadingList, setLoadingList] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toDelete, setToDelete] = useState<TemplateItem | null>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function showNotification(type: 'success' | 'error', text: string) {
    if (timer.current) clearTimeout(timer.current)
    setMessage({ type, text })
    timer.current = setTimeout(() => setMessage(null), 5000)
  }

  async function fetchPage(p: number) {
    const res = await fetch(`/api/surat/template?page=${p}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' })
    if (res.status === 401) {
      window.location.href = '/login'
      return null
    }
    if (!res.ok) throw new Error('Gagal memuat daftar template.')
    return (await res.json()) as { data: TemplateItem[]; total: number }
  }

  // Ambil ulang halaman tertentu. Jika halaman itu sudah tidak ada
  // (misalnya setelah menghapus data terakhir di halaman terakhir), mundur ke halaman terakhir yang ada.
  async function loadPage(target: number) {
    try {
      let p = target
      let result = await fetchPage(p)
      if (!result) return

      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
      if (p > lastPage) {
        p = lastPage
        result = await fetchPage(p)
        if (!result) return
      }

      setItems(result.data)
      setTotal(result.total)
      setPage(p)
    } catch (error) {
      console.error('Gagal memuat daftar template:', error)
      showNotification('error', 'Gagal memuat daftar template. Coba muat ulang halaman.')
    }
  }

  async function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages || loadingList) return
    setLoadingList(true)
    await loadPage(newPage)
    setLoadingList(false)
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setSaving(true)
    try {
      const res = await uploadTemplateAction(new FormData(form))
      if (res.success) {
        form.reset()
        showNotification('success', res.message)
        setLoadingList(true)
        await loadPage(page)
        setLoadingList(false)
      } else {
        showNotification('error', res.message)
      }
    } catch (error) {
      console.error('Gagal mengunggah template:', error)
      showNotification('error', 'Terjadi kesalahan saat mengunggah. Pastikan ukuran file tidak terlalu besar, lalu coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const res = await hapusTemplateAction(toDelete.id)
      setToDelete(null)
      showNotification(res.success ? 'success' : 'error', res.message)
      if (res.success) {
        setLoadingList(true)
        await loadPage(page)
        setLoadingList(false)
      }
    } catch (error) {
      console.error('Gagal menghapus template:', error)
      setToDelete(null)
      showNotification('error', 'Terjadi kesalahan saat menghapus. Silakan coba lagi.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Form upload + panel samping */}
      {canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Tambah Master Template Surat</span>
            </h2>
            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tpl-nama" className={labelCls}>Nama Surat *</label>
                  <input
                    id="tpl-nama"
                    type="text"
                    name="nama"
                    required
                    maxLength={100}
                    placeholder="Contoh: Surat Keterangan Usaha"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="tpl-kode" className={labelCls}>Kode Surat *</label>
                  <input
                    id="tpl-kode"
                    type="text"
                    name="kode"
                    required
                    maxLength={20}
                    placeholder="Contoh: SKU"
                    className={`${inputCls} uppercase font-mono font-semibold`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tpl-klasifikasi" className={labelCls}>Kode Klasifikasi Arsip</label>
                <input
                  id="tpl-klasifikasi"
                  type="text"
                  name="kodeKlasifikasi"
                  defaultValue="470"
                  maxLength={20}
                  placeholder="470"
                  className={`${inputCls} font-mono font-semibold`}
                />
              </div>

              <div>
                <label htmlFor="tpl-file" className={labelCls}>File Template (.docx) *</label>
                <input
                  id="tpl-file"
                  type="file"
                  name="file"
                  accept=".docx"
                  required
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
                />
                <p className="mt-1 text-[11px] text-slate-400">Format .docx, ukuran maksimal 5 MB.</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {saving ? 'Menyimpan…' : 'Simpan Template'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5">{sidePanel}</div>
        </div>
      )}

      {/* Tabel daftar template */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative mt-6">
        {loadingList && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Memuat daftar template...
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 border-b border-slate-100 font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide">
          Daftar Template Tersedia ({total} Master)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Kode</th>
                <th className="px-6 py-3.5">Nama Surat</th>
                <th className="px-6 py-3.5">Klasifikasi</th>
                <th className="px-6 py-3.5">File Template</th>
                {canManage && <th className="px-6 py-3.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-10 text-center text-slate-400 font-medium">
                    Belum ada template surat yang diunggah.
                  </td>
                </tr>
              ) : (
                items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{t.kode}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">{t.nama}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">{t.kodeKlasifikasi}</td>
                    <td className="px-6 py-3.5">
                      {t.filePath ? (
                        <a
                          href={t.filePath}
                          download
                          className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh Template (.docx)
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    {canManage && (
                      <td className="px-6 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setToDelete(t)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-3">
            <div className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
              Menampilkan halaman <span className="font-semibold text-slate-800">{page}</span> dari{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span> (Total{' '}
              <span className="font-semibold text-slate-800">{total}</span> data)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loadingList}
                className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition ${
                  page <= 1 || loadingList
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loadingList}
                className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition ${
                  page >= totalPages || loadingList
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs'
                }`}
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Konfirmasi hapus */}
      {toDelete && (
        <ConfirmDeleteDialog
          item={toDelete}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Notifikasi */}
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          )}
          <p className="flex-1 text-sm text-slate-800">{message.text}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Tutup notifikasi"
            className="shrink-0 rounded text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}