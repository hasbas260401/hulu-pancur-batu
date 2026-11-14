import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { isAksiMencurigakan } from '@/lib/audit'
import { PER_HALAMAN, type AuditLogData, type AuditLogJenis } from './types'

type Tone = 'normal' | 'warning' | 'danger'

const AKSI_LABEL: Record<string, { label: string; tone: Tone }> = {
  LOGIN: { label: 'Login berhasil', tone: 'normal' },
  LOGOUT: { label: 'Logout', tone: 'normal' },
  REGISTER_WARGA: { label: 'Pendaftaran akun warga', tone: 'normal' },
  RESET_PASSWORD: { label: 'Mengubah kata sandi', tone: 'normal' },
  MINTA_RESET_PASSWORD: { label: 'Meminta tautan reset kata sandi', tone: 'normal' },
  TAMBAH_WARGA: { label: 'Menambah data warga', tone: 'normal' },
  EDIT_WARGA: { label: 'Mengubah data warga', tone: 'normal' },
  UBAH_STATUS_WARGA: { label: 'Mengubah status warga', tone: 'normal' },
  HAPUS_WARGA: { label: 'Menghapus data warga', tone: 'warning' },
  IMPORT_WARGA: { label: 'Mengimpor data warga', tone: 'normal' },
  AJUKAN_SURAT: { label: 'Mengajukan surat', tone: 'normal' },
  UBAH_STATUS_SURAT: { label: 'Mengubah status surat', tone: 'normal' },
  KIRIM_WA_SURAT: { label: 'Notifikasi WhatsApp surat', tone: 'normal' },
  UBAH_PENGATURAN_WA: { label: 'Mengubah pengaturan WhatsApp', tone: 'warning' },
  UJI_WA_GATEWAY: { label: 'Uji kirim WhatsApp Gateway', tone: 'normal' },
  BUAT_USER: { label: 'Membuat akun pengguna', tone: 'normal' },
  UBAH_USER: { label: 'Mengubah akun pengguna', tone: 'normal' },
  HAPUS_USER: { label: 'Menghapus akun pengguna', tone: 'warning' },
  GENERATE_API_KEY: { label: 'Membuat API key baru', tone: 'warning' },
  AKTIFKAN_API_KEY: { label: 'Mengaktifkan API key', tone: 'normal' },
  NONAKTIFKAN_API_KEY: { label: 'Menonaktifkan API key', tone: 'warning' },
  RESET_DB: { label: 'Mengosongkan database', tone: 'warning' },
  RESET_DB_GAGAL: { label: 'Gagal mengosongkan database (kata sandi salah)', tone: 'danger' },
  SECURITY_LOGIN_GAGAL: { label: 'Login gagal', tone: 'danger' },
  SECURITY_LOGIN_DIBLOKIR: { label: 'Percobaan login diblokir (rate limit)', tone: 'danger' },
  SECURITY_AKUN_TERKUNCI: { label: 'Percobaan login ke akun terkunci', tone: 'danger' },
  SECURITY_INJEKSI_PAYLOAD: { label: 'Indikasi injeksi payload', tone: 'danger' },
  SECURITY_AKSES_ILEGAL: { label: 'Akses ilegal / pelanggaran otorisasi', tone: 'danger' },
  SECURITY_API_KEY_INVALID: { label: 'API key tidak valid', tone: 'danger' },
}

function labelAksi(aksi: string) {
  return AKSI_LABEL[aksi] ?? {
    label: aksi.split('_').join(' ').toLowerCase(),
    tone: isAksiMencurigakan(aksi) ? ('danger' as Tone) : ('normal' as Tone),
  }
}

const TONE_BADGE: Record<Tone, string> = {
  normal: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

function formatWaktu(tanggal: Date) {
  return tanggal.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatNilai(nilai: unknown): string {
  if (nilai === null || nilai === undefined || nilai === '') return '-'
  if (typeof nilai === 'string') return nilai.length > 70 ? `${nilai.slice(0, 70)}…` : nilai
  if (typeof nilai === 'number' || typeof nilai === 'boolean') return String(nilai)
  try {
    const teks = JSON.stringify(nilai)
    return teks.length > 70 ? `${teks.slice(0, 70)}…` : teks
  } catch {
    return '-'
  }
}

function ambilDetail(detail: unknown): Record<string, unknown> {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return {}
  const hasil: Record<string, unknown> = {}
  for (const [kunci, nilai] of Object.entries(detail as Record<string, unknown>)) {
    if (kunci === 'mencurigakan' || kunci === 'tingkat') continue
    hasil[kunci] = nilai
  }
  return hasil
}

function buatTautan(
  basePath: string,
  tab: string | undefined,
  params: { q: string; jenis: AuditLogJenis; page: number }
) {
  const sp = new URLSearchParams()
  if (tab) sp.set('tab', tab)
  if (params.q) sp.set('q', params.q)
  if (params.jenis === 'mencurigakan') sp.set('jenis', 'mencurigakan')
  if (params.page > 1) sp.set('page', String(params.page))
  const query = sp.toString()
  return `${basePath}${query ? `?${query}` : ''}`
}

export default function AuditLogPanel({
  data,
  basePath,
  tab,
  embedded = false,
}: {
  data: AuditLogData
  /** Halaman yang menampung panel, mis. /dashboard/settings. */
  basePath: string
  /** Nama query param tab agar filter tidak keluar dari tab Audit Log. */
  tab?: string
  /** Tampilan ringkas tanpa judul halaman (dipakai di dalam Pengaturan). */
  embedded?: boolean
}) {
  const { rows, total, totalMencurigakan, totalHariIni, page, q, jenis } = data

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN))
  const halamanAktif = Math.min(page, totalHalaman)
  const mulai = total === 0 ? 0 : (halamanAktif - 1) * PER_HALAMAN + 1
  const selesai = Math.min(halamanAktif * PER_HALAMAN, total)

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-6 pb-10'}>
      {!embedded && (
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Keamanan &amp; Transparansi</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
              Audit Log Aktivitas
            </h1>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              Riwayat seluruh aktivitas pengguna dan admin. Baris berlatar merah menandai
              tindakan mencurigakan seperti percobaan injeksi, akses ilegal, atau pelanggaran
              otorisasi.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-semibold text-slate-500 shadow-sm">
            Zona waktu: WIB (Asia/Jakarta)
          </div>
        </header>
      )}

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total catatan</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {total.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Aktivitas hari ini</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Fingerprint className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {totalHariIni.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-rose-700">Mencurigakan</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-700">
            {totalMencurigakan.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buatTautan(basePath, tab, { q, jenis: 'semua', page: 1 })}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              jenis === 'semua'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Aktivitas
          </Link>
          <Link
            href={buatTautan(basePath, tab, { q, jenis: 'mencurigakan', page: 1 })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              jenis === 'mencurigakan'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Hanya Mencurigakan
          </Link>
        </div>

        <form
          method="get"
          action={basePath}
          className="flex w-full items-center gap-2 lg:w-auto"
        >
          {tab && <input type="hidden" name="tab" value={tab} />}
          {jenis === 'mencurigakan' && <input type="hidden" name="jenis" value="mencurigakan" />}
          <div className="relative min-w-0 flex-1 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari nama, NIK, aksi, atau IP…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Tidak ada catatan yang cocok</p>
            <p className="mt-1 text-xs text-slate-500">
              {q
                ? `Pencarian “${q}” tidak menemukan aktivitas.`
                : 'Belum ada aktivitas yang tercatat.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-bold">Waktu</th>
                  <th className="px-4 py-3 font-bold">Pengguna</th>
                  <th className="px-4 py-3 font-bold">Aktivitas</th>
                  <th className="px-4 py-3 font-bold">Entitas</th>
                  <th className="px-4 py-3 font-bold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const mencurigakan = isAksiMencurigakan(row.aksi)
                  const info = labelAksi(row.aksi)
                  const detail = ambilDetail(row.detail)
                  const nama =
                    row.user?.warga?.nama ||
                    row.user?.username ||
                    (typeof detail.username === 'string' ? detail.username : null) ||
                    'Tidak dikenal'
                  const nik = row.user?.warga?.nik
                  const inisial = nama.charAt(0).toUpperCase() || '?'

                  return (
                    <tr
                      key={row.id}
                      className={
                        mencurigakan
                          ? 'border-l-4 border-l-rose-500 bg-rose-50/70 align-top hover:bg-rose-50'
                          : 'align-top hover:bg-slate-50'
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                        <span className="font-semibold text-slate-700">{formatWaktu(row.createdAt)}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              mencurigakan
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {inisial}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-800">{nama}</p>
                            <p className="truncate font-mono text-[11px] text-slate-500">
                              {nik ? `NIK ${nik}` : row.user?.username ?? 'tanpa akun'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${TONE_BADGE[info.tone]}`}
                          >
                            {mencurigakan && <ShieldAlert className="h-3 w-3" />}
                            {info.label}
                          </span>
                          {mencurigakan && (
                            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                              Mencurigakan
                            </span>
                          )}
                        </div>
                        {Object.keys(detail).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {Object.entries(detail)
                              .slice(0, 4)
                              .map(([kunci, nilai]) => (
                                <span
                                  key={kunci}
                                  className="max-w-[260px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                                  title={`${kunci}: ${formatNilai(nilai)}`}
                                >
                                  <span className="font-semibold text-slate-500">
                                    {kunci.split('_').join(' ')}:
                                  </span>{' '}
                                  {formatNilai(nilai)}
                                </span>
                              ))}
                          </div>
                        )}
                        <p className="mt-1 font-mono text-[10px] text-slate-400">{row.aksi}</p>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        <p className="font-semibold text-slate-700">{row.entitas}</p>
                        {row.entitasId && (
                          <p className="mt-0.5 max-w-[160px] truncate font-mono text-[10px] text-slate-400">
                            {row.entitasId}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-slate-500">
                        {row.ip || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row">
            <p className="text-[11px] font-semibold text-slate-500">
              Menampilkan {mulai}–{selesai} dari {total.toLocaleString('id-ID')} catatan
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buatTautan(basePath, tab, { q, jenis, page: Math.max(1, halamanAktif - 1) })}
                aria-disabled={halamanAktif <= 1}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                  halamanAktif <= 1
                    ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Sebelumnya
              </Link>
              <span className="text-[11px] font-bold text-slate-600">
                {halamanAktif} / {totalHalaman}
              </span>
              <Link
                href={buatTautan(basePath, tab, { q, jenis, page: Math.min(totalHalaman, halamanAktif + 1) })}
                aria-disabled={halamanAktif >= totalHalaman}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                  halamanAktif >= totalHalaman
                    ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Berikutnya
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          Catatan audit tidak dapat diubah atau dihapus dari antarmuka ini. Percobaan login
          gagal, injeksi payload, akses ke area admin tanpa hak, dan penggunaan API key yang
          tidak valid otomatis ditandai merah beserta alamat IP pemanggil.
        </p>
      </div>
    </div>
  )
}
