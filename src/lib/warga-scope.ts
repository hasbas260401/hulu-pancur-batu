import { PrismaClient } from '@prisma/client'
import { auth } from '@/auth'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type WargaScope =
  | {
      ok: true
      userId: string
      role: 'ADMIN' | 'KADUS'
      /** Filter wajib untuk SETIAP query data berbasis dusun. ADMIN: kosong (semua). KADUS: hanya dusunnya. */
      dusunFilter: { dusunId?: number }
      dusunNama: string | null
    }
  | { ok: false; status: 401 | 403; message: string }

/**
 * Tentukan siapa yang boleh mengakses suatu data dan sebatas apa.
 * `permission` = id menu yang harus dimiliki KADUS (misalnya 'warga', 'bansos').
 * Semua dibaca dari DATABASE (bukan dari token login), dan gagal tertutup:
 * bila ada yang tidak jelas, akses ditolak, bukan dibuka.
 */
export async function getScope(permission: string, label: string): Promise<WargaScope> {
  const session = await auth()
  const id = (session?.user as any)?.id as string | undefined
  if (!id) return { ok: false, status: 401, message: 'Sesi berakhir. Silakan login ulang.' }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, dusunId: true, permissions: true, dusun: { select: { nama: true } } },
  })
  if (!user) return { ok: false, status: 401, message: 'Sesi berakhir. Silakan login ulang.' }

  if (user.role === 'ADMIN') {
    return { ok: true, userId: id, role: 'ADMIN', dusunFilter: {}, dusunNama: null }
  }

  if (user.role === 'KADUS') {
    if (!user.permissions.includes(permission)) {
      return { ok: false, status: 403, message: `Anda tidak memiliki izin untuk mengakses ${label}.` }
    }
    if (!user.dusunId) {
      return {
        ok: false,
        status: 403,
        message: 'Akun Kadus Anda belum ditetapkan ke sebuah dusun. Silakan hubungi Administrator.',
      }
    }
    return {
      ok: true,
      userId: id,
      role: 'KADUS',
      dusunFilter: { dusunId: user.dusunId },
      dusunNama: user.dusun?.nama ?? null,
    }
  }

  return { ok: false, status: 403, message: `Akun Anda tidak memiliki akses ke ${label}.` }
}

export const getWargaScope = () => getScope('warga', 'data kependudukan')
export const getBansosScope = () => getScope('bansos', 'data bantuan sosial')