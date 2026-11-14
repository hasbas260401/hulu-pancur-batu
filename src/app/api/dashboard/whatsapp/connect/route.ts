import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getWhatsAppConfig } from '@/lib/whatsapp'
import {
  catatAuditGateway,
  gatewayBaseUrl,
  hubungkanGateway,
} from '@/lib/whatsapp-gateway'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { isSameOrigin, forbiddenOriginResponse } from '@/lib/same-origin'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * POST /api/dashboard/whatsapp/connect
 *
 * Menyambungkan ulang gateway. Bila sesi sudah logout, gateway akan membuat
 * sesi baru dan menampilkan QR baru. Body opsional: { reset: true } untuk
 * memaksa sesi baru (QR baru) meskipun kredensial lama masih tersimpan.
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

  const limit = rateLimit(`wa-gateway-connect:${admin.userId}`, 5, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSec} detik.`,
      },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  const body = await req.json().catch(() => null)
  const reset = body?.reset === true

  const config = await getWhatsAppConfig()
  const hasil = await hubungkanGateway(config, reset)

  await catatAuditGateway({
    userId: admin.userId,
    aksi: 'HUBUNGKAN_WA_GATEWAY',
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
