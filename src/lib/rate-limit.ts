// Pembatas permintaan sederhana (di memori server). Cukup untuk satu server/instance;
// bila nanti dijalankan di banyak instance, pindahkan ke Redis/database.
type Bucket = { count: number; resetAt: number }

const g = globalThis as unknown as { __rateLimit?: Map<string, Bucket> }
const store = g.__rateLimit ?? (g.__rateLimit = new Map<string, Bucket>())

/** Izinkan maksimal `max` permintaan per `windowMs` untuk satu `key`. */
export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()

  // Bersihkan entri kedaluwarsa agar memori tidak membengkak
  if (store.size > 5000) {
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k)
  }

  const bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  if (bucket.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  bucket.count++
  return { ok: true, retryAfterSec: 0 }
}

/** Alamat IP pemanggil. (Header ini dapat dipalsukan bila server diakses langsung tanpa proxy;
 *  karena itu batas per-NIK/per-email juga dipasang terpisah.) */
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}
