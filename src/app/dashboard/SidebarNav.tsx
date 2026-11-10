'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export default function SidebarNav({
  filteredMenu,
  mobileHeaderProps,
}: {
  filteredMenu: any[]
  mobileHeaderProps?: {
    username: string
    role: string
    dusunNama?: string
    logoutButton: React.ReactNode
  }
}) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* TOP HEADER KHUSUS MOBILE */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white md:hidden">
        <div>
          <h2 className="text-sm font-bold">Desa Hulu Pancur Batu</h2>
          <p className="text-[10px] text-slate-400">Sistem Administrasi Desa</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* OVERLAY GELAP SAAT MENU MOBILE TERBUKA */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Sidebar Desktop */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div>
            <h2 className="text-base font-bold text-white">
              Desa Hulu Pancur Batu
            </h2>
            <p className="text-xs text-slate-400">Sistem Administrasi Desa</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg text-slate-400 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {filteredMenu.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Tidak ada akses menu yang diizinkan. Hubungi Admin.
            </div>
          ) : (
            filteredMenu.map((menu) => {
              const isActive =
                pathname === menu.href ||
                (menu.href !== '/dashboard' && pathname.startsWith(menu.href))

              return (
                <Link
                  key={menu.id}
                  href={menu.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
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

        {/* User Info & Logout Button di Bagian Bawah Sidebar */}
        {mobileHeaderProps && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {mobileHeaderProps.username?.charAt(0).toUpperCase() || 'U'}
              </div>

              <div className="overflow-hidden">
                <div className="truncate text-xs font-bold text-white">
                  {mobileHeaderProps.username}
                </div>
                <div className="truncate text-[10px] font-semibold uppercase text-slate-400">
                  {mobileHeaderProps.role}
                  {mobileHeaderProps.dusunNama ? ` • ${mobileHeaderProps.dusunNama}` : ''}
                </div>
              </div>
            </div>

            {mobileHeaderProps.logoutButton}
          </div>
        )}
      </aside>
    </>
  )
}