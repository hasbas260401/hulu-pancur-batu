import { NextResponse, connection } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

/**
 * Jumlah permohonan surat yang masih PENDING (DIAJUKAN) untuk notifikasi
 * realtime di sidebar & dashboard.
 *
 * Peran/dusun dibaca dari DATABASE agar perubahan penugasan langsung berlaku
 * dan KADUS tidak menerima angka dari dusun lain.
 */
export async function GET() {
  // cacheComponents aktif: tandai rute ini selalu dieksekusi saat request
  // (tidak ikut di-prerender), lalu hitung angka terbaru dari database.
  await connection()

  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) {
    return NextResponse.json({ count: 0 }, { status: 401, headers: NO_STORE })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, dusunId: true, permissions: true },
  })
  if (!user) {
    return NextResponse.json({ count: 0 }, { status: 401, headers: NO_STORE })
  }

  const canProcessSurat =
    user.role === 'ADMIN' ||
    (user.role === 'KADUS' && user.permissions.includes('surat'))

  if (!canProcessSurat) {
    return NextResponse.json({ count: 0 }, { headers: NO_STORE })
  }

  try {
    const count = await prisma.pengajuanSurat.count({
      where: {
        status: 'DIAJUKAN',
        ...(user.role === 'KADUS' && user.dusunId ? { dusunId: user.dusunId } : {}),
      },
    })

    return NextResponse.json(
      { count, updatedAt: new Date().toISOString() },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('Gagal menghitung surat pending:', error)
    return NextResponse.json({ count: 0 }, { status: 500, headers: NO_STORE })
  }
}
