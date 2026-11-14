import { prisma } from '@/lib/prisma'
import type { WhatsAppConfig } from '@/lib/whatsapp'

/**
 * Integrasi pemantauan WhatsApp Gateway (Baileys / api-WAHA).
 *
 * Halaman /dashboard/whatsapp memakai API route Next.js sebagai perantara.
 * Browser tidak memanggil gateway secara langsung karena:
 * - token gateway tidak boleh bocor ke browser;
 * - Content-Security-Policy aplikasi membatasi `connect-src` ke origin sendiri.
 *
 * Gateway yang dipantau adalah gateway lokal api-WAHA yang menyediakan:
 * - GET  /api/status
 * - POST /api/logout
 * - POST /api/connect
 *
 * Alamat gateway diturunkan dari origin `apiUrl` yang tersimpan di database.
 * Contoh: http://localhost:3001/api/sendText -> http://localhost:3001
 */

export type WhatsAppGatewayPhase =
  | 'starting'
  | 'connecting'
  | 'qr'
  | 'connected'
  | 'disconnected'
  | 'logged_out'
  | 'unknown'

export type WhatsAppGatewayStatus = {
  /** Gateway berhasil dihubungi dan mengembalikan status yang bisa dibaca. */
  ok: boolean
  /** Server gateway merespons (belum tentu endpoint pemantauan didukung). */
  reachable: boolean
  /** Endpoint /api/status tersedia (gateway api-WAHA versi terbaru). */
  supported: boolean
  connected: boolean
  state: WhatsAppGatewayPhase
  phoneNumber: string | null
  pushName: string | null
  qr: string | null
  qrDataUrl: string | null
  qrUpdatedAt: string | null
  qrExpiresAt: string | null
  connectedAt: string | null
  lastDisconnectReason: string | null
  /** Alamat dasar gateway yang dipakai server SIDU (bukan rahasia). */
  gatewayUrl: string | null
  checkedAt: string
  latencyMs: number | null
  error: string | null
}

export type WhatsAppGatewayActionResult = {
  ok: boolean
  message: string
}

const STATUS_TIMEOUT_MS = 6_000
const ACTION_TIMEOUT_MS = 20_000
const PHASES: WhatsAppGatewayPhase[] = [
  'starting',
  'connecting',
  'qr',
  'connected',
  'disconnected',
  'logged_out',
]

/**
 * Alamat dasar gateway dari API URL yang dipakai untuk mengirim pesan.
 * Hanya origin yang dipakai agar path pengiriman (mis. /api/sendText atau
 * /send milik Fonnte) tidak ikut terbawa.
 */
export function gatewayBaseUrl(apiUrl: string | null | undefined): string | null {
  if (!apiUrl) return null
  try {
    const url = new URL(apiUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

function statusDasar(
  gatewayUrl: string | null,
  error: string,
  extra: Partial<WhatsAppGatewayStatus> = {}
): WhatsAppGatewayStatus {
  return {
    ok: false,
    reachable: false,
    supported: false,
    connected: false,
    state: 'unknown',
    phoneNumber: null,
    pushName: null,
    qr: null,
    qrDataUrl: null,
    qrUpdatedAt: null,
    qrExpiresAt: null,
    connectedAt: null,
    lastDisconnectReason: null,
    gatewayUrl,
    checkedAt: new Date().toISOString(),
    latencyMs: null,
    error,
    ...extra,
  }
}

function pesanGagalJaringan(error: any, timeoutMs: number): string {
  if (error?.name === 'AbortError') {
    return `Gateway tidak merespons dalam ${Math.round(timeoutMs / 1000)} detik. Pastikan server gateway berjalan.`
  }

  const kode = error?.cause?.code as string | undefined
  if (kode === 'ECONNREFUSED') {
    return 'Koneksi ke gateway ditolak (ECONNREFUSED). Pastikan server api-WAHA sudah dijalankan.'
  }
  if (kode === 'ENOTFOUND') {
    return 'Alamat gateway tidak ditemukan (ENOTFOUND). Periksa kembali API URL di Pengaturan WhatsApp.'
  }
  if (kode === 'ECONNRESET') {
    return 'Koneksi ke gateway terputus (ECONNRESET). Coba muat ulang status beberapa saat lagi.'
  }
  if (kode === 'ETIMEDOUT' || kode === 'UND_ERR_CONNECT_TIMEOUT') {
    return 'Waktu koneksi ke gateway habis. Periksa jaringan dan pastikan gateway dapat dijangkau server SIDU.'
  }

  return 'Gagal menghubungi gateway WhatsApp. Periksa API URL dan pastikan server gateway berjalan.'
}

function pesanHttp(status: number, data: any): string {
  if (status === 401 || status === 403) {
    return 'Token gateway ditolak. Samakan Token / API Key di Pengaturan WhatsApp dengan API_SECRET_TOKEN pada server gateway.'
  }
  if (status === 404) {
    return 'Gateway tidak menyediakan endpoint pemantauan. Perbarui server api-WAHA ke versi yang mendukung /api/status.'
  }
  const rincian = typeof data?.error === 'string' ? ` ${data.error}` : ''
  return `Gateway membalas HTTP ${status}.${rincian}`
}

function teksTerbatas(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const teks = value.trim()
  if (!teks) return null
  return teks.slice(0, max)
}

function normalisasiQrDataUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('data:image/')) return null
  // Batasi ukuran agar respons gateway yang aneh tidak membanjiri browser.
  if (value.length > 500_000) return null
  return value
}

function normalisasiPhase(value: unknown, connected: boolean): WhatsAppGatewayPhase {
  if (typeof value === 'string' && (PHASES as string[]).includes(value)) {
    return value as WhatsAppGatewayPhase
  }
  return connected ? 'connected' : 'unknown'
}

/** Ambil status koneksi + QR dari gateway. Tidak pernah melempar error. */
export async function ambilStatusGateway(
  config: WhatsAppConfig
): Promise<WhatsAppGatewayStatus> {
  const base = gatewayBaseUrl(config.apiUrl)
  if (!base) {
    return statusDasar(
      null,
      'API URL gateway tidak valid. Periksa pengaturan WhatsApp Gateway terlebih dahulu.'
    )
  }

  const token = config.token?.replace(/[\r\n\t]+/g, ' ').trim()
  if (!token) {
    return statusDasar(
      base,
      'Token gateway belum diatur. Isi Token / API Key di Pengaturan Akun → WhatsApp Gateway.'
    )
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS)

  try {
    const res = await fetch(`${base}/api/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'SIDU-WhatsApp-Monitor/1.0',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    const latencyMs = Date.now() - startedAt
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return statusDasar(base, pesanHttp(res.status, data), {
        // Server merespons, jadi gateway sebenarnya terjangkau. Status ini
        // membedakan masalah jaringan dari masalah konfigurasi/endpoint.
        reachable: true,
        latencyMs,
      })
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return statusDasar(base, 'Respons gateway tidak dikenali (bukan JSON objek).', {
        reachable: true,
        latencyMs,
      })
    }

    const connected = data.connected === true
    const phone = String(data.phoneNumber ?? '').replace(/\D/g, '')

    return {
      ok: true,
      reachable: true,
      supported: true,
      connected,
      state: normalisasiPhase(data.state, connected),
      phoneNumber: phone.length >= 8 ? phone.slice(0, 20) : null,
      pushName: teksTerbatas(data.pushName, 120),
      qr: teksTerbatas(data.qr, 4_000),
      qrDataUrl: normalisasiQrDataUrl(data.qrDataUrl),
      qrUpdatedAt: teksTerbatas(data.qrUpdatedAt, 40),
      qrExpiresAt: teksTerbatas(data.qrExpiresAt, 40),
      connectedAt: teksTerbatas(data.connectedAt, 40),
      lastDisconnectReason: teksTerbatas(data.lastDisconnectReason, 300),
      gatewayUrl: base,
      checkedAt: new Date().toISOString(),
      latencyMs,
      error: null,
    }
  } catch (error) {
    return statusDasar(base, pesanGagalJaringan(error, STATUS_TIMEOUT_MS), {
      latencyMs: Date.now() - startedAt,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function aksiGateway(
  config: WhatsAppConfig,
  path: '/api/logout' | '/api/connect',
  body?: Record<string, unknown>
): Promise<WhatsAppGatewayActionResult> {
  const base = gatewayBaseUrl(config.apiUrl)
  if (!base) {
    return {
      ok: false,
      message: 'API URL gateway tidak valid. Periksa pengaturan WhatsApp Gateway terlebih dahulu.',
    }
  }

  const token = config.token?.replace(/[\r\n\t]+/g, ' ').trim()
  if (!token) {
    return {
      ok: false,
      message: 'Token gateway belum diatur. Isi Token / API Key di Pengaturan WhatsApp Gateway.',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS)

  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'SIDU-WhatsApp-Monitor/1.0',
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return { ok: false, message: pesanHttp(res.status, data) }
    }

    return {
      ok: true,
      message:
        typeof data?.message === 'string' && data.message.trim()
          ? data.message.trim().slice(0, 300)
          : path === '/api/logout'
            ? 'Koneksi WhatsApp berhasil diputus.'
            : 'Permintaan koneksi WhatsApp dikirim.',
    }
  } catch (error) {
    return { ok: false, message: pesanGagalJaringan(error, ACTION_TIMEOUT_MS) }
  } finally {
    clearTimeout(timer)
  }
}

/** Putuskan koneksi WhatsApp / logout perangkat. */
export function putuskanKoneksiGateway(
  config: WhatsAppConfig
): Promise<WhatsAppGatewayActionResult> {
  return aksiGateway(config, '/api/logout')
}

/** Sambungkan ulang gateway (atau mulai sesi baru bila sudah logout). */
export function hubungkanGateway(
  config: WhatsAppConfig,
  reset = false
): Promise<WhatsAppGatewayActionResult> {
  return aksiGateway(config, '/api/connect', reset ? { reset: true } : undefined)
}

/** Catat aksi admin ke AuditLog tanpa menggagalkan permintaan utama. */
export async function catatAuditGateway(input: {
  userId: string
  aksi: 'PUTUSKAN_WA_GATEWAY' | 'HUBUNGKAN_WA_GATEWAY'
  berhasil: boolean
  pesan: string
  gatewayUrl: string | null
  ip: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        aksi: input.aksi,
        entitas: 'WhatsAppGateway',
        entitasId: '1',
        detail: {
          berhasil: input.berhasil,
          pesan: input.pesan,
          gateway: input.gatewayUrl,
        },
        ip: input.ip,
      },
    })
  } catch (error) {
    console.error('Gagal mencatat audit log WhatsApp Gateway:', error)
  }
}
