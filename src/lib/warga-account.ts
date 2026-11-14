import { cache } from 'react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type WargaAccount = {
  userId: string
  role: 'WARGA' | 'KADUS' | 'ADMIN'
  /** Status mentah dari database, mis. PENDING / ACTIVE / AKTIF. */
  statusAkun: string
  /** true bila akun sudah diverifikasi (ACTIVE/AKTIF). */
  isActive: boolean
  /** Relasi ke data kependudukan; null bila akun belum ditautkan. */
  wargaId: string | null
}

/** Status akun yang dianggap sudah diverifikasi. */
export function isAkunAktif(status: string | null | undefined) {
  const value = String(status ?? '').toUpperCase()
  return value === 'AKTIF' || value === 'ACTIVE'
}

/**
 * Identitas akun warga yang sedang login, dibaca dari DATABASE (bukan dari
 * parameter URL atau token yang bisa dipalsukan).
 *
 * Di-cache per request agar halaman dan server action tidak mengulang query
 * yang sama. Semua data kependudukan warga WAJIB diambil lewat `wargaId` yang
 * dikembalikan fungsi ini, sehingga warga tidak bisa membuka data orang lain
 * hanya dengan mengganti id di URL.
 */
export const getWargaAccount = cache(async (): Promise<WargaAccount | null> => {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, statusAkun: true, wargaId: true },
  })
  if (!user) return null

  return {
    userId: user.id,
    role: user.role as WargaAccount['role'],
    statusAkun: user.statusAkun || 'PENDING',
    isActive: isAkunAktif(user.statusAkun),
    wargaId: user.wargaId,
  }
})
