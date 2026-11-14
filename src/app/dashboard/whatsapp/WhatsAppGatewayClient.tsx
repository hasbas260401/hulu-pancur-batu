'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MessageCircle,
  Phone,
  Plug,
  Power,
  QrCode,
  RefreshCw,
  RotateCw,
  Settings,
  ShieldCheck,
  Smartphone,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import type { WhatsAppGatewayStatus } from '@/lib/whatsapp-gateway'

/**
 * Status netral saat komponen baru dimuat. Dibuat lokal (bukan diimpor dari
 * @/lib/whatsapp-gateway) agar modul server/Prisma tidak ikut ke bundle browser.
 */
function statusAwalGateway(): WhatsAppGatewayStatus {
  return {
    ok: false,
    reachable: true,
    supported: false,
    connected: false,
    state: 'connecting',
    phoneNumber: null,
    pushName: null,
    qr: null,
    qrDataUrl: null,
    qrUpdatedAt: null,
    qrExpiresAt: null,
    connectedAt: null,
    lastDisconnectReason: null,
    gatewayUrl: null,
    checkedAt: new Date().toISOString(),
    latencyMs: null,
    error: null,
  }
}

export type WhatsAppGatewayConfigView = {
  apiUrl: string
  hasToken: boolean
  tokenMasked: string | null
  senderNumber: string | null
  enabled: boolean
  gatewayUrl: string | null
}

type Tone = 'emerald' | 'amber' | 'sky' | 'slate' | 'rose'

const TONE: Record<
  Tone,
  { hero: string; badge: string; dot: string; soft: string; border: string; text: string }
> = {
  emerald: {
    hero: 'from-emerald-600 via-emerald-600 to-teal-700',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-400',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  amber: {
    hero: 'from-amber-500 via-amber-500 to-orange-600',
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dot: 'bg-amber-300',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  sky: {
    hero: 'from-sky-600 via-sky-600 to-blue-700',
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-300',
    soft: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  slate: {
    hero: 'from-slate-700 via-slate-800 to-slate-900',
    badge: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    dot: 'bg-slate-300',
    soft: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
  },
  rose: {
    hero: 'from-rose-600 via-rose-600 to-red-700',
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-300',
    soft: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
  },
}

const POLL_CONNECTED_MS = 5000
const POLL_DISCONNECTED_MS = 2500

function formatWaktu(iso: string | null) {
  if (!iso) return '-'
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return '-'
  return tanggal.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatRelatif(iso: string | null, now: number) {
  if (!iso || !now) return 'baru saja'
  const tanggal = new Date(iso).getTime()
  if (Number.isNaN(tanggal)) return 'baru saja'

  const detik = Math.max(0, Math.floor((now - tanggal) / 1000))
  if (detik < 5) return 'baru saja'
  if (detik < 60) return `${detik} detik lalu`
  const menit = Math.floor(detik / 60)
  if (menit < 60) return `${menit} menit lalu`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam} jam lalu`
  return `${Math.floor(jam / 24)} hari lalu`
}

function formatNomor(nomor: string | null) {
  if (!nomor) return '-'
  if (!nomor.startsWith('62')) return `+${nomor}`
  const sisa = nomor.slice(2)
  const kelompok = sisa.match(/.{1,4}/g) ?? [sisa]
  return `+62 ${kelompok.join('-')}`
}

function pesanError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Gagal memuat status gateway. Periksa koneksi ke server.'
}

function ringkasanStatus(status: WhatsAppGatewayStatus): {
  label: string
  deskripsi: string
  tone: Tone
  Icon: LucideIcon
  spinning?: boolean
} {
  if (status.connected) {
    return {
      label: 'Terhubung',
      deskripsi: 'Gateway siap mengirim notifikasi WhatsApp otomatis ke warga.',
      tone: 'emerald',
      Icon: CheckCircle2,
    }
  }

  if (!status.reachable) {
    return {
      label: 'Gateway tidak terjangkau',
      deskripsi: 'Server SIDU belum bisa menghubungi gateway WhatsApp. Periksa apakah api-WAHA sedang berjalan.',
      tone: 'rose',
      Icon: WifiOff,
    }
  }

  if (status.state === 'qr') {
    return status.qrDataUrl
      ? {
          label: 'Menunggu scan QR',
          deskripsi: 'Scan QR di bawah memakai WhatsApp untuk menautkan perangkat ke SIDU.',
          tone: 'amber',
          Icon: QrCode,
        }
      : {
          label: 'Menyiapkan QR',
          deskripsi: 'QR sedang dibuat atau diperbarui. Halaman ini akan menampilkan QR secara otomatis.',
          tone: 'sky',
          Icon: Loader2,
          spinning: true,
        }
  }

  if (status.state === 'connecting' || status.state === 'starting') {
    return {
      label: 'Menyambungkan…',
      deskripsi: 'Gateway sedang menyiapkan koneksi ke WhatsApp. Mohon tunggu beberapa detik.',
      tone: 'sky',
      Icon: Loader2,
      spinning: true,
    }
  }

  if (status.state === 'logged_out') {
    return {
      label: 'Sesi diakhiri',
      deskripsi: 'Perangkat sudah diputus dari WhatsApp. Hubungkan ulang untuk menampilkan QR baru.',
      tone: 'slate',
      Icon: Power,
    }
  }

  return {
    label: 'Terputus',
    deskripsi: 'Koneksi WhatsApp sedang terputus. Gateway akan mencoba menyambung ulang secara otomatis.',
    tone: 'amber',
    Icon: AlertCircle,
  }
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2'

const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

const btnDanger = `inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

function InfoCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description?: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right text-xs font-semibold text-slate-800 ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

export default function WhatsAppGatewayClient({
  initialStatus = null,
  config,
  embedded = false,
}: {
  initialStatus?: WhatsAppGatewayStatus | null
  config: WhatsAppGatewayConfigView
  /** Tampilan ringkas saat ditanam sebagai tab di halaman Pengaturan. */
  embedded?: boolean
}) {
  const [status, setStatus] = useState<WhatsAppGatewayStatus>(
    initialStatus ?? statusAwalGateway()
  )
  const [lastError, setLastError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [action, setAction] = useState<'logout' | 'connect' | 'reset' | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [now, setNow] = useState(0)
  const delayedRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tampilan = ringkasanStatus(status)
  const tone = TONE[tampilan.tone]
  const { Icon } = tampilan

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/dashboard/whatsapp/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(data?.error || `Gagal memuat status gateway (HTTP ${res.status}).`)
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Respons status gateway tidak valid.')
    }

    setStatus(data as WhatsAppGatewayStatus)
    setLastError(null)
    return data as WhatsAppGatewayStatus
  }, [])

  // Polling status supaya UI berubah tanpa reload halaman.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const controller = new AbortController()

    const tick = async () => {
      if (cancelled) return

      // Hemat permintaan saat tab tidak terlihat.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timer = setTimeout(tick, 6000)
        return
      }

      let delay = POLL_DISCONNECTED_MS
      try {
        const fresh = await loadStatus(controller.signal)
        delay = fresh.connected ? POLL_CONNECTED_MS : POLL_DISCONNECTED_MS
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return
        setLastError(pesanError(error))
        delay = 5000
      } finally {
        if (!cancelled) timer = setTimeout(tick, delay)
      }
    }

    tick()

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [loadStatus])

  // Jam kecil untuk teks "x detik lalu".
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current)
    }
  }, [])

  useEffect(() => {
    if (!showLogoutModal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLogoutModal(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showLogoutModal])

  async function refreshManual() {
    if (isRefreshing || action) return
    setIsRefreshing(true)
    try {
      await loadStatus()
    } catch (error) {
      setLastError(pesanError(error))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function jalankanAksi(kind: 'logout' | 'connect', reset = false) {
    if (action) return
    setAction(kind === 'connect' && reset ? 'reset' : kind)
    setNotice(null)
    setLastError(null)

    try {
      const endpoint = kind === 'logout' ? 'logout' : 'connect'
      const res = await fetch(`/api/dashboard/whatsapp/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(kind === 'connect' ? { reset } : {}),
      })
      const data = await res.json().catch(() => null)
      const berhasil = res.ok && data?.ok !== false

      setNotice({
        type: berhasil ? 'success' : 'error',
        text:
          data?.message ||
          (berhasil ? 'Permintaan berhasil diproses.' : 'Permintaan gagal diproses.'),
      })

      if (kind === 'logout') {
        setShowLogoutModal(false)
        try {
          await loadStatus()
        } catch {
          // Polling berikutnya akan memperbarui status.
        }
      } else if (berhasil) {
        // Gateway perlu beberapa detik untuk menyiapkan QR baru.
        if (delayedRefreshRef.current) clearTimeout(delayedRefreshRef.current)
        delayedRefreshRef.current = setTimeout(() => {
          loadStatus().catch(() => {
            // Abaikan; polling utama tetap berjalan.
          })
        }, 2000)
      }
    } catch (error) {
      setNotice({ type: 'error', text: pesanError(error) })
    } finally {
      setAction(null)
    }
  }

  const busy = action !== null
  const statusRingkas = status.connected
    ? 'Terhubung'
    : !status.reachable
      ? 'Tidak terjangkau'
      : status.state === 'qr'
        ? 'Menunggu QR'
        : status.state === 'logged_out'
          ? 'Sesi diakhiri'
          : 'Terputus'

  const statusActions = (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone.badge}`}
        aria-live="polite"
      >
        <span
          className={`h-2 w-2 rounded-full ${tone.dot} ${
            !status.connected && !busy ? 'animate-pulse' : ''
          }`}
        />
        {statusRingkas}
      </span>
      <button
        type="button"
        onClick={refreshManual}
        disabled={isRefreshing || busy}
        className={btnSecondary}
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
          aria-hidden="true"
        />
        {isRefreshing ? 'Memuat…' : 'Muat Ulang'}
      </button>
    </div>
  )

  return (
    <div className={embedded ? 'space-y-5' : 'mx-auto max-w-6xl space-y-6 pb-12'}>
      {embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Monitor Koneksi</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Status koneksi diperbarui otomatis. Pindai QR di bawah bila perangkat perlu
              ditautkan ulang.
            </p>
          </div>
          {statusActions}
        </div>
      ) : (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Integrasi WhatsApp
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
              WhatsApp Gateway
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Pantau status koneksi, tautkan perangkat lewat QR Code, dan putuskan sesi WhatsApp
              langsung dari SIDU. Status diperbarui otomatis tanpa perlu me-refresh halaman.
            </p>
          </div>
          {statusActions}
        </header>
      )}

      {/* Notifikasi hasil aksi / error polling */}
      {notice && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 leading-relaxed">{notice.text}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 rounded-lg px-1.5 text-xs font-bold opacity-60 hover:opacity-100"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      {lastError && !notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="leading-relaxed">
            {lastError} Data di bawah mungkin sudah tidak terbaru; status akan dicoba lagi otomatis.
          </p>
        </div>
      )}

      <div
        className={
          embedded
            ? 'grid gap-5'
            : 'grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'
        }
      >
        {/* Kartu utama */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className={`relative overflow-hidden bg-gradient-to-br ${tone.hero} p-6 text-white sm:p-7`}>
            <div
              className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/20">
                  <Icon
                    className={`h-6 w-6 ${tampilan.spinning ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                    Status Koneksi WhatsApp
                  </p>
                  <h2 className="mt-1 text-xl font-bold sm:text-2xl">{tampilan.label}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/80">
                    {tampilan.deskripsi}
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ring-white/20">
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${status.connected ? '' : 'animate-pulse'}`} />
                {status.connected ? 'Live' : 'Memantau'}
              </span>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-7">
            {/* QR Code */}
            {!status.connected && status.qrDataUrl && (
              <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  {/* Data URL dari gateway; CSP img-src mengizinkan data: */}
                  <img
                    src={status.qrDataUrl}
                    alt="QR Code untuk menautkan perangkat WhatsApp ke SIDU"
                    width={280}
                    height={280}
                    className="h-56 w-56 rounded-lg object-contain sm:h-64 sm:w-64"
                  />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                    QR siap dipindai
                  </span>
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    Tautkan WhatsApp ke SIDU
                  </h3>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                    <li>
                      <span className="font-semibold text-slate-800">1.</span> Buka WhatsApp di
                      ponsel yang akan dipakai sebagai pengirim.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">2.</span> Ketuk menu{' '}
                      <span className="font-semibold">Perangkat tertaut</span> →{' '}
                      <span className="font-semibold">Tautkan perangkat</span>.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">3.</span> Arahkan kamera ke QR
                      Code di samping.
                    </li>
                  </ol>
                  <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500 ring-1 ring-inset ring-slate-200">
                    QR berlaku sementara dan diperbarui otomatis. Halaman ini akan langsung berubah
                    menjadi <span className="font-semibold text-slate-700">Terhubung</span> setelah
                    ponsel berhasil menaut.
                    {status.qrUpdatedAt && (
                      <> Diperbarui {formatRelatif(status.qrUpdatedAt, now)}.</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Menyiapkan QR / menyambung */}
            {!status.connected && !status.qrDataUrl && status.reachable &&
              (status.state === 'qr' || status.state === 'connecting' || status.state === 'starting') && (
                <div className="flex items-start gap-4 rounded-xl border border-sky-200 bg-sky-50 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 ring-1 ring-inset ring-sky-200">
                    <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-sky-900">Menyiapkan sesi WhatsApp…</p>
                    <p className="mt-1 text-sm leading-relaxed text-sky-800">
                      Gateway sedang membuat QR Code. QR akan muncul di sini secara otomatis dalam
                      beberapa detik, tidak perlu memuat ulang halaman.
                    </p>
                  </div>
                </div>
              )}

            {/* Terhubung: info sesi singkat */}
            {status.connected && (
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                    Nomor terhubung
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                    {formatNomor(status.phoneNumber)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {status.pushName
                      ? `Perangkat: ${status.pushName}`
                      : 'Perangkat WhatsApp aktif sebagai pengirim notifikasi.'}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    Terhubung sejak {formatWaktu(status.connectedAt)} (
                    {formatRelatif(status.connectedAt, now)})
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" onClick={refreshManual} disabled={isRefreshing || busy} className={btnSecondary}>
                    <RefreshCw
                      className={`h-4 w-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
                      aria-hidden="true"
                    />
                    Segarkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    disabled={busy}
                    className={btnDanger}
                  >
                    <Power className="h-4 w-4" aria-hidden="true" />
                    Putuskan Koneksi
                  </button>
                </div>
              </div>
            )}

            {/* Terputus / logout / gateway tidak terjangkau */}
            {!status.connected &&
              !(
                status.reachable &&
                (status.state === 'qr' || status.state === 'connecting' || status.state === 'starting')
              ) && (
                <div
                  className={`rounded-xl border p-5 ${
                    !status.reachable
                      ? 'border-rose-200 bg-rose-50'
                      : status.state === 'logged_out'
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-inset ${
                        !status.reachable
                          ? 'text-rose-600 ring-rose-200'
                          : status.state === 'logged_out'
                            ? 'text-slate-600 ring-slate-200'
                            : 'text-amber-600 ring-amber-200'
                      }`}
                    >
                      {!status.reachable ? (
                        <WifiOff className="h-5 w-5" aria-hidden="true" />
                      ) : status.state === 'logged_out' ? (
                        <Power className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold ${
                          !status.reachable
                            ? 'text-rose-900'
                            : status.state === 'logged_out'
                              ? 'text-slate-900'
                              : 'text-amber-900'
                        }`}
                      >
                        {!status.reachable
                          ? 'Gateway WhatsApp belum dapat dihubungi'
                          : status.state === 'logged_out'
                            ? 'Sesi WhatsApp sudah diputus'
                            : 'WhatsApp belum terhubung'}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-relaxed ${
                          !status.reachable
                            ? 'text-rose-800'
                            : status.state === 'logged_out'
                              ? 'text-slate-600'
                              : 'text-amber-800'
                        }`}
                      >
                        {status.error ||
                          status.lastDisconnectReason ||
                          (status.state === 'logged_out'
                            ? 'Hubungkan ulang untuk menampilkan QR Code baru, lalu scan memakai WhatsApp.'
                            : 'Gateway akan mencoba menyambung ulang otomatis. Anda juga dapat memulai ulang dari sini.')}
                      </p>

                      {!status.reachable && (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-rose-800">
                          <li>Pastikan server api-WAHA berjalan di alamat yang tertera pada konfigurasi.</li>
                          <li>Periksa apakah Token / API Key gateway sudah sama dengan server.</li>
                          <li>Pastikan server SIDU dapat menjangkau alamat gateway (localhost/LAN/domain).</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Tombol aksi saat tidak terhubung */}
            {!status.connected && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => jalankanAksi('connect')}
                  disabled={busy}
                  className={btnPrimary}
                >
                  {action === 'connect' ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  {action === 'connect' ? 'Menyambungkan…' : 'Hubungkan Ulang'}
                </button>

                {status.state !== 'logged_out' && (
                  <button
                    type="button"
                    onClick={() => jalankanAksi('connect', true)}
                    disabled={busy}
                    className={btnSecondary}
                    title="Hapus sesi lama di gateway lalu tampilkan QR baru"
                  >
                    {action === 'reset' ? (
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <QrCode className="h-4 w-4" aria-hidden="true" />
                    )}
                    {action === 'reset' ? 'Menyiapkan…' : 'Sesi Baru (QR)'}
                  </button>
                )}

                <p className="text-[11px] leading-relaxed text-slate-500">
                  Gunakan <span className="font-semibold">Sesi Baru (QR)</span> bila QR tidak muncul
                  atau sesi lama ingin dihapus.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${status.connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                Terakhir diperiksa {formatRelatif(status.checkedAt, now)}
              </span>
              <span>
                Pemeriksaan otomatis setiap {status.connected ? POLL_CONNECTED_MS / 1000 : POLL_DISCONNECTED_MS / 1000} detik
              </span>
            </div>
          </div>
        </section>

        {/* Kolom samping */}
        <div className="space-y-6">
          <InfoCard
            title="Informasi Sesi"
            description="Detail perangkat WhatsApp yang sedang dipantau gateway."
            icon={Phone}
          >
            <dl className="space-y-3">
              <InfoRow
                label="Status"
                value={
                  <span className={`inline-flex items-center gap-1.5 ${tone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {tampilan.label}
                  </span>
                }
              />
              <InfoRow label="Nomor" value={formatNomor(status.phoneNumber)} mono />
              <InfoRow label="Nama perangkat" value={status.pushName || '-'} />
              <InfoRow
                label="Terhubung sejak"
                value={status.connectedAt ? formatWaktu(status.connectedAt) : '-'}
              />
              <InfoRow label="Terakhir diperiksa" value={formatWaktu(status.checkedAt)} />
              <InfoRow
                label="Latensi gateway"
                value={typeof status.latencyMs === 'number' ? `${status.latencyMs} ms` : '-'}
              />
              <InfoRow
                label="Server gateway"
                value={status.gatewayUrl || config.gatewayUrl || '-'}
                mono
              />
            </dl>

            {status.lastDisconnectReason && !status.connected && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Alasan terakhir terputus
                </p>
                <p className="mt-1 break-words text-xs leading-relaxed text-slate-700">
                  {status.lastDisconnectReason}
                </p>
              </div>
            )}
          </InfoCard>

          {!embedded && (
          <InfoCard
            title="Konfigurasi Gateway"
            description="Dibaca dari Pengaturan WhatsApp di database SIDU."
            icon={Settings}
          >
            <dl className="space-y-3">
              <InfoRow label="API URL" value={config.apiUrl} mono />
              <InfoRow
                label="Token / API Key"
                value={config.hasToken ? config.tokenMasked || 'Tersimpan' : 'Belum diatur'}
              />
              <InfoRow label="Sender number" value={config.senderNumber || '-'} mono />
              <InfoRow
                label="Notifikasi otomatis"
                value={
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                      config.enabled
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-800 ring-amber-600/20'
                    }`}
                  >
                    {config.enabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                }
              />
            </dl>

            {(!config.hasToken || !config.enabled) && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <p>
                  {!config.hasToken
                    ? 'Token gateway belum diisi. Pemantauan status memerlukan token yang sama dengan server gateway.'
                    : 'Notifikasi otomatis sedang nonaktif. Status koneksi tetap dapat dipantau, tetapi pesan tidak dikirim ke warga.'}
                </p>
              </div>
            )}

            <Link
              href="/dashboard/settings"
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${focusRing}`}
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Buka Pengaturan
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </InfoCard>
          )}

          <InfoCard
            title="Cara Menghubungkan"
            description="Langkah singkat menautkan WhatsApp ke gateway SIDU."
            icon={ShieldCheck}
          >
            <ol className="space-y-3 text-xs leading-relaxed text-slate-600">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  1
                </span>
                Pastikan server <span className="font-semibold text-slate-800">api-WAHA</span>{' '}
                berjalan dan API URL di Pengaturan mengarah ke server tersebut.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  2
                </span>
                Jika belum terhubung, QR Code muncul otomatis di halaman ini.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  3
                </span>
                Scan QR dari WhatsApp → Perangkat tertaut → Tautkan perangkat.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  4
                </span>
                Status berubah menjadi Terhubung tanpa perlu me-refresh browser.
              </li>
            </ol>
          </InfoCard>
        </div>
      </div>

      {/* Modal konfirmasi logout */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-wa-title"
        >
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 id="logout-wa-title" className="text-base font-bold text-slate-900">
                Putuskan Koneksi WhatsApp?
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Perangkat <span className="font-semibold text-slate-800">{formatNomor(status.phoneNumber)}</span>{' '}
                akan keluar dari gateway. Notifikasi otomatis berhenti sampai Anda scan QR baru.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={busy}
                className={`flex-1 ${btnSecondary}`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => jalankanAksi('logout')}
                disabled={busy}
                className={`flex-1 ${btnDanger}`}
              >
                {action === 'logout' ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Plug className="h-4 w-4" aria-hidden="true" />
                )}
                {action === 'logout' ? 'Memutuskan…' : 'Ya, Putuskan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
