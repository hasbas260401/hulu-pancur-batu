import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getWhatsAppConfig } from '@/lib/whatsapp'
import {
  catatAuditGateway,
  gatewayBaseUrl,
  putuskanKoneksiGateway,
} from '@/lib/whatsapp-gateway'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { isSameOrigin, forbiddenOriginResponse } from '@/lib/same-origin'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * POST /api/dashboard/whatsapp/logout
 *
 * Memutus koneksi WhatsApp pada gateway. Hanya ADMIN dan hanya dari origin
 * aplikasi sendiri (cookie sesi + pemeriksaan Origin).
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOriginResponse()

  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, message: admin.message },
      { status: admin.status, headers: NO_STORE }
    )
  }

  const limit = rateLimit(`wa-gateway-logout:${admin.userId}`, 5, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSec} detik.`,
      },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  const config = await getWhatsAppConfig()
  const hasil = await putuskanKoneksiGateway(config)

  await catatAuditGateway({
    userId: admin.userId,
    aksi: 'PUTUSKAN_WA_GATEWAY',
    berhasil: hasil.ok,
    pesan: hasil.message,
    gatewayUrl: gatewayBaseUrl(config.apiUrl),
    ip: clientIp(req),
  })

  return NextResponse.json(hasil, {
    status: hasil.ok ? 200 : 502,
    headers: NO_STORE,
  })
}
