import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// GERBANG: semua halaman /dashboard, API /api/dashboard, dan API /api/admin wajib login.
// API /api/admin hanya untuk ADMIN. Dijalankan Next.js SEBELUM halaman/API dibuat.
//
// Catatan: ini lapisan pertama. Halaman, server action, dan API tetap harus
// memeriksa login/role sendiri (lapisan kedua), dan memang sudah begitu.
export default auth((req) => {
  const { pathname } = req.nextUrl

  // Tidak ada sesi yang valid (belum login, sudah logout, atau sesi dicabut)
  if (!req.auth?.user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const res = NextResponse.redirect(new URL('/login', req.nextUrl))
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  // API admin: peran ADMIN wajib (pemeriksaan kasar dari token; rute tetap memeriksa ulang ke database)
  if (pathname.startsWith('/api/admin/') && (req.auth.user as any).role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Hanya admin yang dapat mengakses ini.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Halaman manajemen akun: khusus ADMIN (pemeriksaan kasar dari token; halamannya memeriksa ulang ke database)
  if (pathname.startsWith('/dashboard/users') && (req.auth.user as any).role !== 'ADMIN') {
    const res = NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  // Sudah login: lanjutkan, tetapi larang browser menyimpan salinan halaman.
  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
})

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*', '/api/admin/:path*'],
}