import { Suspense } from 'react'
import { PrismaClient } from '@prisma/client'
import ProgramBantuanClient from './ProgramBantuanClient'

const prisma = new PrismaClient()

export const metadata = {
  title: 'Program Bantuan Sosial | Desa Hulu Pancur Batu',
  description:
    'Cek daftar penerima bantuan sosial Desa Hulu Pancur Batu: BLT, PKH, BPNT, PBI-JK, dan BST. Cari berdasarkan NIK atau jenis bantuan.',
}

export default function ProgramBantuanPage() {
  return (
    <Suspense fallback={<ProgramBantuanSkeleton />}>
      <ProgramBantuanContent />
    </Suspense>
  )
}

async function ProgramBantuanContent() {
  const settings = await prisma.webSettings.findFirst().catch(() => null)

  return (
    <ProgramBantuanClient
      namaDesa={settings?.namaDesa || 'Desa Hulu Pancur Batu'}
      sloganDesa={settings?.sloganDesa || 'Sistem Informasi Desa'}
      logoDesa={settings?.logoDesa || '/logo-desa.png'}
    />
  )
}

function ProgramBantuanSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50">
      <div className="h-16 border-b border-emerald-900/10 bg-white/80" />
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="h-4 w-40 animate-pulse rounded-full bg-emerald-900/10" />
        <div className="mt-5 h-10 w-full max-w-xl animate-pulse rounded-2xl bg-emerald-900/10" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded-full bg-emerald-900/10" />
        <div className="mt-10 h-28 animate-pulse rounded-2xl bg-white/70" />
      </div>
    </div>
  )
}
