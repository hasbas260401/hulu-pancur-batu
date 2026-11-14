import { redirect } from 'next/navigation'

/**
 * Audit Log kini menjadi tab di dalam Pengaturan Akun (satu pintu).
 * Rute lama tetap dipertahankan sebagai pengalihan agar tautan/bookmark
 * lama tidak berakhir 404.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; jenis?: string; page?: string }>
}) {
  const params = await searchParams
  const sp = new URLSearchParams()
  sp.set('tab', 'audit')
  if (params.q) sp.set('q', params.q)
  if (params.jenis === 'mencurigakan') sp.set('jenis', 'mencurigakan')
  if (params.page) sp.set('page', params.page)

  redirect(`/dashboard/settings?${sp.toString()}`)
}
