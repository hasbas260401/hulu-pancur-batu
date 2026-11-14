'use client'

import { useEffect, useRef, useState } from 'react'
import {
  KeyRound,
  Mail,
  Phone,
  Laptop,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  X,
  Plug,
  Copy,
  Check,
  Info,
  ShieldAlert,
  ScrollText,
  Database,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  updatePassword,
  updatePhone,
  revokeSession,
  generateApiKeyAction,
  toggleApiKeyAction,
  simpanPengaturanWhatsApp,
  ujiKirimWhatsApp,
  type WhatsAppConfigView,
} from './actions'
import ResetDbModal from './ResetDbModal'
import WhatsAppGatewayClient from '../whatsapp/WhatsAppGatewayClient'
import type { AuthTypeWhatsApp } from '@/lib/whatsapp'

type SessionItem = {
  id: string
  device: string
  ip: string
  isCurrent: boolean
  loginAt: string
}

type JenisApi = 'WARGA' | 'BANSOS'

type ApiKeyItem = {
  jenis: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: string | null
}

type TabKey =
  | 'password'
  | 'email'
  | 'phone'
  | 'sessions'
  | 'api'
  | 'whatsapp'
  | 'audit'
  | 'advanced'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'password', label: 'Kata Sandi', icon: KeyRound },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'phone', label: 'WhatsApp Pribadi', icon: Phone },
  { key: 'sessions', label: 'Perangkat Aktif', icon: Laptop },
]

// Tab khusus ADMIN
const API_TAB: { key: TabKey; label: string; icon: LucideIcon } = {
  key: 'api',
  label: 'Integrasi API',
  icon: Plug,
}

// Tab pengaturan lanjutan: hanya ADMIN (zona berbahaya + tautan audit)
const ADVANCED_TAB: { key: TabKey; label: string; icon: LucideIcon } = {
  key: 'advanced',
  label: 'Keamanan & Data',
  icon: ShieldAlert,
}

// Tab konfigurasi WhatsApp Gateway: hanya ADMIN
const WHATSAPP_TAB: { key: TabKey; label: string; icon: LucideIcon } = {
  key: 'whatsapp',
  label: 'WhatsApp Gateway',
  icon: MessageCircle,
}

// Tab Audit Log: hanya ADMIN, ditanam langsung di area Pengaturan.
const AUDIT_TAB: { key: TabKey; label: string; icon: LucideIcon } = {
  key: 'audit',
  label: 'Audit Log',
  icon: ScrollText,
}

type DocParam = { name: string; desc: string }
type DocField = { name: string; type: string; desc: string }

type ApiJenisConfig = {
  jenis: JenisApi
  title: string
  path: string
  desc: string
  params: string
  docParams: DocParam[]
  fields: DocField[]
  example: unknown
}

const PAGING_PARAMS: DocParam[] = [
  { name: 'page', desc: 'Nomor halaman. Bawaan: 1.' },
  { name: 'limit', desc: 'Jumlah data per halaman. Bawaan: 100, maksimum: 500.' },
]

const API_JENIS: ApiJenisConfig[] = [
  {
    jenis: 'WARGA',
    title: 'Data Warga',
    path: '/api/external/warga',
    desc: 'Daftar warga beserta NIK, nomor KK, alamat, dan dusun. NIK disamarkan secara bawaan.',
    params: 'page, limit (maks. 500), status (AKTIF, PINDAH, MENINGGAL, SEMUA), nik (masked, full)',
    docParams: [
      ...PAGING_PARAMS,
      { name: 'status', desc: 'Filter status warga: AKTIF (bawaan), PINDAH, MENINGGAL, atau SEMUA.' },
      {
        name: 'nik',
        desc: 'Bentuk NIK pada respons: masked (bawaan, mis. 1200********0001) atau full (NIK lengkap). Gunakan full hanya bila benar-benar diperlukan.',
      },
    ],
    fields: [
      { name: 'nik', type: 'string', desc: 'Nomor Induk Kependudukan. Disamarkan kecuali memakai parameter nik=full.' },
      { name: 'nama', type: 'string', desc: 'Nama lengkap.' },
      { name: 'jenisKelamin', type: 'string', desc: 'LAKI_LAKI atau PEREMPUAN.' },
      { name: 'tempatLahir', type: 'string | null', desc: 'Tempat lahir.' },
      { name: 'tanggalLahir', type: 'string', desc: 'Tanggal lahir, format YYYY-MM-DD.' },
      { name: 'agama', type: 'string | null', desc: 'Agama.' },
      { name: 'pekerjaan', type: 'string | null', desc: 'Pekerjaan.' },
      { name: 'statusPerkawinan', type: 'string | null', desc: 'Status perkawinan.' },
      { name: 'hubunganKeluarga', type: 'string | null', desc: 'Hubungan dengan kepala keluarga.' },
      { name: 'status', type: 'string', desc: 'AKTIF, PINDAH, atau MENINGGAL.' },
      { name: 'noKk', type: 'string', desc: 'Nomor Kartu Keluarga (16 digit).' },
      { name: 'alamat', type: 'string', desc: 'Alamat pada Kartu Keluarga.' },
      { name: 'rt', type: 'string | null', desc: 'RT (kosong jika belum diisi).' },
      { name: 'rw', type: 'string | null', desc: 'RW (kosong jika belum diisi).' },
      { name: 'dusun', type: 'string', desc: 'Nama dusun.' },
    ],
    example: {
      data: [
        {
          nik: '1200********0001',
          nama: 'NAMA CONTOH',
          jenisKelamin: 'LAKI_LAKI',
          tempatLahir: 'Medan',
          tanggalLahir: '1990-01-31',
          agama: 'ISLAM',
          pekerjaan: 'Petani/Pekebun',
          statusPerkawinan: 'Kawin',
          hubunganKeluarga: 'Kepala Keluarga',
          status: 'AKTIF',
          noKk: '1200000000000002',
          alamat: 'Desa Hulu Pancur Batu',
          rt: null,
          rw: null,
          dusun: 'Dusun II',
        },
      ],
      meta: { page: 1, limit: 100, total: 250, totalPages: 3, status: 'AKTIF', nik: 'masked' },
    },
  },
  {
    jenis: 'BANSOS',
    title: 'Data Penerima Bansos',
    path: '/api/external/bansos',
    desc: 'Daftar penerima bantuan sosial beserta program, periode, dan nominal.',
    params: 'page, limit (maks. 500), program, periode, status (AKTIF, SELESAI, DICABUT)',
    docParams: [
      ...PAGING_PARAMS,
      { name: 'program', desc: 'Filter nama program, misalnya PKH, BLT-DD, atau BPNT (huruf besar/kecil diabaikan).' },
      { name: 'periode', desc: 'Filter periode, misalnya 2026 atau 2026-TW3.' },
      { name: 'status', desc: 'Filter status: AKTIF, SELESAI, atau DICABUT. Jika dikosongkan, semua status ditampilkan.' },
    ],
    fields: [
      { name: 'program', type: 'string', desc: 'Nama program bantuan.' },
      { name: 'periode', type: 'string', desc: 'Periode penyaluran, misalnya 2026 atau 2026-TW3.' },
      { name: 'nominal', type: 'number | null', desc: 'Nominal bantuan dalam rupiah.' },
      { name: 'status', type: 'string', desc: 'AKTIF, SELESAI, atau DICABUT.' },
      { name: 'nik', type: 'string', desc: 'NIK penerima.' },
      { name: 'nama', type: 'string', desc: 'Nama penerima.' },
      { name: 'dusun', type: 'string', desc: 'Nama dusun penerima.' },
    ],
    example: {
      data: [
        {
          program: 'PKH',
          periode: '2026-TW3',
          nominal: 750000,
          status: 'AKTIF',
          nik: '1200000000000001',
          nama: 'NAMA CONTOH',
          dusun: 'Dusun II',
        },
      ],
      meta: {
        page: 1,
        limit: 100,
        total: 48,
        totalPages: 1,
        filter: { program: null, periode: null, status: null },
      },
    },
  },
]

const STATUS_CODES: [string, string][] = [
  ['200', 'Berhasil.'],
  ['400', 'Parameter tidak valid (misalnya nilai status tidak dikenal).'],
  ['401', 'API Key tidak dikirim atau tidak valid.'],
  ['403', 'API Key valid, tetapi akses sedang dinonaktifkan oleh admin desa.'],
  ['500', 'Terjadi kesalahan pada server.'],
]

const KETENTUAN: string[] = [
  'Gunakan koneksi HTTPS dan panggil API dari server Anda, bukan dari aplikasi web atau mobile yang dapat dilihat pengguna.',
  'Data memuat informasi pribadi warga (termasuk NIK). Gunakan hanya untuk keperluan yang disepakati dan lindungi sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
  'NIK dikembalikan dalam bentuk tersamar (mis. 1200********0001). Tambahkan parameter nik=full hanya bila NIK utuh benar-benar diperlukan.',
  'Admin desa dapat menonaktifkan atau mengganti API Key kapan saja. Key lama langsung tidak berlaku.',
]

// Versi teks dokumentasi (untuk tombol "Salin Dokumentasi")
function buildDocsText(cfg: ApiJenisConfig, origin: string) {
  const endpoint = `${origin}${cfg.path}`
  const fence = '```'
  return [
    `# Dokumentasi API: ${cfg.title}`,
    'Pemerintah Desa Hulu Pancur Batu',
    '',
    `${cfg.desc} API bersifat baca-saja (GET) dan mengembalikan JSON.`,
    '',
    '## Endpoint',
    `GET ${endpoint}`,
    '',
    '## Autentikasi',
    'Kirim API Key pada salah satu header berikut (pilih salah satu):',
    '- x-api-key: <API_KEY>',
    '- Authorization: Bearer <API_KEY>',
    '',
    '## Parameter query (opsional)',
    ...cfg.docParams.map((p) => `- ${p.name}: ${p.desc}`),
    '',
    '## Contoh permintaan',
    fence + 'bash',
    `curl -H "x-api-key: <API_KEY>" "${endpoint}?limit=100"`,
    `curl -H "Authorization: Bearer <API_KEY>" "${endpoint}?limit=100"`,
    fence,
    '',
    '## Contoh respons (200 OK)',
    fence + 'json',
    JSON.stringify(cfg.example, null, 2),
    fence,
    '',
    '## Keterangan field',
    ...cfg.fields.map((f) => `- ${f.name} (${f.type}): ${f.desc}`),
    '',
    '## Paginasi',
    'meta.total adalah jumlah seluruh data sesuai filter. Ambil semua data dengan menaikkan page hingga sama dengan meta.totalPages.',
    '',
    '## Kode status',
    ...STATUS_CODES.map(([code, desc]) => `- ${code}: ${desc}`),
    '',
    '## Ketentuan',
    ...KETENTUAN.map((k) => `- ${k}`),
  ].join('\n')
}

function formatLogin(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/* ---------- Gaya bersama ---------- */

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2'

const inputCls =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-100 disabled:text-slate-500 sm:text-sm'

const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

const btnDanger = `inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

/* ---------- Komponen kecil ---------- */

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-slate-200 px-6 py-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
    </div>
  )
}

function PanelBody({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-6">{children}</div>
}

function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
      {children}
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  hint,
}: {
  id: string
  name: string
  label: string
  placeholder?: string
  autoComplete: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <Field id={id} label={label} hint={hint}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          required
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputCls} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-emerald-600 focus-visible:outline-none"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  )
}

function Switch({
  checked,
  disabled,
  onChange,
  labelledBy,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
        checked ? 'bg-emerald-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function StatusBadge({ exists, active }: { exists: boolean; active: boolean }) {
  if (!exists) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
        Belum dibuat
      </span>
    )
  }
  return active ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      Aktif
    </span>
  ) : (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
      Nonaktif
    </span>
  )
}

function CopyButton({
  text,
  id,
  copied,
  onCopy,
  label,
}: {
  text: string
  id: string
  copied: string | null
  onCopy: (text: string, id: string) => void
  label: string
}) {
  const done = copied === id
  return (
    <button
      type="button"
      onClick={() => onCopy(text, id)}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 ${focusRing}`}
    >
      {done ? (
        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{done ? 'Tersalin' : 'Salin'}</span>
    </button>
  )
}

type ApiKeySectionProps = {
  cfg: (typeof API_JENIS)[number]
  item: ApiKeyItem | undefined
  newKey: string | undefined
  origin: string
  loading: boolean
  confirming: boolean
  copied: string | null
  onCopy: (text: string, id: string) => void
  onGenerate: (jenis: JenisApi) => void
  onAskConfirm: (jenis: JenisApi) => void
  onCancelConfirm: () => void
  onToggle: (jenis: JenisApi, next: boolean) => void
  onDismissKey: (jenis: JenisApi) => void
  onOpenDocs: (jenis: JenisApi) => void
}

function ApiKeySection({
  cfg,
  item,
  newKey,
  origin,
  loading,
  confirming,
  copied,
  onCopy,
  onGenerate,
  onAskConfirm,
  onCancelConfirm,
  onToggle,
  onDismissKey,
  onOpenDocs,
}: ApiKeySectionProps) {
  const endpoint = `${origin}${cfg.path}`
  const exists = !!item
  const active = !!item?.isActive
  const curlText = `curl -H "x-api-key: KEY_ANDA" "${endpoint}"`
  const labelId = `api-switch-${cfg.jenis}`

  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{cfg.title}</h3>
            <button
              type="button"
              onClick={() => onOpenDocs(cfg.jenis)}
              aria-label={`Lihat dokumentasi API ${cfg.title} untuk vendor`}
              title="Dokumentasi untuk vendor"
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 ${focusRing}`}
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
            <StatusBadge exists={exists} active={active} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{cfg.desc}</p>
        </div>

        {exists && (
          <div className="flex items-center gap-2.5">
            <Switch
              checked={active}
              disabled={loading}
              onChange={(next) => onToggle(cfg.jenis, next)}
              labelledBy={labelId}
            />
            <span id={labelId} className="text-sm text-slate-700">
              {active ? 'Akses aktif' : 'Akses nonaktif'}
            </span>
          </div>
        )}
      </div>

      {/* Endpoint */}
      <div className="mt-5">
        <p className="text-xs font-medium text-slate-700">Endpoint</p>
        <div className="mt-1.5 flex items-stretch gap-2">
          <code className="flex min-w-0 flex-1 items-center overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800">
            <span className="mr-2 font-semibold text-slate-500">GET</span>
            <span className="whitespace-nowrap">{endpoint}</span>
          </code>
          <CopyButton
            text={endpoint}
            id={`${cfg.jenis}-url`}
            copied={copied}
            onCopy={onCopy}
            label="Salin URL endpoint"
          />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Parameter opsional: {cfg.params}.
        </p>
      </div>

      {/* API Key */}
      <div className="mt-5">
        <p className="text-xs font-medium text-slate-700">API Key</p>

        {newKey ? (
          <div className="mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-stretch gap-2">
              <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-900 ring-1 ring-emerald-200">
                {newKey}
              </code>
              <CopyButton
                text={newKey}
                id={`${cfg.jenis}-key`}
                copied={copied}
                onCopy={onCopy}
                label="Salin API Key"
              />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-emerald-900">
              Salin key ini sekarang dan simpan di tempat yang aman. Setelah disembunyikan, key tidak
              dapat ditampilkan lagi. Jika hilang, buat ulang key baru.
            </p>
            <button
              type="button"
              onClick={() => onDismissKey(cfg.jenis)}
              className={`mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 ${focusRing}`}
            >
              Sudah saya salin, sembunyikan
            </button>
          </div>
        ) : exists ? (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-sm text-slate-800">
              <span className="font-mono">{item!.keyPrefix}</span>
              <span aria-hidden="true" className="text-slate-400">
                {' '}
                ••••••••••••••••
              </span>
            </p>
            <p className="text-xs text-slate-500">
              {item!.lastUsedAt
                ? `Terakhir dipakai ${formatLogin(item!.lastUsedAt)}`
                : 'Belum pernah dipakai'}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-slate-500">Belum ada API Key untuk data ini.</p>
        )}
      </div>

      {/* Contoh pemakaian */}
      {exists && (
        <div className="mt-5">
          <p className="text-xs font-medium text-slate-700">Contoh pemakaian</p>
          <div className="mt-1.5 flex items-stretch gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2.5 text-xs text-slate-100">
              {curlText}
            </code>
            <CopyButton
              text={curlText}
              id={`${cfg.jenis}-curl`}
              copied={copied}
              onCopy={onCopy}
              label="Salin contoh perintah"
            />
          </div>
        </div>
      )}

      {/* Aksi */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm text-slate-600">Key lama akan berhenti berlaku. Lanjutkan?</span>
            <button
              type="button"
              onClick={() => onGenerate(cfg.jenis)}
              disabled={loading}
              className={btnDanger}
            >
              {loading && <Spinner />}
              Ya, Generate Ulang
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              disabled={loading}
              className={`rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
            >
              Batal
            </button>
          </>
        ) : exists ? (
          <button
            type="button"
            onClick={() => onAskConfirm(cfg.jenis)}
            disabled={loading}
            className={btnSecondary}
          >
            Generate Ulang
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onGenerate(cfg.jenis)}
            disabled={loading}
            className={btnPrimary}
          >
            {loading && <Spinner />}
            Generate API Key
          </button>
        )}
      </div>
    </div>
  )
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

function DocCode({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  )
}

function DocTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 align-top ${
                    j === 0 ? 'whitespace-nowrap font-mono text-slate-900' : 'text-slate-700'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocsDialog({
  cfg,
  origin,
  copied,
  onCopy,
  onClose,
}: {
  cfg: ApiJenisConfig
  origin: string
  copied: string | null
  onCopy: (text: string, id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // <dialog> bawaan browser: fokus terkunci di dalam, Esc menutup, fokus kembali ke tombol (i)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const endpoint = `${origin}${cfg.path}`
  const isLocal = /localhost|127\.0\.0\.1/.test(origin)
  const docId = `${cfg.jenis}-doc`
  const docText = buildDocsText(cfg, origin)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      aria-labelledby="docs-title"
      className="m-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 id="docs-title" className="text-base font-semibold text-slate-900">
              Dokumentasi API: {cfg.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Untuk diberikan kepada vendor atau instansi yang akan mengambil data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Tutup dokumentasi"
            className={`shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 ${focusRing}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5 text-sm text-slate-700">
          {isLocal && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-amber-900">
                Alamat di bawah masih <strong>localhost</strong>, sehingga tidak bisa dijangkau vendor.
                Ganti dengan alamat domain resmi aplikasi sebelum dokumentasi ini diberikan.
              </p>
            </div>
          )}

          <DocSection title="Ringkasan">
            <p>
              {cfg.desc} API bersifat baca-saja (GET) dan mengembalikan JSON.
            </p>
          </DocSection>

          <DocSection title="Endpoint">
            <DocCode>{`GET ${endpoint}`}</DocCode>
          </DocSection>

          <DocSection title="Autentikasi">
            <p className="mb-2">Kirim API Key pada salah satu header berikut (pilih salah satu):</p>
            <DocCode>{'x-api-key: <API_KEY>\nAuthorization: Bearer <API_KEY>'}</DocCode>
          </DocSection>

          <DocSection title="Parameter query (opsional)">
            <DocTable head={['Parameter', 'Keterangan']} rows={cfg.docParams.map((p) => [p.name, p.desc])} />
          </DocSection>

          <DocSection title="Contoh permintaan">
            <DocCode>
              {`curl -H "x-api-key: <API_KEY>" "${endpoint}?limit=100"\n\ncurl -H "Authorization: Bearer <API_KEY>" "${endpoint}?limit=100"`}
            </DocCode>
          </DocSection>

          <DocSection title="Contoh respons (200 OK)">
            <DocCode>{JSON.stringify(cfg.example, null, 2)}</DocCode>
          </DocSection>

          <DocSection title="Keterangan field">
            <DocTable
              head={['Field', 'Tipe', 'Keterangan']}
              rows={cfg.fields.map((f) => [f.name, f.type, f.desc])}
            />
          </DocSection>

          <DocSection title="Paginasi">
            <p>
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">meta.total</code> adalah jumlah
              seluruh data sesuai filter. Ambil semua data dengan menaikkan{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">page</code> hingga sama dengan{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">meta.totalPages</code>.
            </p>
          </DocSection>

          <DocSection title="Kode status">
            <DocTable head={['Kode', 'Arti']} rows={STATUS_CODES.map(([code, desc]) => [code, desc])} />
          </DocSection>

          <DocSection title="Ketentuan">
            <ul className="list-disc space-y-1.5 pl-5">
              {KETENTUAN.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </DocSection>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={() => ref.current?.close()} className={btnSecondary}>
            Tutup
          </button>
          <button type="button" onClick={() => onCopy(docText, docId)} className={btnPrimary}>
            {copied === docId ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied === docId ? 'Tersalin' : 'Salin Dokumentasi'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

/* ---------- Halaman ---------- */

export default function SettingsClient({
  sessions,
  isAdmin,
  apiKeys: initialApiKeys,
  resetEnabled,
  initialTab = 'password',
  waConfig,
  auditPanel,
}: {
  sessions: SessionItem[]
  isAdmin: boolean
  apiKeys: ApiKeyItem[]
  resetEnabled: boolean
  initialTab?: TabKey
  waConfig: WhatsAppConfigView
  /** Panel Audit Log yang sudah dirender server (khusus ADMIN). */
  auditPanel: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [newEmailInput, setNewEmailInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [sessionList, setSessionList] = useState<SessionItem[]>(sessions)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Integrasi API (hanya ADMIN)
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(initialApiKeys)
  const [newKeys, setNewKeys] = useState<Partial<Record<JenisApi, string>>>({})
  const [confirmGen, setConfirmGen] = useState<JenisApi | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [docJenis, setDocJenis] = useState<JenisApi | null>(null)

  // Pengaturan WhatsApp Gateway (hanya ADMIN)
  const [wa, setWa] = useState<WhatsAppConfigView>(waConfig)
  const [waApiUrl, setWaApiUrl] = useState(waConfig.apiUrl)
  const [waToken, setWaToken] = useState('')
  const [waSender, setWaSender] = useState(waConfig.senderNumber ?? '')
  const [waFormat, setWaFormat] = useState<'form' | 'json'>(waConfig.format)
  const [waAuthType, setWaAuthType] = useState<AuthTypeWhatsApp>(waConfig.authType)
  const [waEnabled, setWaEnabled] = useState(waConfig.enabled)
  const [waSaving, setWaSaving] = useState(false)
  const [waTestTarget, setWaTestTarget] = useState('')
  const [waTesting, setWaTesting] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const visibleTabs = isAdmin
    ? [...TABS, API_TAB, WHATSAPP_TAB, AUDIT_TAB, ADVANCED_TAB]
    : TABS

  function showNotification(type: 'success' | 'error', text: string) {
    if (timer.current) clearTimeout(timer.current)
    setMessage({ type, text })
    timer.current = setTimeout(() => setMessage(null), 5000)
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    const formData = new FormData(form)
    const res = await updatePassword(null, formData)
    setLoading(false)
    if (res.success) {
      showNotification('success', res.message)
      form.reset()
    } else {
      showNotification('error', res.message)
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await updatePhone(null, formData)
    setLoading(false)
    if (res.success) {
      showNotification('success', res.message)
    } else {
      showNotification('error', res.message)
    }
  }

  async function handleWhatsAppSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setWaSaving(true)
    try {
      const formData = new FormData()
      formData.set('apiUrl', waApiUrl)
      formData.set('token', waToken)
      formData.set('senderNumber', waSender)
      formData.set('format', waFormat)
      formData.set('authType', waAuthType)
      formData.set('enabled', waEnabled ? 'true' : 'false')

      const res = await simpanPengaturanWhatsApp(formData)
      if (res.success) {
        showNotification('success', res.message)
        setWaToken('')
        if (res.config) {
          setWa(res.config)
          setWaApiUrl(res.config.apiUrl)
          setWaSender(res.config.senderNumber ?? '')
          setWaFormat(res.config.format)
          setWaAuthType(res.config.authType)
          setWaEnabled(res.config.enabled)
        }
      } else {
        showNotification('error', res.message)
      }
    } finally {
      setWaSaving(false)
    }
  }

  async function handleWhatsAppTest() {
    if (!waTestTarget.trim()) {
      showNotification('error', 'Masukkan nomor WhatsApp tujuan untuk uji coba.')
      return
    }
    setWaTesting(true)
    try {
      const formData = new FormData()
      formData.set('target', waTestTarget)
      const res = await ujiKirimWhatsApp(formData)
      showNotification(res.success ? 'success' : 'error', res.message)
    } finally {
      setWaTesting(false)
    }
  }

  async function handleSendOtp() {
    if (!newEmailInput || !newEmailInput.includes('@')) {
      showNotification('error', 'Masukkan alamat email baru yang valid.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-email-otp', newEmail: newEmailInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim OTP.')

      setOtpSent(true)
      setOtpInput('')
      showNotification('success', data.message)
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpInput || otpInput.length < 6) {
      showNotification('error', 'Kode OTP harus 6 digit.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-and-save-email', newEmail: newEmailInput, otp: otpInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal verifikasi OTP.')

      showNotification('success', data.message)
      setOtpSent(false)
      setNewEmailInput('')
      setOtpInput('')
    } catch (err: any) {
      showNotification('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (otpSent) handleVerifyOtp()
    else handleSendOtp()
  }

  async function handleRevokeSession(id: string) {
    setLoading(true)
    const res = await revokeSession(id)
    setLoading(false)
    setConfirmId(null)
    if (res.success) {
      setSessionList((prev) => prev.filter((s) => s.id !== id))
      showNotification('success', res.message)
    } else {
      showNotification('error', res.message)
    }
  }

  async function handleGenerateKey(jenis: JenisApi) {
    setLoading(true)
    const res = await generateApiKeyAction(jenis)
    setLoading(false)
    setConfirmGen(null)
    if (res.success && res.key) {
      const key = res.key
      const keyPrefix = res.keyPrefix ?? key.slice(0, 12)
      setNewKeys((prev) => ({ ...prev, [jenis]: key }))
      setApiKeys((prev) => [
        ...prev.filter((k) => k.jenis !== jenis),
        { jenis, keyPrefix, isActive: true, lastUsedAt: null },
      ])
      showNotification('success', res.message)
    } else {
      showNotification('error', res.message)
    }
  }

  async function handleToggleKey(jenis: JenisApi, next: boolean) {
    setLoading(true)
    const res = await toggleApiKeyAction(jenis, next)
    setLoading(false)
    if (res.success) {
      setApiKeys((prev) => prev.map((k) => (k.jenis === jenis ? { ...k, isActive: next } : k)))
      showNotification('success', res.message)
    } else {
      showNotification('error', res.message)
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000)
    } catch {
      showNotification('error', 'Gagal menyalin otomatis. Salin secara manual.')
    }
  }

  function handleDismissKey(jenis: JenisApi) {
    setNewKeys((prev) => {
      const next = { ...prev }
      delete next[jenis]
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <header className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
          Pengaturan Akun & Keamanan
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Kelola kata sandi, verifikasi kontak, dan sesi login perangkat Anda dalam satu tempat.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        {/* Navigasi bagian: horizontal di layar kecil, vertikal di layar lebar */}
        <nav aria-label="Bagian pengaturan" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {visibleTabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                aria-current={active ? 'true' : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
                  active
                    ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          {/* ---------- Kata sandi ---------- */}
          {activeTab === 'password' && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Ubah Kata Sandi"
                description="Gunakan kata sandi yang tidak dipakai di akun lain agar akun Anda tetap aman."
              />
              <form onSubmit={handlePasswordSubmit}>
                <PanelBody>
                  <div className="max-w-md space-y-5">
                    <PasswordField
                      id="current-password"
                      name="currentPassword"
                      label="Kata sandi saat ini"
                      autoComplete="current-password"
                    />
                    <PasswordField
                      id="new-password"
                      name="newPassword"
                      label="Kata sandi baru"
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
                      hint="Gabungkan huruf dan angka agar lebih sulit ditebak."
                    />
                    <PasswordField
                      id="confirm-password"
                      name="confirmPassword"
                      label="Konfirmasi kata sandi baru"
                      placeholder="Ketik ulang kata sandi baru"
                      autoComplete="new-password"
                    />
                  </div>
                </PanelBody>
                <PanelFooter>
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading && <Spinner />}
                    {loading ? 'Menyimpan…' : 'Perbarui Kata Sandi'}
                  </button>
                </PanelFooter>
              </form>
            </section>
          )}

          {/* ---------- Email ---------- */}
          {activeTab === 'email' && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Ubah Alamat Email"
                description="Kami mengirim kode verifikasi 6 digit ke email baru Anda. Email baru baru disimpan setelah kode dimasukkan dengan benar."
              />
              <form onSubmit={handleEmailSubmit} noValidate>
                <PanelBody>
                  <div className="max-w-md space-y-5">
                    <Field
                      id="new-email"
                      label="Email baru"
                      hint={otpSent ? undefined : 'Kode verifikasi akan dikirim ke alamat ini.'}
                    >
                      <div className="flex gap-2">
                        <input
                          id="new-email"
                          type="email"
                          value={newEmailInput}
                          onChange={(e) => setNewEmailInput(e.target.value)}
                          disabled={otpSent}
                          placeholder="nama@email.com"
                          autoComplete="email"
                          aria-describedby={otpSent ? undefined : 'new-email-hint'}
                          className={`${inputCls} min-w-0 flex-1`}
                        />
                        {otpSent && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false)
                              setOtpInput('')
                            }}
                            className={btnSecondary}
                          >
                            Ganti Email
                          </button>
                        )}
                      </div>
                    </Field>

                    {otpSent && (
                      <Field
                        id="otp"
                        label="Kode verifikasi"
                        hint={`Masukkan 6 digit kode yang dikirim ke ${newEmailInput}. Kode berlaku 10 menit. Periksa folder spam jika belum masuk.`}
                      >
                        <input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          aria-describedby="otp-hint"
                          className="block w-full max-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-lg font-semibold tabular-nums tracking-[0.4em] text-slate-900 shadow-xs placeholder:font-normal placeholder:text-slate-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                        />
                      </Field>
                    )}
                  </div>
                </PanelBody>
                <PanelFooter>
                  {otpSent ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className={btnSecondary}
                      >
                        Kirim Ulang Kode
                      </button>
                      <button type="submit" disabled={loading} className={btnPrimary}>
                        {loading && <Spinner />}
                        {loading ? 'Memverifikasi…' : 'Verifikasi & Simpan'}
                      </button>
                    </>
                  ) : (
                    <button type="submit" disabled={loading} className={btnPrimary}>
                      {loading && <Spinner />}
                      {loading ? 'Mengirim…' : 'Kirim Kode OTP'}
                    </button>
                  )}
                </PanelFooter>
              </form>
            </section>
          )}

          {/* ---------- WhatsApp ---------- */}
          {activeTab === 'phone' && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Ubah Nomor WhatsApp"
                description="Nomor ini dipakai untuk notifikasi layanan dan pengajuan surat desa."
              />
              <form onSubmit={handlePhoneSubmit}>
                <PanelBody>
                  <div className="max-w-md">
                    <Field
                      id="no-whatsapp"
                      label="Nomor WhatsApp"
                      hint="Gunakan nomor yang aktif di WhatsApp. Contoh: 081234567890."
                    >
                      <input
                        id="no-whatsapp"
                        name="noWhatsapp"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        placeholder="081234567890"
                        aria-describedby="no-whatsapp-hint"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </PanelBody>
                <PanelFooter>
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading && <Spinner />}
                    {loading ? 'Menyimpan…' : 'Simpan Nomor'}
                  </button>
                </PanelFooter>
              </form>
            </section>
          )}

          {/* ---------- Integrasi API (ADMIN) ---------- */}
          {activeTab === 'api' && isAdmin && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Integrasi API"
                description="Buat API Key agar sistem lain dapat membaca data desa. Setiap jenis data memiliki satu key, dikirim lewat header x-api-key atau Authorization: Bearer. Klik ikon info (i) pada tiap data untuk melihat dokumentasi yang bisa diberikan ke vendor."
              />

              <div className="flex gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-amber-900">
                  Data yang diakses mencakup NIK dan data pribadi warga. Berikan key hanya kepada pihak
                  yang berwenang, dan minta mereka memakainya dari server, bukan dari kode website
                  publik. Key yang bocor dapat langsung dinonaktifkan atau diganti.
                </p>
              </div>

              <div className="divide-y divide-slate-200">
                {API_JENIS.map((cfg) => (
                  <ApiKeySection
                    key={cfg.jenis}
                    cfg={cfg}
                    item={apiKeys.find((k) => k.jenis === cfg.jenis)}
                    newKey={newKeys[cfg.jenis]}
                    origin={origin}
                    loading={loading}
                    confirming={confirmGen === cfg.jenis}
                    copied={copied}
                    onCopy={handleCopy}
                    onGenerate={handleGenerateKey}
                    onAskConfirm={setConfirmGen}
                    onCancelConfirm={() => setConfirmGen(null)}
                    onToggle={handleToggleKey}
                    onDismissKey={handleDismissKey}
                    onOpenDocs={setDocJenis}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ---------- WhatsApp Gateway (ADMIN) ---------- */}
          {activeTab === 'whatsapp' && isAdmin && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="WhatsApp Gateway"
                description="Konfigurasi pengiriman notifikasi otomatis ke WhatsApp warga. Pengaturan disimpan di database dan langsung dipakai saat status surat diubah menjadi Selesai atau Ditolak."
              />
              <PanelBody>
                {/* Monitor koneksi real-time (status, QR, nomor, connect/logout) */}
                <div className="mb-6">
                  <WhatsAppGatewayClient
                    embedded
                    config={{
                      apiUrl: wa.apiUrl,
                      hasToken: wa.hasToken,
                      tokenMasked: wa.tokenMasked,
                      senderNumber: wa.senderNumber,
                      enabled: wa.enabled,
                      gatewayUrl: wa.gatewayUrl,
                    }}
                  />
                </div>

                <div className="mb-5 border-t border-slate-200 pt-5">
                  <p className="text-sm font-bold text-slate-900">Konfigurasi API Gateway</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Pengaturan disimpan di database dan langsung dipakai saat status surat diubah
                    menjadi Selesai atau Ditolak.
                  </p>
                </div>

                <form onSubmit={handleWhatsAppSave} className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Status Notifikasi</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        Aktifkan setelah API URL dan token terisi. Bila nonaktif, perubahan status
                        surat tetap tersimpan tanpa mengirim WhatsApp.
                      </p>
                    </div>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={waEnabled}
                        onChange={(e) => setWaEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                          waEnabled && wa.hasToken
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                        }`}
                      >
                        {waEnabled && wa.hasToken ? (
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        )}
                        {waEnabled && wa.hasToken ? 'Aktif' : 'Belum aktif'}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="wa-api-url" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      API URL <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="wa-api-url"
                      type="url"
                      required
                      value={waApiUrl}
                      onChange={(e) => setWaApiUrl(e.target.value)}
                      placeholder="https://api.fonnte.com/send"
                      className={inputCls}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Endpoint POST gateway. Bawaan Fonnte: <code className="font-mono">https://api.fonnte.com/send</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="wa-token" className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Token / API Key
                      </label>
                      <input
                        id="wa-token"
                        type="password"
                        value={waToken}
                        onChange={(e) => setWaToken(e.target.value)}
                        placeholder={
                          wa.hasToken
                            ? `Tersimpan (${wa.tokenMasked ?? '••••'}) — kosongkan untuk mempertahankan`
                            : 'Masukkan token gateway'
                        }
                        autoComplete="new-password"
                        className={inputCls}
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Token disimpan di database dan tidak pernah dikirim utuh ke browser.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="wa-sender" className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Sender Number
                      </label>
                      <input
                        id="wa-sender"
                        type="tel"
                        value={waSender}
                        onChange={(e) => setWaSender(e.target.value)}
                        placeholder="081234567890"
                        className={inputCls}
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Nomor perangkat pengirim. Disimpan dalam format 62… dan dikirim sebagai
                        <code className="mx-1 font-mono">sender</code> bila gateway mendukung.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="wa-format" className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Format Body Permintaan
                      </label>
                      <select
                        id="wa-format"
                        value={waFormat}
                        onChange={(e) => setWaFormat(e.target.value === 'json' ? 'json' : 'form')}
                        className={inputCls}
                      >
                        <option value="form">form-urlencoded (Fonnte)</option>
                        <option value="json">JSON (gateway generik)</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Pilih sesuai dokumentasi gateway. JSON mengirim{' '}
                        <code className="font-mono">{'{ target, message, sender }'}</code>.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="wa-auth" className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Metode Autentikasi Token
                      </label>
                      <select
                        id="wa-auth"
                        value={waAuthType}
                        onChange={(e) =>
                          setWaAuthType(
                            ['auto', 'bearer', 'x-api-key', 'raw', 'body'].includes(e.target.value)
                              ? (e.target.value as AuthTypeWhatsApp)
                              : 'auto'
                          )
                        }
                        className={inputCls}
                      >
                        <option value="auto">Otomatis (form: raw, JSON: Bearer)</option>
                        <option value="bearer">Authorization: Bearer &lt;token&gt;</option>
                        <option value="x-api-key">Header x-api-key</option>
                        <option value="raw">Authorization: &lt;token&gt; (Fonnte)</option>
                        <option value="body">Token di body payload</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Gunakan <strong>Bearer</strong> atau <strong>x-api-key</strong> untuk gateway
                        yang diproteksi API key.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-200 pt-4">
                    <button type="submit" disabled={waSaving} className={btnPrimary}>
                      {waSaving ? <Spinner /> : <Check className="h-4 w-4" aria-hidden="true" />}
                      {waSaving ? 'Menyimpan…' : 'Simpan Pengaturan'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Kirim Pesan Uji</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      Pastikan konfigurasi benar sebelum dipakai. Pesan uji dikirim ke nomor tujuan di
                      bawah ini (bukan ke nomor pengirim).
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="tel"
                      value={waTestTarget}
                      onChange={(e) => setWaTestTarget(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className={`${inputCls} sm:max-w-xs`}
                    />
                    <button
                      type="button"
                      onClick={handleWhatsAppTest}
                      disabled={waTesting}
                      className={btnSecondary}
                    >
                      {waTesting ? <Spinner /> : <MessageCircle className="h-4 w-4" aria-hidden="true" />}
                      {waTesting ? 'Mengirim…' : 'Kirim Uji'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hasil pengiriman juga dicatat di Audit Log. Kegagalan gateway tidak mengubah data
                    surat apa pun.
                  </p>
                </div>
              </PanelBody>
            </section>
          )}

          {/* ---------- Audit Log (ADMIN) ---------- */}
          {activeTab === 'audit' && isAdmin && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Audit Log"
                description="Riwayat aktivitas pengguna dan admin, termasuk percobaan akses mencurigakan. Catatan audit tidak dapat diubah atau dihapus dari antarmuka ini."
              />
              <div className="p-5 sm:p-6">{auditPanel}</div>
            </section>
          )}

          {/* ---------- Keamanan & Data (ADMIN) ---------- */}
          {activeTab === 'advanced' && isAdmin && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Keamanan & Data"
                description="Pengaturan lanjutan khusus administrator untuk pemeliharaan data yang bersifat permanen."
              />
              <PanelBody>
                <div className="space-y-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                        <Database className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-rose-900">Zona Berbahaya</p>
                        <p className="mt-1 text-xs leading-relaxed text-rose-800">
                          Mengosongkan database akan menghapus permanen data warga, Kartu Keluarga,
                          penerima bansos, dan riwayat pengajuan surat. Tindakan ini memerlukan
                          konfirmasi dua lapis serta kata sandi akun admin Anda.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      {resetEnabled ? (
                        <ResetDbModal />
                      ) : (
                        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
                          Fitur ini dinonaktifkan di server produksi. Nyalakan{' '}
                          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                            ALLOW_DB_RESET=true
                          </code>{' '}
                          hanya bila benar-benar diperlukan.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </PanelBody>
            </section>
          )}

          {/* ---------- Perangkat aktif ---------- */}
          {activeTab === 'sessions' && (
            <section className="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-slate-200">
              <PanelHeader
                title="Perangkat Aktif"
                description="Daftar perangkat yang sedang masuk ke akun Anda. Cabut akses perangkat yang tidak Anda kenali."
              />

              {sessionList.length === 0 ? (
                <p className="px-6 py-8 text-sm text-slate-500">Tidak ada sesi aktif.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {sessionList.map((s) => {
                    const isPhone = /android|iphone/i.test(s.device)
                    const DeviceIcon = isPhone ? Smartphone : Laptop
                    const confirming = confirmId === s.id

                    return (
                      <li
                        key={s.id}
                        className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <DeviceIcon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{s.device}</p>
                              {s.isCurrent && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                  Perangkat ini
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                              <span>IP {s.ip}</span>
                              <span>Login {formatLogin(s.loginAt)}</span>
                            </div>
                          </div>
                        </div>

                        {!s.isCurrent &&
                          (confirming ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-slate-600">Cabut akses perangkat ini?</span>
                              <button
                                type="button"
                                onClick={() => handleRevokeSession(s.id)}
                                disabled={loading}
                                className={`inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                              >
                                {loading && <Spinner />}
                                Ya, Cabut
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmId(null)}
                                disabled={loading}
                                className={`rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmId(s.id)}
                              className={`rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 ${focusRing}`}
                            >
                              Cabut Akses
                            </button>
                          ))}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs leading-relaxed text-slate-600">
                Perangkat yang dicabut akan keluar otomatis saat memuat halaman berikutnya. Jika ada
                perangkat yang tidak Anda kenali, cabut aksesnya lalu ganti kata sandi Anda.
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Dokumentasi vendor */}
      {docJenis && (
        <DocsDialog
          cfg={API_JENIS.find((c) => c.jenis === docJenis)!}
          origin={origin}
          copied={copied}
          onCopy={handleCopy}
          onClose={() => setDocJenis(null)}
        />
      )}

      {/* Notifikasi */}
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          )}
          <p className="flex-1 text-sm text-slate-800">{message.text}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Tutup notifikasi"
            className="shrink-0 rounded text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}