'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, KeyRound, Phone } from 'lucide-react'
import MobileMenu from '@/components/MobileMenu'

interface NavbarProps {
  setting: {
    namaDesa: string
    sloganDesa: string
    logoDesa: string | null
  }
  nav?: {
    home: string
    services: string
    news: string
    transparency: string
    contact: string
    contactCta: string
    loginStaff: string
    loginShort: string
  }
}

/*
  Satu sumber untuk menu desktop dan mobile.
  Setiap href harus cocok dengan id section di HomeClient.
*/
export function buildNavLinks(nav: NonNullable<NavbarProps['nav']>) {
  return [
    { href: '#beranda', label: nav.home },
    { href: '#layanan', label: nav.services },
    { href: '#berita', label: nav.news },
    { href: '#transparansi', label: nav.transparency },
    { href: '#kontak', label: nav.contact },
  ]
}

export const NAV_LINKS = [
  { href: '#beranda', label: 'Beranda' },
  { href: '#layanan', label: 'Layanan' },
  { href: '#berita', label: 'Berita' },
  { href: '#transparansi', label: 'Transparansi' },
  { href: '#kontak', label: 'Kontak' },
]

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'

export default function Navbar({ setting, nav }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const navLinks = nav ? buildNavLinks(nav) : NAV_LINKS
  const contactCta = nav?.contactCta ?? 'Kontak darurat'
  const loginStaff = nav?.loginStaff ?? 'Login Perangkat Desa'
  const loginShort = nav?.loginShort ?? 'Login'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15)

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md'
          : 'border-b border-slate-100 bg-white'
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex h-[76px] items-center justify-between gap-5">
          {/* LOGO */}
          <Link
            href="/"
            className={`group flex min-w-0 items-center gap-3 rounded-lg ${FOCUS}`}
          >
            {setting.logoDesa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={setting.logoDesa}
                alt="Logo Desa"
                className="h-11 w-11 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                <Building2 size={25} />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                {setting.namaDesa}
              </p>
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                {setting.sloganDesa}
              </p>
            </div>
          </Link>

          {/* NAVIGASI DESKTOP */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-emerald-800 ${FOCUS} after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-emerald-600 after:transition-transform after:duration-300 hover:after:scale-x-100`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* AKSI DESKTOP */}
          <div className="hidden items-center gap-2 lg:flex">
            <a
              href="#kontak"
              className={`group inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-amber-300 hover:shadow-md active:scale-95 ${FOCUS}`}
            >
              <Phone
                size={16}
                className="transition-transform duration-300 group-hover:rotate-12"
              />
              {contactCta}
            </a>
            <Link
              href="/login"
              className={`group inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md active:translate-y-0 active:scale-95 ${FOCUS}`}
            >
              <KeyRound
                size={16}
                className="transition-transform duration-300 group-hover:-rotate-12"
              />
              {loginStaff}
            </Link>
          </div>

          {/* MOBILE */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/login"
              className={`flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-800 active:scale-95 ${FOCUS}`}
            >
              <KeyRound size={14} />
              {loginShort}
            </Link>
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </div>
    </header>
  )
}