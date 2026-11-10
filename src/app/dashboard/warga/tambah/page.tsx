import { PrismaClient } from '@prisma/client'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { getWargaScope } from '@/lib/warga-scope'
import TambahWargaForm from './TambahWargaForm'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default function TambahWargaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat formulir...</span>
          </div>
        </div>
      }
    >
      <TambahWargaContent />
    </Suspense>
  )
}

async function TambahWargaContent() {
  await connection()

  // Wajib ADMIN, atau KADUS berizin 'warga'
  const scope = await getWargaScope()
  if (!scope.ok) {
    if (scope.status === 401) redirect('/login')
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Akses ditolak</h1>
        <p className="mt-1 text-sm text-slate-500">{scope.message}</p>
      </div>
    )
  }

  // KADUS hanya melihat dusunnya sendiri di pilihan wilayah
  const lockedDusunId = scope.dusunFilter.dusunId ?? null
  const dusunList = await prisma.dusun.findMany({
    where: lockedDusunId ? { id: lockedDusunId } : {},
    orderBy: { nomor: 'asc' },
    select: { id: true, nama: true },
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tambah Data Warga Baru</h1>
          <p className="text-sm text-slate-500">Masukkan informasi kependudukan warga desa.</p>
        </div>
        <Link
          href="/dashboard/warga"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>
      </div>

      <TambahWargaForm dusunList={dusunList} lockedDusunId={lockedDusunId} />
    </div>
  )
}