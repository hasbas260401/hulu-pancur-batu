import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Semua aksi keamanan memakai awalan ini. Halaman Audit Log memakai awalan
 * tersebut (plus beberapa aksi lama) untuk menandai baris mencurigakan tanpa
 * perlu mengubah skema database.
 */
export const PREFIX_AKSI_KEAMANAN = 'SECURITY_'

/** Aksi lama yang tetap dianggap sebagai percobaan mencurigakan. */
export const AKSI_MENCURIGAKAN_TAMBAHAN = ['RESET_DB_GAGAL'] as const

export type TingkatKeamanan = 'PERINGATAN' | 'TINGGI' | 'KRITIS'

export function isAksiMencurigakan(aksi: string) {
  return (
    aksi.startsWith(PREFIX_AKSI_KEAMANAN) ||
    (AKSI_MENCURIGAKAN_TAMBAHAN as readonly string[]).includes(aksi)
  )
}

/**
 * Pola upaya injeksi / eksploitasi yang layak dicatat.
 *
 * Catatan: Prisma selalu memakai query berparameter, jadi pola ini bukan
 * pencegah utama. Pencatatan berguna sebagai sinyal keamanan agar admin bisa
 * melihat siapa yang mencoba mengirim payload berbahaya.
 */
const POLA_INJEKSI: { nama: string; pola: RegExp }[] = [
  { nama: 'SQL Injection', pola: /\b(union\s+(all\s+)?select|insert\s+into|drop\s+table|truncate\s+table|delete\s+from|alter\s+table)\b/i },
  { nama: 'SQL Tautology', pola: /(['"]\s*(or|and)\s*['"]?\s*\d+['"]?\s*=\s*['"]?\s*\d+|'\s*or\s*'1'\s*=\s*'1)/i },
  { nama: 'XSS / Script Injection', pola: /(<script|javascript\s*:|on(error|load|click|mouseover)\s*=|<iframe|<svg[^>]*onload)/i },
  { nama: 'Path Traversal', pola: /(\.\.[/\\]|%2e%2e%2f|%2e%2e%5c)/i },
  { nama: 'Command Injection', pola: /(;\s*(cat|ls|rm|curl|wget|sh|bash|cmd|powershell)\b|\|\s*(cat|ls|rm|curl|wget|sh|bash)\b|`[^`]+`|\$\([^)]+\))/i },
  { nama: 'Template Injection', pola: /(\{\{[\s\S]{0,80}\}\}|\$\{[\s\S]{0,80}\})/ },
  { nama: 'Encoded Payload', pola: /(%3cscript|%3c%2fscript|%00|%27\s*or\s*)/i },
]

export function deteksiPayloadMencurigakan(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const teks = value.slice(0, 4000)
  for (const { nama, pola } of POLA_INJEKSI) {
    if (pola.test(teks)) return nama
  }
  return null
}

/** Periksa seluruh nilai query string; kembalikan parameter pertama yang mencurigakan. */
export function periksaParameterMencurigakan(searchParams: URLSearchParams) {
  for (const [kunci, nilai] of searchParams.entries()) {
    const pola = deteksiPayloadMencurigakan(nilai)
    if (pola) return { parameter: kunci, pola }
  }
  return null
}

export function ipDariHeaders(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim()
  return ip || null
}

type KejadianKeamanan = {
  userId?: string | null
  aksi: string
  entitas?: string
  entitasId?: string | null
  detail?: Record<string, unknown>
  ip?: string | null
  tingkat?: TingkatKeamanan
}

/**
 * Catat kejadian keamanan ke AuditLog.
 *
 * Dibatasi maksimal 10 catatan per 10 menit untuk kombinasi aksi + IP + user,
 * supaya bot yang membanjiri endpoint tidak menghabiskan ruang database.
 * Kegagalan pencatatan tidak pernah menggagalkan permintaan utama.
 */
export async function catatKejadianKeamanan({
  userId = null,
  aksi,
  entitas = 'Keamanan',
  entitasId = null,
  detail = {},
  ip = null,
  tingkat = 'PERINGATAN',
}: KejadianKeamanan) {
  const kunci = `audit-sec:${aksi}:${ip ?? 'unknown'}:${userId ?? '-'}`
  if (!rateLimit(kunci, 10, 10 * 60 * 1000).ok) return

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        aksi,
        entitas,
        entitasId,
        detail: {
          ...detail,
          mencurigakan: true,
          tingkat,
        },
        ip,
      },
    })
  } catch (error) {
    console.error('Gagal mencatat kejadian keamanan:', error)
  }
}
