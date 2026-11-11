'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X, Smartphone, Share } from 'lucide-react'

export default function InstallPWABanner() {
  const pathname = usePathname()
  const isPublicLanding = pathname === '/'

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstruction, setShowIOSInstruction] = useState(false)

  useEffect(() => {
    // Banner install hanya untuk pengunjung halaman depan publik.
    // Area admin/dashboard dan halaman autentikasi tidak boleh menampilkannya.
    if (!isPublicLanding) {
      setShowBanner(false)
      setShowIOSInstruction(false)
      return
    }

    // Pengecekan perangkat iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Cek apakah web sudah dibuka dalam mode aplikasi (standalone/PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) {
      return // Jangan tampilkan banner jika sudah terinstall dan dibuka sebagai PWA
    }

    // Tangkap event bawaan Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Jika di iOS dan belum mode standalone, tampilkan banner khusus iOS
    if (isIosDevice && !isStandalone) {
      setShowBanner(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isPublicLanding])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstruction(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <>
      {/* BANNER NOTIFIKASI INSTALL (Tampil Mengambang di Bawah Layar HP) */}
      <div className="fixed bottom-4 left-4 right-4 z-[9999] md:max-w-md md:left-auto border border-slate-800 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Install Aplikasi SIDU Desa</h4>
            <p className="text-[11px] text-slate-400">Pasang di HP agar akses lebih cepat tanpa ketik URL.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* POPUP PETUNJUK KHUSUS PENGGUNA IPHONE (SAFARI) */}
      {showIOSInstruction && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30">
              <Share className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Cara Install di iPhone (Safari)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1. Klik tombol <strong className="text-white">Bagikan (Share / <Share className="w-3.5 h-3.5 inline text-blue-400" />)</strong> di bagian bawah Safari.<br />
                2. Gulir ke bawah lalu pilih <strong className="text-white font-bold">"Tambah ke Layar Utama"</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstruction(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  )
}