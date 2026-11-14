'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Interval polling notifikasi surat masuk. Cukup sering agar badge terasa
 * realtime, tetapi tetap ringan untuk database desa.
 */
export const SURAT_PENDING_POLL_MS = 12_000

/**
 * Hook polling jumlah permohonan surat berstatus PENDING.
 *
 * - `initialCount` berasal dari render server agar angka langsung benar.
 * - Polling otomatis berhenti saat tab tidak aktif (document.hidden) dan
 *   langsung menyegarkan angka saat tab kembali dibuka/difokuskan.
 * - Permintaan tidak ditumpuk bila respons sebelumnya belum selesai.
 */
export function useSuratPendingCount(initialCount = 0, enabled = true) {
  const [count, setCount] = useState(initialCount)
  const inFlight = useRef(false)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return
    if (typeof document !== 'undefined' && document.hidden) return

    inFlight.current = true
    try {
      const res = await fetch('/api/dashboard/surat-pending', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return

      const data = (await res.json()) as { count?: unknown }
      if (mounted.current && typeof data.count === 'number' && Number.isFinite(data.count)) {
        setCount(Math.max(0, Math.trunc(data.count)))
      }
    } catch {
      // Gangguan jaringan sesaat diabaikan; interval berikutnya mencoba lagi.
    } finally {
      inFlight.current = false
    }
  }, [enabled])

  // Selaraskan dengan angka terbaru dari server saat halaman dirender ulang.
  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  useEffect(() => {
    mounted.current = true
    if (!enabled) return

    const intervalId = window.setInterval(refresh, SURAT_PENDING_POLL_MS)
    const handleVisible = () => {
      if (!document.hidden) void refresh()
    }

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleVisible)

    return () => {
      mounted.current = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleVisible)
    }
  }, [enabled, refresh])

  return { count, refresh }
}
