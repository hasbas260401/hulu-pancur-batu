import { auth } from '@/auth'
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

  return (
    <DashboardClientLayout user={user}>
      <SessionGuard />
      {children}
    </DashboardClientLayout>
  )
}