'use client'

import { useEffect } from 'react'

// Saat browser memulihkan halaman lama dari cache (tombol Back/Forward),
// halaman dimuat ulang agar server memeriksa login lagi. Tanpa ini, setelah logout
// tombol Back bisa menampilkan salinan dashboard yang tersimpan di browser.
export default function SessionGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return null
}
