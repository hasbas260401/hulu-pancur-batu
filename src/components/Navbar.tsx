
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, KeyRound } from 'lucide-react'
import MobileMenu from '@/components/MobileMenu'

interface NavbarProps {
  setting: {
    namaDesa: string
    sloganDesa: string
    logoDesa: string | null
  }
}

export default function Navbar({ setting }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15)

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const links = [
    { href: '#beranda', label: 'Beranda' },
    { href: '#profil', label: 'Profil Desa' },
    { href: '#transparansi', label: 'Transparansi' },
    { href: '#kegiatan', label: 'Kegiatan' },
  ]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm'
          : 'bg-white border-b border-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="h-[76px] flex items-center justify-between gap-5">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3 min-w-0">
            {setting.logoDesa ? (
              <img
                src={setting.logoDesa}
                alt="Logo Desa"
                className="w-11 h-11 object-contain shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 size={25} />
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {setting.namaDesa}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 tracking-wide truncate">
                {setting.sloganDesa}
              </p>
            </div>
          </Link>

          {/* NAVIGASI DESKTOP */}
          <nav className="hidden lg:flex items-center gap-7">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* LOGIN */}
          <div className="hidden lg:block">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563B8] hover:bg-[#1d4f96] text-white text-sm font-semibold transition-colors"
            >
              <KeyRound size={16} />
              Login Perangkat Desa
            </Link>
          </div>

          {/* MOBILE */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold"
            >
              <KeyRound size={14} />
              Login
            </Link>
            <MobileMenu />
          </div>

        </div>
      </div>
    </header>
  )
}
