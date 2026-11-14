import { cache } from 'react'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { catatKejadianKeamanan, ipDariHeaders } from '@/lib/audit'

export type SessionUser = { id: string; role: string }

/**
 * Pengguna yang sedang login (role dibaca langsung dari database), atau null.
 *
 * Di-cache per request: halaman dan beberapa server action sering memanggil
 * fungsi ini lebih dari sekali dalam satu request, sehingga query `User`
 * cukup dijalankan sekali. Perubahan role tetap berlaku pada request
 * berikutnya karena cache tidak bertahan antar-request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth()
  const id = (session?.user as any)?.id as string | undefined
  if (!id) return null

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  return user ? { id: user.id, role: user.role } : null
})

async function ipPemanggil() {
  try {
    const h = await headers()
    return ipDariHeaders(h)
  } catch {
    return null
  }
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
    // Pelanggaran otorisasi: pengguna sah tetapi mencoba membuka area admin.
    await catatKejadianKeamanan({
      userId: user.id,
      aksi: 'SECURITY_AKSES_ILEGAL',
      entitas: 'Otorisasi',
      detail: {
        area: 'admin',
        peran: user.role,
        alasan: 'mencoba mengakses fungsi khusus admin',
      },
      ip: await ipPemanggil(),
    })
    return { ok: false, status: 403, message: 'Hanya admin yang dapat mengelola template surat.' }
  }
  return { ok: true, userId: user.id }
}
