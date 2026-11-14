'use client'

import { useState, useTransition } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  HandHeart,
  Coins,
  UserCog,
  Globe,
  Home,
  UserCheck,
  Mail,
  Settings,
  Menu,
  X,
  LogOut,
  AlertTriangle,
  ChevronDown,
  FilePlus,
  History,
  FileCode,
  Lock,
} from 'lucide-react'
import { useSuratPendingCount } from '@/lib/use-surat-pending-count'

export default function DashboardClientLayout({
  children,
  user,
  statusAkun = 'ACTIVE',
  suratMasukCount = 0,
}: {
  children: React.ReactNode
  user: any
  statusAkun?: string
  suratMasukCount?: number
}) {
  const role = user?.role || 'WARGA'
  const permissions = user?.permissions || []
  const canProcessSurat =
    role === 'ADMIN' ||
    (role === 'KADUS' && Array.isArray(permissions) && permissions.includes('surat'))

  // Badge surat masuk diperbarui otomatis lewat polling (tanpa refresh browser).
  const { count: pendingSuratCount } = useSuratPendingCount(suratMasukCount, canProcessSurat)

  // Warga yang akunnya belum diverifikasi tetap bisa masuk, tetapi hanya
  // menu Beranda yang aktif. Menu lain ditampilkan dalam keadaan terkunci.
  const normalizedStatus = String(statusAkun ?? '').toUpperCase()
  const isAccountActive = normalizedStatus === 'AKTIF' || normalizedStatus === 'ACTIVE'
  const isWarga = role === 'WARGA'
  const isLocked = isWarga && !isAccountActive

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
   
  const pathname = usePathname()

  // State untuk mengontrol dropdown menu Surat-Menyurat
  const [isSuratOpen, setIsSuratOpen] = useState(pathname.startsWith('/dashboard/surat'))
   
  async function handleLogout() {
    if (isPending) return
    setError('')
    startTransition(async () => {
      try {
        // 1. Unregister Service Worker dan bersihkan cache PWA secara total
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
          }
        }

        // 1b. Hapus seluruh Cache Storage (sisa cache PWA yang mungkin menyimpan halaman/data)
        if (typeof caches !== 'undefined') {
          const cacheKeys = await caches.keys()
          await Promise.all(cacheKeys.map((key) => caches.delete(key)))
        }

        // 2. Bersihkan storage lokal browser agar tidak ada sisa sesi yang tertinggal
        if (typeof window !== 'undefined') {
          localStorage.clear()
          sessionStorage.clear()
        }

        // 3. Panggil signOut NextAuth tanpa redirect otomatis dari library, 
        // lalu arahkan secara mutlak menggunakan window.location.origin agar dinamis (Ngrok / Localhost)
        await signOut({ redirect: false })
        
        window.location.href = `${window.location.origin}/login`
      } catch (err) {
        console.error('Logout gagal:', err)
        setError('Logout gagal. Silakan coba lagi.')
        setShowLogoutModal(false)
        // Fallback hard redirect dinamis menggunakan window.location.origin
        window.location.href = `${window.location.origin}/login`
      }
    })
  }

  // --- MENU OPERASIONAL DESA, ADMIN, & PENGATURAN TERPUSAT ---
  const adminMenuList = [
    { id: 'dashboard', label: 'Dashboard Utama', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'warga', label: 'Data Kependudukan', href: '/dashboard/warga', icon: <Users className="w-5 h-5" /> },
    { 
      id: 'surat', 
      label: 'Surat-Menyurat', 
      href: '/dashboard/surat/template', 
      icon: <FileText className="w-5 h-5" />,
      subMenus: [
        { label: 'Template Surat', href: '/dashboard/surat/template', icon: <FileCode className="w-4 h-4" /> },
        { label: 'Buat Surat', href: '/dashboard/surat/buat', icon: <FilePlus className="w-4 h-4" /> },
        { label: 'Riwayat Surat', href: '/dashboard/surat/riwayat', icon: <History className="w-4 h-4" /> },
      ]
    },
    { id: 'bansos', label: 'Bantuan Sosial', href: '/dashboard/bansos', icon: <HandHeart className="w-5 h-5" /> },
    { id: 'transparansi', label: 'Transparansi Dana', href: '/dashboard/transparansi', icon: <Coins className="w-5 h-5" /> },
    { id: 'users', label: 'Manajemen User & Kadus', href: '/dashboard/users', icon: <UserCog className="w-5 h-5" /> },
    { id: 'konten', label: 'Kelola Konten Web', href: '/dashboard/setting-web', icon: <Globe className="w-5 h-5" /> },
    { id: 'settings', label: 'Pengaturan Akun', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  ]

  // --- MENU PORTAL WARGA ---
  const wargaMenuList = [
    { id: 'warga-home', label: 'Beranda Utama Warga', href: '/dashboard/warga-home', icon: <Home className="w-5 h-5" /> },
    { id: 'warga-profil', label: 'Profil & Keluarga', href: '/dashboard/warga-profil', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'warga-surat', label: 'Layanan Surat Warga', href: '/dashboard/warga-surat', icon: <Mail className="w-5 h-5" /> },
    { id: 'settings', label: 'Pengaturan Akun', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const allMenuList = [...adminMenuList, ...wargaMenuList]

  // --- FILTER MENU BERDASARKAN ROLE & PERMISSIONS ---
  const menuList = (() => {
    if (role === 'ADMIN') {
      return adminMenuList
    }

    // Untuk WARGA atau KADUS, saring berdasarkan permissions
    let allowedMenus = allMenuList.filter((menu, index, self) => {
      // Hilangkan duplikasi ID
      if (index !== self.findIndex((m) => m.id === menu.id)) return false
      return permissions.includes(menu.id)
    })

    // KHUSUS WARGA: Pastikan menu 'settings' dipindah secara paksa ke urutan paling akhir
    if (role === 'WARGA') {
      const settingsMenu = allowedMenus.find((m) => m.id === 'settings')
      if (settingsMenu) {
        allowedMenus = allowedMenus.filter((m) => m.id !== 'settings')
        allowedMenus.push(settingsMenu) // Taruh di paling bawah
      }
    }

    return allowedMenus
  })()

  // Menu yang terkunci selama akun warga masih PENDING. Beranda tetap bisa
  // dibuka agar warga melihat status verifikasi akunnya.
  function menuTerkunci(menuId: string) {
    return isLocked && menuId !== 'warga-home'
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 font-sans">
      
      {/* TOP HEADER MOBILE */}
      <div className="flex items-center justify-between border-b border-emerald-900/50 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 px-4 py-3 text-white md:hidden shrink-0 z-30">
        <div>
          <h2 className="text-sm font-bold">Desa Hulu Pancur Batu</h2>
          <p className="text-[10px] text-emerald-200/70">Sistem Administrasi Desa</p>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-lg p-2 text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR UTAMA */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-emerald-900/50 bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-900 text-emerald-50/80 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">
              {role === 'WARGA' ? 'SIDU Warga' : 'Desa Hulu Pancur Batu'}
            </h2>
            <p className="text-xs text-emerald-200/70">
              {role === 'WARGA' ? 'Portal Layanan Penduduk' : 'Sistem Administrasi Desa'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg text-emerald-100/70 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigasi Menu */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {isLocked && (
            <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-100/90">
              <div className="flex items-center gap-1.5 font-bold text-amber-200">
                <Lock className="h-3.5 w-3.5" />
                Akun Belum Diverifikasi
              </div>
              <p className="mt-1 text-amber-100/70">
                Menu lain terbuka otomatis setelah admin menyetujui akun Anda.
              </p>
            </div>
          )}

          {menuList.length === 0 ? (
            <div className="p-3 text-center text-xs text-emerald-100/60 bg-black/20 rounded-xl border border-white/10">
              Tidak ada akses menu. Silakan hubungi Administrator.
            </div>
          ) : (
            menuList.map((menu) => {
              const terkunci = menuTerkunci(menu.id)
              const badgeCount = menu.id === 'surat' ? pendingSuratCount : 0

              if (terkunci) {
                return (
                  <div
                    key={menu.id}
                    aria-disabled="true"
                    title="Menu terkunci sampai akun Anda diverifikasi admin."
                    className="flex cursor-not-allowed items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-emerald-100/25"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base opacity-60">{menu.icon}</span>
                      <span>{menu.label}</span>
                    </div>
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                )
              }

              if (menu.id === 'surat') {
                const isSuratActive = pathname.startsWith('/dashboard/surat')

                return (
                  <div key={menu.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setIsSuratOpen(!isSuratOpen)}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        isSuratActive
                          ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/30'
                          : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{menu.icon}</span>
                        <span>{menu.label}</span>
                        {badgeCount > 0 && (
                          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSuratOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSuratOpen && (
                      <div className="pl-4 space-y-1 pt-1 border-l-2 border-white/10 ml-4">
                        {((menu as any).subMenus ?? []).map((sub: any) => {
                          const isSubActive = pathname === sub.href
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsSidebarOpen(false)}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                isSubActive
                                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/40'
                                  : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <span>{sub.icon}</span>
                              <span>{sub.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const isActive =
                pathname === menu.href ||
                (menu.href !== '/dashboard' && pathname.startsWith(menu.href))

              return (
                <Link
                  key={menu.id}
                  href={menu.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/40'
                      : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-base">{menu.icon}</span>
                  {menu.label}
                </Link>
              )
            })
          )}
        </nav>

        {/* Footer Sidebar */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/20 p-4 shrink-0 mt-auto">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="truncate text-xs font-bold text-white">{user?.name || 'Pengguna Desa'}</div>
              <div className="truncate text-[10px] font-semibold uppercase text-emerald-200/60">
                {role === 'KADUS' 
                  ? `Kadus ${user?.dusunNama || ''}` 
                  : role === 'ADMIN' 
                    ? 'Administrator' 
                    : isLocked
                      ? 'Warga • Menunggu Verifikasi'
                      : 'Warga Desa'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex shrink-0 items-center justify-center rounded-lg bg-white/10 p-2 text-emerald-100/70 transition-colors hover:bg-rose-600 hover:text-white cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* AREA KONTEN UTAMA */}
      {/* Latar dibuat bernuansa emerald lembut agar senada dengan sidebar,
          tanpa mengalahkan kontras kartu konten berwarna putih. */}
      <main className="flex-1 h-screen overflow-y-auto bg-gradient-to-br from-emerald-50/80 via-slate-50 to-teal-50/70 p-4 sm:p-6 md:p-8">
        {isLocked && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-sm">Akun Anda menunggu verifikasi admin</p>
              <p className="mt-0.5 text-amber-800">
                Anda masih dapat melihat data diri di Beranda. Menu Profil &amp; Keluarga, Layanan Surat,
                dan Pengaturan akan terbuka otomatis setelah akun disetujui.
              </p>
            </div>
          </div>
        )}
        {children}
        {error && <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{error}</div>}
      </main>

      {/* GLOBAL POP-UP MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Konfirmasi Keluar</h3>
            <p className="text-xs text-slate-400">Apakah Anda yakin ingin keluar dari sesi ini?</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Keluar...' : 'Ya, Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}