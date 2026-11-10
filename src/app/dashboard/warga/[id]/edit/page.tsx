import { PrismaClient } from '@prisma/client'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { getWargaScope } from '@/lib/warga-scope'
import EditWargaForm from './EditWargaForm' // Hapus formatTitleCase dari import ini jika ada

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default function EditWargaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat data...</span>
          </div>
        </div>
      }
    >
      <EditContent params={params} />
    </Suspense>
  )
}

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params

  // Wajib ADMIN, atau KADUS berizin 'warga' yang hanya boleh mengedit warga di dusunnya
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
  if (typeof id !== 'string' || id.length > 100) notFound()

  const warga = await prisma.warga.findFirst({
    where: { id, ...scope.dusunFilter },
    include: { kk: true },
  })
  if (!warga) notFound()

  // ADMIN memilih dari semua dusun; KADUS hanya melihat dusunnya sendiri
  const lockedDusunId = scope.dusunFilter.dusunId ?? null
  const dusunList = await prisma.dusun.findMany({
    where: lockedDusunId ? { id: lockedDusunId } : {},
    orderBy: { nomor: 'asc' },
    select: { id: true, nama: true },
  })

  // Hanya kolom yang dibutuhkan formulir yang dikirim ke browser
  const wargaForm = {
    id: warga.id,
    nik: warga.nik,
    nama: warga.nama,
    jenisKelamin: warga.jenisKelamin as string,
    dusunId: warga.dusunId,
    tempatLahir: warga.tempatLahir ?? '',
    agama: warga.agama ?? '',
    statusPerkawinan: warga.statusPerkawinan ?? '',
    hubunganKeluarga: warga.hubunganKeluarga ?? '',
    pekerjaan: warga.pekerjaan ?? '',
    noKk: warga.kk?.noKk ?? '',
    alamatKK: warga.kk?.alamat ?? '',
  }
  const tanggalLahirValue = warga.tanggalLahir ? new Date(warga.tanggalLahir).toISOString().split('T')[0] : ''

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Data Warga</h1>
          {/* Ubah baris ini agar tidak memanggil formatTitleCase di Server Component */}
          <p className="text-sm text-slate-500">Perbarui informasi data kependudukan untuk warga ini.</p>
        </div>
        <Link
          href={`/dashboard/warga/${warga.id}`}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          ← Batal
        </Link>
      </div>

      <EditWargaForm
        warga={wargaForm}
        tanggalLahirValue={tanggalLahirValue}
        dusunList={dusunList}
        lockedDusunId={lockedDusunId}
      />
    </div>
  )
}
