'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import {
  CheckCircle2,
  Clock3,
  FilePlus,
  FileText,
  History,
  Loader2,
  Mail,
  XCircle,
} from 'lucide-react'
import { useAlert } from '@/components/ui/alert'
import { StatusSuratBadge } from '@/components/ui/status-surat'
import { formatTanggalSingkat } from '@/lib/warga-format'
import type { AjukanSuratResult } from './actions'

type Template = { id: string; kode: string; nama: string }

type Riwayat = {
  id: string
  status: string
  keperluan: string
  catatan: string | null
  nomorSurat: string | null
  jenis: string
  kode: string
  createdAt: string
  updatedAt: string
}

type FilterStatus = 'SEMUA' | 'DIAJUKAN' | 'DIVERIFIKASI' | 'SELESAI' | 'DITOLAK'

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'SEMUA', label: 'Semua' },
  { id: 'DIAJUKAN', label: 'Pending' },
  { id: 'DIVERIFIKASI', label: 'Proses' },
  { id: 'SELESAI', label: 'Selesai' },
  { id: 'DITOLAK', label: 'Ditolak' },
]

export default function WargaSuratClient({
  templates,
  riwayat,
  ajukanAction,
}: {
  templates: Template[]
  riwayat: Riwayat[]
  ajukanAction: (formData: FormData) => Promise<AjukanSuratResult>
}) {
  const alert = useAlert()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<FilterStatus>('SEMUA')

  const counts = useMemo(() => {
    const tally: Record<FilterStatus, number> = {
      SEMUA: riwayat.length,
      DIAJUKAN: 0,
      DIVERIFIKASI: 0,
      SELESAI: 0,
      DITOLAK: 0,
    }
    for (const item of riwayat) {
      const key = item.status as FilterStatus
      if (key in tally) tally[key] += 1
    }
    return tally
  }, [riwayat])

  const filtered = useMemo(
    () => (filter === 'SEMUA' ? riwayat : riwayat.filter((r) => r.status === filter)),
    [filter, riwayat]
  )

  const aktifCount = counts.DIAJUKAN + counts.DIVERIFIKASI

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await ajukanAction(formData)
      if (result.success) {
        formRef.current?.reset()
        await alert.success('Pengajuan Terkirim', result.message)
      } else {
        await alert.error('Gagal Mengajukan', result.message)
      }
    })
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Layanan Surat Warga</h1>
        <p className="text-xs text-slate-500 sm:text-sm">
          Ajukan permohonan surat keterangan desa dan pantau status pengajuannya secara langsung.
        </p>
      </div>

      {/* Ringkasan status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RingkasanCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Pending"
          value={counts.DIAJUKAN}
          tone="amber"
        />
        <RingkasanCard
          icon={<Loader2 className="h-4 w-4" />}
          label="Proses"
          value={counts.DIVERIFIKASI}
          tone="sky"
        />
        <RingkasanCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Selesai"
          value={counts.SELESAI}
          tone="emerald"
        />
        <RingkasanCard
          icon={<XCircle className="h-4 w-4" />}
          label="Ditolak"
          value={counts.DITOLAK}
          tone="rose"
        />
      </div>

      {/* Formulir pengajuan */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <FilePlus className="h-4 w-4 text-emerald-600" />
            <span>Ajukan Surat Baru</span>
          </h2>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {aktifCount}/3 pengajuan aktif
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada jenis surat yang tersedia saat ini. Silakan hubungi Administrator desa.
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="templateId" className="text-xs font-semibold text-slate-600">
                  Jenis Surat <span className="text-rose-500">*</span>
                </label>
                <select
                  id="templateId"
                  name="templateId"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>
                    Pilih jenis surat...
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="keperluan" className="text-xs font-semibold text-slate-600">
                  Keperluan <span className="text-rose-500">*</span>
                </label>
                <input
                  id="keperluan"
                  name="keperluan"
                  type="text"
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="Contoh: Persyaratan pengajuan beasiswa anak"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-[11px] text-slate-400">
                Pengajuan akan diteruskan ke Admin/Kepala Dusun. Pastikan data kependudukan Anda sudah
                benar sebelum mengirim.
              </p>
              <button
                type="submit"
                disabled={isPending || aktifCount >= 3}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Riwayat pengajuan */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <History className="h-4 w-4 text-emerald-600" />
            <span>Riwayat Pengajuan Surat</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  filter === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {item.label}
                {counts[item.id] > 0 && <span className="ml-1 opacity-70">({counts[item.id]})</span>}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {riwayat.length === 0
              ? 'Anda belum pernah mengajukan surat.'
              : 'Tidak ada pengajuan pada filter ini.'}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-bold">Jenis Surat</th>
                  <th className="px-3 py-2 font-bold">Keperluan</th>
                  <th className="px-3 py-2 font-bold">Tanggal Pengajuan</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Catatan / No. Surat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 align-top last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-800">{item.jenis}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.kode}</p>
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-slate-500">
                      <span className="line-clamp-2">{item.keperluan}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                      {formatTanggalSingkat(item.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusSuratBadge status={item.status} />
                    </td>
                    <td className="max-w-[220px] px-3 py-3">
                      {item.nomorSurat && (
                        <p className="font-mono text-[11px] font-semibold text-slate-700">
                          {item.nomorSurat}
                        </p>
                      )}
                      {item.catatan ? (
                        <p
                          className={`mt-0.5 whitespace-pre-line text-[11px] leading-relaxed ${
                            item.status === 'DITOLAK'
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.catatan}
                        </p>
                      ) : null}
                      {!item.nomorSurat && !item.catatan && (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[11px] text-slate-400">
          Status diperbarui otomatis saat petugas desa memproses pengajuan Anda:{' '}
          <span className="font-semibold text-slate-500">Pending → Proses → Selesai</span>.
        </p>
      </div>
    </div>
  )
}

function RingkasanCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'amber' | 'sky' | 'emerald' | 'rose'
}) {
  const tones: Record<typeof tone, string> = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  }
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-extrabold text-slate-800">{value}</p>
    </div>
  )
}
