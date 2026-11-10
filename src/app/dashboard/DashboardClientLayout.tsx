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
  FileCode
} from 'lucide-react'

export default function DashboardClientLayout({
  children,
  user,
}: {
  children: React.ReactNode
  user: any
}) {
  const role = user?.role || 'WARGA'
  const permissions = user?.permissions || []

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
      return adminMenuList.filter((menu) => adminMenuList.some((m) => m.id === menu.id))
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

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      
      {/* TOP HEADER MOBILE */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white md:hidden shrink-0 z-30">
        <div>
          <h2 className="text-sm font-bold">Desa Hulu Pancur Batu</h2>
          <p className="text-[10px] text-slate-400">Sistem Administrasi Desa</p>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
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
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-5 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">
              {role === 'WARGA' ? 'SIDU Warga' : 'Desa Hulu Pancur Batu'}
            </h2>
            <p className="text-xs text-slate-400">
              {role === 'WARGA' ? 'Portal Layanan Penduduk' : 'Sistem Administrasi Desa'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg text-slate-400 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigasi Menu */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {menuList.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800">
              Tidak ada akses menu. Silakan hubungi Administrator.
            </div>
          ) : (
            menuList.map((menu) => {
              if (menu.id === 'surat') {
                const isSuratActive = pathname.startsWith('/dashboard/surat')

                return (
                  <div key={menu.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setIsSuratOpen(!isSuratOpen)}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        isSuratActive
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-600/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{menu.icon}</span>
                        <span>{menu.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSuratOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSuratOpen && (
                      <div className="pl-4 space-y-1 pt-1 border-l-2 border-slate-800 ml-4">
                        {((menu as any).subMenus ?? []).map((sub: any) => {
                          const isSubActive = pathname === sub.href
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsSidebarOpen(false)}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                isSubActive
                                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/40 p-4 shrink-0 mt-auto">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="truncate text-xs font-bold text-white">{user?.name || 'Pengguna Desa'}</div>
              <div className="truncate text-[10px] font-semibold uppercase text-slate-400">
                {role === 'KADUS' 
                  ? `Kadus ${user?.dusunNama || ''}` 
                  : role === 'ADMIN' 
                    ? 'Administrator' 
                    : 'Warga Desa'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex shrink-0 items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-400 transition-colors hover:bg-rose-600 hover:text-white cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* AREA KONTEN UTAMA */}
      <main className="flex-1 h-screen overflow-y-auto p-4 sm:p-6 md:p-8">
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