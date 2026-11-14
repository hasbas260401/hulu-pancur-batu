import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getWhatsAppConfig, maskToken } from '@/lib/whatsapp'
import { gatewayBaseUrl } from '@/lib/whatsapp-gateway'
import AuditLogPanel from '../audit-log/AuditLogPanel'
import { ambilDataAudit, type AuditLogSearchParams } from '../audit-log/data'
import SettingsClient from './SettingsClient'

type SettingsTab =
  | 'password'
  | 'email'
  | 'phone'
  | 'sessions'
  | 'api'
  | 'whatsapp'
  | 'audit'
  | 'advanced'

const TAB_ADMIN: SettingsTab[] = ['api', 'whatsapp', 'audit', 'advanced']
const TAB_USER: SettingsTab[] = ['password', 'email', 'phone', 'sessions']

function tentukanTabAwal(value: string | undefined, isAdmin: boolean): SettingsTab {
  const valid = isAdmin ? [...TAB_USER, ...TAB_ADMIN] : TAB_USER
  return value && (valid as string[]).includes(value) ? (value as SettingsTab) : 'password'
}

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
async function SettingsData({
  searchParams,
}: {
  searchParams: Promise<AuditLogSearchParams & { tab?: string }>
}) {
  const params = await searchParams
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  const currentSessionId = (session?.user as any)?.sessionId as string | undefined

  if (!userId) redirect('/login')

  const [rows, me] = await Promise.all([
    prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
    // Role & status akun dicek dari database, bukan dari token login
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, statusAkun: true } }),
  ])

  const isAdmin = me?.role === 'ADMIN'

  // Warga dengan akun PENDING tidak boleh mengakses Pengaturan Akun. Guard ini
  // mencegah bypass dengan mengetik URL langsung, bukan sekadar menyembunyikan menu.
  const statusAkun = String(me?.statusAkun || 'ACTIVE').toUpperCase()
  if (me?.role === 'WARGA' && statusAkun !== 'AKTIF' && statusAkun !== 'ACTIVE') {
    redirect('/dashboard/warga-home?locked=settings')
  }

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

  // Tombol reset hanya tersedia saat development, atau di produksi bila
  // ALLOW_DB_RESET=true sengaja dinyalakan (rute API memeriksa hal yang sama).
  const resetEnabled = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DB_RESET === 'true'

  // Status integrasi WhatsApp Gateway (dibaca dari database, token disamarkan).
  const waConfig = await getWhatsAppConfig()

  // Tab awal mengikuti query (?tab=...) agar filter Audit Log tetap berada di
  // dalam Pengaturan. Tab khusus admin diabaikan untuk pengguna non-admin.
  const initialTab = tentukanTabAwal(params.tab, isAdmin)

  // Data Audit Log hanya diambil untuk ADMIN dan langsung dirender sebagai
  // Server Component yang ditanam di tab Audit Log.
  const auditData = isAdmin
    ? await ambilDataAudit({ q: params.q, jenis: params.jenis, page: params.page })
    : null

  return (
    <SettingsClient
      sessions={sessions}
      isAdmin={isAdmin}
      apiKeys={apiKeys}
      resetEnabled={resetEnabled}
      initialTab={initialTab}
      waConfig={{
        enabled: waConfig.enabled,
        apiUrl: waConfig.apiUrl,
        senderNumber: waConfig.senderNumber,
        format: waConfig.format,
        authType: waConfig.authType,
        hasToken: Boolean(waConfig.token),
        tokenMasked: maskToken(waConfig.token),
        gatewayUrl: gatewayBaseUrl(waConfig.apiUrl),
      }}
      auditPanel={
        auditData ? (
          <AuditLogPanel
            data={auditData}
            basePath="/dashboard/settings"
            tab="audit"
            embedded
          />
        ) : null
      }
    />
  )
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<AuditLogSearchParams & { tab?: string }>
}) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData searchParams={searchParams} />
    </Suspense>
  )
}