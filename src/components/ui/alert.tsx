'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from 'lucide-react'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertOptions {
  title: string
  message?: string
  type?: AlertType
  confirmText?: string
  cancelText?: string
  /** Tampilkan tombol batal. Default true untuk tipe warning. */
  showCancel?: boolean
  /** Kunci dialog sampai tombol ditekan (klik luar tidak menutup). */
  persistent?: boolean
  /** Tampilkan indikator loading pada tombol konfirmasi. */
  loading?: boolean
}

interface AlertState extends AlertOptions {
  id: number
  resolve: (value: boolean) => void
}

interface AlertContextValue {
  show: (options: AlertOptions) => Promise<boolean>
  success: (title: string, message?: string) => Promise<boolean>
  error: (title: string, message?: string) => Promise<boolean>
  warning: (title: string, message?: string) => Promise<boolean>
  info: (title: string, message?: string) => Promise<boolean>
  confirm: (options: AlertOptions) => Promise<boolean>
}

const AlertContext = createContext<AlertContextValue | null>(null)

const TYPE_STYLE: Record<
  AlertType,
  { icon: ReactNode; ring: string; bg: string; text: string; button: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-6 w-6" />,
    ring: 'ring-emerald-100',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    button: 'bg-emerald-700 hover:bg-emerald-800',
  },
  error: {
    icon: <XCircle className="h-6 w-6" />,
    ring: 'ring-rose-100',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    button: 'bg-rose-600 hover:bg-rose-700',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    ring: 'ring-amber-100',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    button: 'bg-rose-600 hover:bg-rose-700',
  },
  info: {
    icon: <Info className="h-6 w-6" />,
    ring: 'ring-teal-100',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    button: 'bg-slate-800 hover:bg-slate-900',
  },
}

/**
 * Penyedia dialog notifikasi terpusat. Semua panggilan `useAlert()` di dalam
 * aplikasi akan memakai satu tampilan yang konsisten (bukan alert bawaan
 * browser atau pustaka pihak ketiga).
 */
export function AlertProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AlertState[]>([])
  const idRef = useRef(0)

  const show = useCallback((options: AlertOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = ++idRef.current
      setQueue((prev) => [...prev, { ...options, id, resolve }])
    })
  }, [])

  const close = useCallback((id: number, value: boolean) => {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id)
      target?.resolve(value)
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const value = useMemo<AlertContextValue>(
    () => ({
      show,
      success: (title, message) => show({ title, message, type: 'success' }),
      error: (title, message) => show({ title, message, type: 'error' }),
      warning: (title, message) =>
        show({ title, message, type: 'warning', showCancel: true }),
      info: (title, message) => show({ title, message, type: 'info' }),
      confirm: (options) => show({ ...options, showCancel: true }),
    }),
    [show]
  )

  const active = queue[0] ?? null

  useEffect(() => {
    if (!active) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(active.id, false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, close])

  return (
    <AlertContext.Provider value={value}>
      {children}
      {active && (
        <AlertDialog
          key={active.id}
          state={active}
          onClose={(result) => close(active.id, result)}
        />
      )}
    </AlertContext.Provider>
  )
}

function AlertDialog({
  state,
  onClose,
}: {
  state: AlertState
  onClose: (result: boolean) => void
}) {
  const type = state.type ?? 'info'
  const style = TYPE_STYLE[type]
  const showCancel = state.showCancel ?? type === 'warning'

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !state.persistent && !state.loading) {
          onClose(false)
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="custom-alert-title"
        aria-describedby={state.message ? 'custom-alert-message' : undefined}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}
          >
            {style.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="custom-alert-title"
              className="text-sm font-bold leading-snug text-slate-900"
            >
              {state.title}
            </h2>
            {state.message && (
              <p
                id="custom-alert-message"
                className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-600"
              >
                {state.message}
              </p>
            )}
          </div>
          {!state.loading && (
            <button
              type="button"
              onClick={() => onClose(false)}
              aria-label="Tutup"
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          {showCancel && (
            <button
              type="button"
              disabled={state.loading}
              onClick={() => onClose(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {state.cancelText || 'Batal'}
            </button>
          )}
          <button
            type="button"
            disabled={state.loading}
            onClick={() => onClose(true)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-60 ${style.button}`}
          >
            {state.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {state.confirmText || (showCancel ? 'Ya, Lanjutkan' : 'Mengerti')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert harus dipakai di dalam <AlertProvider>.')
  }
  return context
}
