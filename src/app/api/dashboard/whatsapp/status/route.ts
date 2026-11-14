import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getWhatsAppConfig } from '@/lib/whatsapp'
import { ambilStatusGateway } from '@/lib/whatsapp-gateway'
import { rateLimit } from '@/lib/rate-limit'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * GET /api/dashboard/whatsapp/status
 *
 * Proxy status gateway untuk halaman /dashboard/whatsapp. Hanya ADMIN.
 * Dipanggil berkala oleh browser (polling) sehingga tidak perlu reload halaman.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.message },
      { status: admin.status, headers: NO_STORE }
    )
  }

  // Polling normal ±30 permintaan/menit. Batas ini mencegah penyalahgunaan.
  const limit = rateLimit(`wa-gateway-status:${admin.userId}`, 120, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan status. Coba lagi dalam ${limit.retryAfterSec} detik.` },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  const config = await getWhatsAppConfig()
  const status = await ambilStatusGateway(config)

  return NextResponse.json(status, { headers: NO_STORE })
}
