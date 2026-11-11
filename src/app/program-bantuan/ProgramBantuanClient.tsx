'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'

interface PenerimaBantuan {
  id: string
  nama: string
  nik: string
  dusun: string
  program: string
  periode: string
  nominal: number | null
  status: 'AKTIF' | 'SELESAI' | 'DICABUT'
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
}

const FALLBACK_PROGRAMS = ['PKH', 'BPNT', 'BLT-DD', 'PBI-JK', 'BST']

const STATUS_STYLE: Record<string, string> = {
  AKTIF: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SELESAI: 'bg-slate-100 text-slate-600 ring-slate-200',
  DICABUT: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function formatNominal(nominal: number | null) {
  if (nominal === null || nominal === 0) return 'Non-tunai / layanan'
  return `Rp ${nominal.toLocaleString('id-ID')}`
}

export default function ProgramBantuanClient({
  namaDesa,
  sloganDesa,
  logoDesa,
}: {
  namaDesa: string
  sloganDesa: string
  logoDesa: string | null
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [program, setProgram] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<PenerimaBantuan[]>([])
  const [programs, setPrograms] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Tunda pencarian agar tidak memanggil API pada setiap ketikan.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()
        if (debouncedQuery) params.set('q', debouncedQuery)
        if (program) params.set('program', program)
        if (page > 1) params.set('page', String(page))

        const res = await fetch(`/api/bansos-publik?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal memuat data bantuan.')
        }

        setData(json.data ?? [])
        setPagination(json.pagination)
        if (Array.isArray(json.programs) && json.programs.length > 0) {
          setPrograms(json.programs)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError((err as Error).message || 'Gagal memuat data bantuan.')
        setData([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [debouncedQuery, program, page])

  const programOptions = useMemo(() => {
    const merged = new Set<string>([...FALLBACK_PROGRAMS, ...programs])
    return Array.from(merged).sort()
  }, [programs])

  const hasFilter = Boolean(debouncedQuery || program)

  const resetFilter = () => {
    setQuery('')
    setProgram('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 font-[family-name:var(--font-geist-sans)] text-slate-600">
      {/* Header ringkas, senada dengan navbar landing page */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg">
            {logoDesa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoDesa}
                alt="Logo Desa"
                className="h-10 w-10 shrink-0 object-contain"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                <HandHeart className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-900">
                {namaDesa}
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                {sloganDesa}
              </span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
            <span className="sm:hidden">Beranda</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Judul halaman */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
            <HandHeart className="h-3.5 w-3.5" />
            Transparansi Bantuan Sosial
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Cek Penerima Bantuan
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Cari nama atau NIK Anda untuk memeriksa status bantuan sosial yang
            tercatat di database desa. Data ditampilkan secara terbuka dengan NIK
            yang disamarkan untuk menjaga privasi.
          </p>
        </div>

        {/* Panel pencarian */}
        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari berdasarkan NIK atau nama warga..."
                aria-label="Cari berdasarkan NIK atau nama warga"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={program}
                onChange={(event) => {
                  setProgram(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter jenis bantuan"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 sm:w-52"
              >
                <option value="">Semua jenis bantuan</option>
                {programOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {hasFilter && (
                <button
                  type="button"
                  onClick={resetFilter}
                  className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            NIK hanya ditampilkan sebagian. Pencarian NIK tetap diproses di
            server terhadap data asli.
          </p>
        </div>

        {/* Ringkasan hasil */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Daftar Penerima
          </h2>
          <p className="text-xs text-slate-500">
            {loading
              ? 'Memuat data...'
              : `${pagination.totalItems.toLocaleString('id-ID')} data ditemukan`}
          </p>
        </div>

        {/* Hasil */}
        <div className="relative mt-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-16 text-sm font-semibold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Memuat data penerima bantuan...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Data tidak ditemukan
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Periksa kembali NIK/nama yang dimasukkan, atau coba pilih jenis
                bantuan lain.
              </p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((item) => (
                <article
                  key={item.id}
                  className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {item.nama}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        NIK {item.nik}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${
                        STATUS_STYLE[item.status] ?? STATUS_STYLE.SELESAI
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <HandHeart className="h-4 w-4 shrink-0 text-emerald-600" />
                      <dt className="sr-only">Program</dt>
                      <dd className="font-semibold text-slate-800">
                        {item.program}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                      <dt className="sr-only">Periode</dt>
                      <dd className="text-slate-600">{item.periode || '-'}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                      <dt className="sr-only">Dusun</dt>
                      <dd className="text-slate-600">{item.dusun}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 shrink-0 text-emerald-600" />
                      <dt className="sr-only">Nominal</dt>
                      <dd className="font-semibold text-slate-800">
                        {formatNominal(item.nominal)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Paginasi */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 sm:flex-row">
            <p className="text-xs text-slate-500">
              Halaman{' '}
              <span className="font-semibold text-slate-800">
                {pagination.currentPage}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-slate-800">
                {pagination.totalPages}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={pagination.currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(pagination.totalPages, value + 1))
                }
                disabled={pagination.currentPage >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-slate-500">
          Catatan: data penerima bantuan diperbarui oleh perangkat desa. Jika
          Anda merasa berhak tetapi belum terdaftar, silakan hubungi kantor desa
          dengan membawa KTP dan Kartu Keluarga.
        </p>
      </main>
    </div>
  )
}
