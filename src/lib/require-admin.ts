import { PrismaClient } from '@prisma/client'
import { auth } from '@/auth'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type SessionUser = { id: string; role: string }

/** Pengguna yang sedang login (role dibaca langsung dari database), atau null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  const id = (session?.user as any)?.id as string | undefined
  if (!id) return null

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  return user ? { id: user.id, role: user.role } : null
}

/** Pastikan pemanggil adalah ADMIN. */
export async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; status: 401 | 403; message: string }
> {
  const user = await getSessionUser()
  if (!user) {
    return { ok: false, status: 401, message: 'Sesi berakhir. Silakan login ulang.' }
  }
  if (user.role !== 'ADMIN') {
    return { ok: false, status: 403, message: 'Hanya admin yang dapat mengelola template surat.' }
  }
  return { ok: true, userId: user.id }
}
