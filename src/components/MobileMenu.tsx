'use client'

import { useState } from 'react'
import { KeyRound, Menu, X, Home, Users, FileText, Video } from 'lucide-react'

const links = [
  { href: '#beranda', label: 'Beranda', icon: Home },
  { href: '#profil', label: 'Profil & Visi Misi', icon: Users },
  { href: '#transparansi', label: 'Transparansi Bansos', icon: FileText },
  { href: '#kegiatan', label: 'Kegiatan & Video', icon: Video },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={open}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition shrink-0 shadow-xs cursor-pointer"
      >
        {open ? <X className="w-5 h-5 text-blue-600" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-2xl py-3 px-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="max-w-7xl mx-auto space-y-1">
            {links.map((l) => {
              const IconComponent = l.icon
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span>{l.label}</span>
                </a>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}