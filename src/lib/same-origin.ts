/**
 * Pemeriksaan origin sederhana untuk rute yang memakai cookie sesi.
 *
 * Cookie sesi NextAuth memakai SameSite=Lax sehingga browser tidak mengirimnya
 * pada permintaan lintas situs. Pemeriksaan ini menjadi lapisan tambahan:
 * bila header Origin ada, host-nya wajib sama dengan host permintaan.
 * Permintaan tanpa Origin (misalnya alat internal/klien non-browser) dibiarkan,
 * karena tidak membawa risiko CSRF berbasis browser.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true

  try {
    const originHost = new URL(origin).host
    const requestHost = req.headers.get('x-forwarded-host') || req.headers.get('host')
    return !!requestHost && originHost === requestHost
  } catch {
    return false
  }
}

export function forbiddenOriginResponse() {
  return new Response(JSON.stringify({ error: 'Permintaan ditolak: origin tidak valid.' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
