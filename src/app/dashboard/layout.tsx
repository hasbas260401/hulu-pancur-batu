import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import DashboardClientLayout from './DashboardClientLayout'
import SessionGuard from './SessionGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900 text-white text-xs font-semibold">Memuat Dashboard...</div>}>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  )
}

async function DashboardContent({
  children,
}: {
  children: React.ReactNode
}) {
  // Menggunakan connection() resmi Next.js untuk menandai rute dinamis tanpa konflik cacheComponents
  await connection()

  const session = await auth()
  const user = session?.user as any

  // Tanpa sesi yang valid: jangan render dashboard sama sekali
  // (sebelumnya tampil dengan peran cadangan "WARGA" dan menu kosong)
  if (!user) redirect('/login')

  const role = user.role as string
  const statusAkun = (user.statusAkun as string) || 'ACTIVE'

  // Notifikasi surat masuk yang belum diproses. Hanya dihitung untuk petugas
  // yang memang berwenang (ADMIN, atau KADUS dengan izin menu surat), dan
  // dibatasi ke dusun penugasannya agar tidak membocorkan data dusun lain.
  const canProcessSurat =
    role === 'ADMIN' ||
    (role === 'KADUS' && Array.isArray(user.permissions) && user.permissions.includes('surat'))

  const suratMasukCount = canProcessSurat
    ? await prisma.pengajuanSurat.count({
        where: {
          status: 'DIAJUKAN',
          ...(role === 'KADUS' && user.dusunId ? { dusunId: user.dusunId as number } : {}),
        },
      })
    : 0

  return (
    <DashboardClientLayout
      user={user}
      statusAkun={statusAkun}
      suratMasukCount={suratMasukCount}
    >
      <SessionGuard />
      {children}
    </DashboardClientLayout>
  )
}