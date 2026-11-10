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
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-lg shadow-slate-900/5 py-2.5 sm:py-3'
          : 'bg-transparent border-b border-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* LOGO & JUDUL DESA */}
          <Link href="/" className="flex items-center gap-3 min-w-0 group pr-1">
            {setting.logoDesa ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl p-1 bg-white/90 border border-white/20 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition duration-300">
                <img src={setting.logoDesa} alt="Logo Desa" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition duration-300">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className={`text-sm sm:text-base font-extrabold tracking-tight leading-tight truncate transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>
                {setting.namaDesa}
              </h1>
              <p className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase truncate transition-colors ${scrolled ? 'text-blue-600' : 'text-blue-300'}`}>
                {setting.sloganDesa}
              </p>
            </div>
          </Link>

          {/* NAVIGASI DESKTOP (Gaya Pill Transparan / Kaca) */}
          <nav className={`hidden md:flex items-center p-1.5 rounded-full border transition-all duration-300 ${
            scrolled 
              ? 'bg-slate-100/80 border-slate-200/60 shadow-inner' 
              : 'bg-white/10 backdrop-blur-md border-white/15'
          }`}>
            <a href="#beranda" className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${scrolled ? 'text-slate-600 hover:text-blue-600 hover:bg-white' : 'text-white/90 hover:text-white hover:bg-white/20'}`}>Beranda</a>
            <a href="#profil" className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${scrolled ? 'text-slate-600 hover:text-blue-600 hover:bg-white' : 'text-white/90 hover:text-white hover:bg-white/20'}`}>Profil & Visi Misi</a>
            <a href="#transparansi" className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${scrolled ? 'text-slate-600 hover:text-blue-600 hover:bg-white' : 'text-white/90 hover:text-white hover:bg-white/20'}`}>Transparansi Bansos</a>
            <a href="#kegiatan" className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 ${scrolled ? 'text-slate-600 hover:text-blue-600 hover:bg-white' : 'text-white/90 hover:text-white hover:bg-white/20'}`}>Kegiatan & Video</a>
          </nav>

          {/* TOMBOL LOGIN DESKTOP */}
          <div className="hidden md:flex items-center">
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <KeyRound className="w-4 h-4 transition-transform group-hover:rotate-12" /> 
              <span>Login Perangkat Desa</span>
            </Link>
          </div>

          {/* LOGIN + MENU (MOBILE) */}
          <div className="flex md:hidden items-center gap-2.5 shrink-0">
            <Link
              href="/login"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}