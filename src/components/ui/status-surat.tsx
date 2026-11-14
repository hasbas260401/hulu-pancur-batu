'use client'

import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react'

/**
 * Badge status pengajuan surat, dipakai bersama oleh portal warga dan panel
 * admin agar label/ikon/warna selalu konsisten.
 */
export function StatusSuratBadge({ status }: { status: string }) {
  const base = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold'
  switch (status) {
    case 'DIAJUKAN':
      return (
        <span className={`${base} bg-amber-100 text-amber-700`}>
          <Clock3 className="h-3 w-3" /> Pending
        </span>
      )
    case 'DIVERIFIKASI':
      return (
        <span className={`${base} bg-sky-100 text-sky-700`}>
          <Loader2 className="h-3 w-3" /> Proses
        </span>
      )
    case 'SELESAI':
      return (
        <span className={`${base} bg-emerald-100 text-emerald-700`}>
          <CheckCircle2 className="h-3 w-3" /> Selesai
        </span>
      )
    case 'DITOLAK':
      return (
        <span className={`${base} bg-rose-100 text-rose-700`}>
          <XCircle className="h-3 w-3" /> Ditolak
        </span>
      )
    default:
      return <span className={`${base} bg-slate-100 text-slate-600`}>{status}</span>
  }
}

export const LABEL_STATUS_SURAT: Record<string, string> = {
  DIAJUKAN: 'Pending',
  DIVERIFIKASI: 'Proses',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
}
