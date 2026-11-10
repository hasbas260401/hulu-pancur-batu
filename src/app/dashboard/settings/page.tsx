import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/auth'
import SettingsClient from './SettingsClient'

const prisma = new PrismaClient()

// Ubah user-agent mentah jadi nama yang mudah dibaca
function parseDevice(ua: string | null) {
  if (!ua) return 'Perangkat tidak diketahui'

  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
    ? 'Opera'
    : /Firefox\//.test(ua)
    ? 'Firefox'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Safari\//.test(ua)
    ? 'Safari'
    : 'Browser'

  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
    ? 'iPhone'
    : /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
    ? 'macOS'
    : /Linux/.test(ua)
    ? 'Linux'
    : 'Lainnya'

  return `${browser} (${os})`
}

// Tampilan sementara saat data sedang dimuat
function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-6 w-64 bg-slate-200 rounded" />
      <div className="h-4 w-96 max-w-full bg-slate-200 rounded" />
      <div className="h-10 w-full bg-slate-100 rounded" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  )
}

// Komponen yang mengambil data (auth + database) — dibungkus Suspense di bawah
async function SettingsData() {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  const currentSessionId = (session?.user as any)?.sessionId as string | undefined

  if (!userId) redirect('/login')

  const [rows, me] = await Promise.all([
    prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
    // Role dicek dari database, bukan dari token login
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ])

  const isAdmin = me?.role === 'ADMIN'

  // Data API key hanya diambil untuk ADMIN. Yang dikirim ke browser hanya info
  // non-rahasia (awalan key, status, waktu pakai) — hash tidak pernah dikirim.
  const keyRows = isAdmin
    ? await prisma.apiKey.findMany({
        select: { jenis: true, keyPrefix: true, isActive: true, lastUsedAt: true },
      })
    : []

  const sessions = rows.map((s) => ({
    id: s.id,
    device: parseDevice(s.userAgent),
    ip: s.ipAddress || '-',
    isCurrent: s.id === currentSessionId,
    loginAt: s.createdAt.toISOString(),
  }))

  const apiKeys = keyRows.map((k) => ({
    jenis: k.jenis,
    keyPrefix: k.keyPrefix,
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
  }))

  return <SettingsClient sessions={sessions} isAdmin={isAdmin} apiKeys={apiKeys} />
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData />
    </Suspense>
  )
}