'use client'

import { useState } from 'react'
import {
  Menu,
  X,
  HandHeart,
  PieChart,
  Newspaper,
  Phone,
} from 'lucide-react'

interface MobileMenuProps {
  scrolled?: boolean
}

const links = [
  { href: '#layanan', label: 'Layanan', icon: HandHeart },
  { href: '#transparansi', label: 'Transparansi', icon: PieChart },
  { href: '#berita', label: 'Berita', icon: Newspaper },
  { href: '#kontak', label: 'Kontak', icon: Phone },
]

export default function MobileMenu({
  scrolled = false,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
          scrolled
            ? 'border-slate-200 bg-white text-[#102347] hover:bg-slate-50'
            : 'border-white/25 bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-40 cursor-default bg-black/10"
          />

          <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Navigasi
              </p>
            </div>

            <nav className="space-y-1">
              {links.map((link) => {
                const Icon = link.icon

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    {link.label}
                  </a>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}