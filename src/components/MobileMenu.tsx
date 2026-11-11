'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Menu,
  X,
  Home,
  HandHeart,
  PieChart,
  Newspaper,
  Phone,
  type LucideIcon,
} from 'lucide-react'

interface MobileMenuProps {
  links: { href: string; label: string }[]
}

// Ikon per tujuan. Link yang tidak terdaftar memakai ikon Home.
const ICONS: Record<string, LucideIcon> = {
  '#beranda': Home,
  '#layanan': HandHeart,
  '#berita': Newspaper,
  '#transparansi': PieChart,
  '#kontak': Phone,
}

export default function MobileMenu({ links }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={open}
        aria-controls="menu-mobile"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Lapisan penutup di belakang menu */}
            <motion.button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-[76px] z-40 cursor-default bg-slate-900/20"
            />

            <motion.div
              id="menu-mobile"
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-14 z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <nav aria-label="Navigasi seluler" className="space-y-1">
                {links.map((link) => {
                  const Icon = ICONS[link.href] ?? Home
                  const urgent = link.href === '#kontak'

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        urgent
                          ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${
                          urgent
                            ? 'bg-amber-200/70 text-amber-900'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {link.label}
                    </a>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}