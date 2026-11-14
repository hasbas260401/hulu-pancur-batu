import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { IdCard } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getWargaAccount } from '@/lib/warga-account'
import WargaSuratClient from './WargaSuratClient'
import { ajukanSuratAction } from './actions'

export default function WargaSuratPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] w-full items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Memuat layanan surat...</span>
          </div>
        </div>
      }
    >
      <WargaSuratContent />
    </Suspense>
  )
}

async function WargaSuratContent() {
  await connection()

  const account = await getWargaAccount()
  if (!account) redirect('/login')
  if (account.role !== 'WARGA') redirect('/dashboard')
  if (!account.isActive) redirect('/dashboard/warga-home?locked=surat')

  if (!account.wargaId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <IdCard className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Akun belum terhubung ke data warga</h1>
        <p className="mt-1 text-sm text-slate-500">
          Silakan hubungi Administrator atau Kepala Dusun untuk menautkan NIK Anda ke akun ini.
        </p>
      </div>
    )
  }

  const [templates, pengajuan] = await Promise.all([
    prisma.templateSurat.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
      select: { id: true, kode: true, nama: true },
    }),
    prisma.pengajuanSurat.findMany({
      where: { wargaId: account.wargaId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        keperluan: true,
        catatan: true,
        nomorSurat: true,
        createdAt: true,
        updatedAt: true,
        template: { select: { nama: true, kode: true } },
      },
    }),
  ])

  const riwayat = pengajuan.map((p) => ({
    id: p.id,
    status: p.status as string,
    keperluan: p.keperluan,
    catatan: p.catatan,
    nomorSurat: p.nomorSurat,
    jenis: p.template?.nama ?? 'Surat Keterangan',
    kode: p.template?.kode ?? '-',
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <WargaSuratClient
      templates={templates}
      riwayat={riwayat}
      ajukanAction={ajukanSuratAction}
    />
  )
}
