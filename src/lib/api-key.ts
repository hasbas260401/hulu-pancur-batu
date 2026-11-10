import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { PrismaClient, type ApiKeyJenis } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Hash SHA-256 (hex). Aman dipakai karena key berupa string acak berentropi tinggi. */
export function hashApiKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/** Buat API key baru. `key` hanya boleh ditampilkan SEKALI ke admin, lalu dibuang. */
export function generateApiKey() {
  const key = `sidu_${crypto.randomBytes(32).toString('base64url')}`
  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, 12), // contoh: "sidu_a1B2c3D"
  }
}

type VerifyResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

function fail(status: number, error: string): VerifyResult {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
  if (status === 401) headers['WWW-Authenticate'] = 'Bearer realm="api-desa"'
  return {
    ok: false,
    response: NextResponse.json({ error }, { status, headers }),
  }
}

/**
 * Ambil API key dari request. Dua cara yang didukung (pilih salah satu):
 *   x-api-key: <KEY>
 *   Authorization: Bearer <KEY>
 * Jika keduanya ada, x-api-key yang dipakai.
 */
export function readApiKey(headers: Headers): string | undefined {
  const direct = headers.get('x-api-key')?.trim()
  if (direct) return direct

  const bearer = headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  return bearer ? bearer[1].trim() : undefined
}

/**
 * Validasi API key (header `x-api-key` atau `Authorization: Bearer`) untuk satu jenis data.
 * Pemakaian di route handler:
 *
 *   const check = await verifyApiKey(req, 'WARGA')
 *   if (!check.ok) return check.response
 */
export async function verifyApiKey(req: Request, jenis: ApiKeyJenis): Promise<VerifyResult> {
  const provided = readApiKey(req.headers)
  if (!provided) {
    return fail(401, 'API key tidak ditemukan. Sertakan header x-api-key atau Authorization: Bearer <API_KEY>.')
  }

  const row = await prisma.apiKey.findUnique({ where: { jenis } })

  // Bandingkan hash dengan timingSafeEqual (pesan error sama agar tidak membocorkan info)
  const a = Buffer.from(hashApiKey(provided), 'hex')
  const b = Buffer.from(row?.keyHash ?? '', 'hex')
  const match = !!row && a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!match) {
    return fail(401, 'API key tidak valid.')
  }

  if (!row.isActive) {
    return fail(403, 'Akses API untuk data ini sedang dinonaktifkan.')
  }

  // Catat pemakaian terakhir (maksimal 1x per menit agar tidak membebani database)
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    prisma.apiKey
      .update({ where: { jenis }, data: { lastUsedAt: new Date() } })
      .catch((err) => console.error('Gagal mencatat lastUsedAt:', err))
  }

  return { ok: true }
}