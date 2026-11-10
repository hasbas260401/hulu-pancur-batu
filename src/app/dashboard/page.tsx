import { PrismaClient } from '@prisma/client'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ResetDbModal from './ResetDbModal'
import DashboardClient from './DashboardClient'
import { Sparkles } from 'lucide-react'

const prisma = new PrismaClient()

export default function DashboardPage() {
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
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
  // Wajibkan Next.js merender halaman ini secara dinamis pada setiap request
  await connection()

  const session = await auth()
  
  if (!session || !session.user) {
    redirect('/login')
  }

  // Peran & dusun dibaca dari database (bukan dari token login),
  // agar perubahan penugasan oleh admin langsung berlaku
  const me = await prisma.user.findUnique({
    where: { id: (session.user as any).id as string },
    select: { role: true, dusunId: true, dusun: { select: { nama: true } } },
  })
  if (!me) redirect('/login')

  const user = {
    ...(session.user as any),
    role: me.role,
    dusunId: me.dusunId,
    dusunNama: me.dusun?.nama ?? null,
  }
  const role = me.role as string

  // Tombol "Kosongkan Database" hanya muncul saat development, atau di produksi bila
  // ALLOW_DB_RESET=true sengaja dinyalakan (rute /api/admin/reset-db memeriksa hal yang sama)
  const resetEnabled = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DB_RESET === 'true'

  // =========================================================
  // SOLUSI UTAMA: Jika role pengguna adalah WARGA,
  // langsung alihkan (redirect) ke halaman warga-home secara server-side!
  // =========================================================
  if (role === 'WARGA') {
    redirect('/dashboard/warga-home')
  }

  const isKadus = role === 'KADUS'
  const userDusunId = user.dusunId as number | null

  // Hanya ADMIN dan KADUS yang boleh melihat dashboard ini.
  // (sebelumnya peran apa pun selain KADUS otomatis dianggap admin)
  // KADUS tanpa dusun penugasan juga tidak boleh melihat data apa pun
  // (sebelumnya filter kosong berarti SEMUA data penduduk tampil).
  if ((role !== 'ADMIN' && role !== 'KADUS') || (isKadus && !userDusunId)) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Akses belum tersedia</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isKadus
            ? 'Akun Kadus Anda belum ditetapkan ke sebuah dusun. Silakan hubungi Administrator.'
            : 'Akun Anda tidak memiliki akses ke halaman ini. Silakan hubungi Administrator.'}
        </p>
      </div>
    )
  }

  // Filter wilayah
  const filterDusunWarga = isKadus && userDusunId ? { dusunId: userDusunId } : {}
  const filterDusunKK = isKadus && userDusunId ? { anggota: { some: { dusunId: userDusunId } } } : {}
  const filterDusunBansos = isKadus && userDusunId ? { warga: { dusunId: userDusunId } } : {}

  // PROMISE.ALL YANG DIOPTIMALKAN (PARALEL)
  const [
    totalWarga, 
    totalKK, 
    totalSurat, 
    totalDusun,
    totalLakiLaki,
    totalPerempuan,
    agamaIslam,
    agamaKristen,
    agamaKatolik,
    agamaHindu,
    agamaBuddha,
    agamaKonghucu,
    totalBansos,
    daftarDusun
  ] = await Promise.all([
    prisma.warga.count({ where: filterDusunWarga }),
    prisma.kartuKeluarga.count({ where: filterDusunKK }),
    prisma.pengajuanSurat ? prisma.pengajuanSurat.count() : Promise.resolve(0),
    prisma.dusun.count(),
    prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'LAKI_LAKI' as any } }).catch(() => 
      prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'L' as any } })
    ),
    prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'PEREMPUAN' as any } }).catch(() => 
      prisma.warga.count({ where: { ...filterDusunWarga, jenisKelamin: 'P' as any } })
    ),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Islam', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Kristen', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Katolik', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Hindu', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Buddha', mode: 'insensitive' } } }),
    prisma.warga.count({ where: { ...filterDusunWarga, agama: { equals: 'Konghucu', mode: 'insensitive' } } }),
    prisma.bansos ? prisma.bansos.count({
      where: { status: 'AKTIF', ...filterDusunBansos }
    }) : Promise.resolve(0),
    
    // Ambil daftar dusun beserta relasi warganya secara efisien
    role === 'ADMIN' ? prisma.dusun.findMany({
      include: {
        warga: {
          select: {
            id: true,
            jenisKelamin: true,
            agama: true,
            kkId: true,
            bansos: { select: { status: true } }
          }
        }
      },
      orderBy: { nama: 'asc' }
    }) : Promise.resolve([])
  ])

  const stats = {
    totalWarga,
    totalKK,
    totalSurat,
    totalDusun,
    totalLakiLaki,
    totalPerempuan,
    agamaIslam,
    agamaKristen,
    agamaKatolik,
    agamaHindu,
    agamaBuddha,
    agamaKonghucu,
    totalBansos
  }

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isKadus ? `Wilayah Kerja: ${user?.dusunNama || 'Dusun Anda'}` : 'Panel Kontrol Utama Desa'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Utama</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isKadus
              ? `Ringkasan data kependudukan dan statistik spesifik wilayah penugasan.`
              : 'Ringkasan data kependudukan menyeluruh dari Dusun I sampai Dusun V.'}
          </p>
        </div>

        {role === 'ADMIN' && resetEnabled && (
          <div>
            <ResetDbModal />
          </div>
        )}
      </div>

      {/* Render Komponen Interaktif (Grafik & Animasi Hitung) */}
      <DashboardClient 
        stats={stats} 
        daftarDusun={daftarDusun} 
        isKadus={isKadus} 
        user={user} 
      />
    </div>
  )
}