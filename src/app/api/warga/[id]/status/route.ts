import { NextResponse } from 'next/server'
import { getWargaScope } from '@/lib/warga-scope'
import { updateStatusWargaAction } from '@/app/dashboard/warga/actions'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Jalur API untuk ubah status warga. Semua pemeriksaan (login, peran, dusun, validasi)
// memakai logika yang SAMA dengan server action di dashboard/warga/actions.ts,
// jadi tidak ada dua jalur dengan aturan berbeda.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getWargaScope()
  if (!scope.ok) {
    return NextResponse.json({ error: scope.message }, { status: scope.status, headers: NO_STORE })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Isi permintaan tidak valid.' }, { status: 400, headers: NO_STORE })
  }

  const { id } = await params
  const statusWarga = String(body?.statusWarga ?? '')

  // Petakan field JSON lama ke format yang dipakai server action
  const fd = new FormData()
  fd.set('id', id)
  fd.set('statusWarga', statusWarga)
  fd.set('tanggalMeninggal', String(body?.tanggalMeninggal ?? ''))
  fd.set('tanggalPindah', String(body?.tanggalPindah ?? ''))
  fd.set('keterangan', String((statusWarga === 'MENINGGAL' ? body?.sebabMeninggal : body?.alamatTujuan) ?? ''))
  fd.set('alasanPindah', String(body?.alasanPindah ?? ''))

  const result = await updateStatusWargaAction(fd)
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400, headers: NO_STORE })
  }
  return NextResponse.json({ success: true, message: result.message }, { headers: NO_STORE })
}