'use client'

import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { useSuratPendingCount } from '@/lib/use-surat-pending-count'

/**
 * Banner notifikasi surat masuk yang memperbarui angkanya otomatis lewat
 * polling, tanpa perlu refresh browser.
 */
export default function SuratPendingBanner({ initialCount }: { initialCount: number }) {
  const { count } = useSuratPendingCount(initialCount)

  if (count <= 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Inbox className="h-5 w-5" />
        </div>
        <div className="text-xs leading-relaxed">
          <p className="text-sm font-bold">
            {count} permohonan surat warga menunggu diproses
          </p>
          <p className="mt-0.5 text-amber-800">
            Buka menu Surat-Menyurat → Riwayat Surat, lalu tekan tombol Proses &amp; Buat Surat
            untuk memproses permohonan.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/surat/riwayat?status=DIAJUKAN"
        className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
      >
        Lihat Permohonan
      </Link>
    </div>
  )
}
