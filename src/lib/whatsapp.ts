import { prisma } from '@/lib/prisma'

/**
 * Integrasi WhatsApp Gateway untuk notifikasi otomatis SIDU.
 *
 * Konfigurasi disimpan di database (tabel `PengaturanWhatsApp`, baris tunggal
 * id = 1) dan diatur oleh ADMIN lewat menu Pengaturan Akun → WhatsApp Gateway:
 * - apiUrl       : endpoint kirim pesan (mis. https://api.fonnte.com/send)
 * - token        : token perangkat/API gateway (disimpan di database)
 * - senderNumber : nomor pengirim/device yang ditampilkan ke admin
 * - enabled      : saklar utama notifikasi
 * - format       : "form" (kompatibel Fonnte) atau "json" (gateway generik)
 *
 * Semua fungsi pengiriman TIDAK PERNAH melempar error ke pemanggil. Kegagalan
 * gateway hanya dikembalikan sebagai status "gagal" agar perubahan data
 * (misalnya status surat) tetap berhasil.
 */

export type FormatWhatsApp = 'form' | 'json'

/**
 * Cara token dikirim ke gateway:
 * - "auto"      : form -> Authorization: <token> (Fonnte), json -> Bearer <token>
 * - "bearer"    : Authorization: Bearer <token>
 * - "x-api-key" : header x-api-key: <token>
 * - "raw"       : Authorization: <token> (token apa adanya, khas Fonnte)
 * - "body"      : token disertakan di body payload sebagai "token"
 */
export type AuthTypeWhatsApp = 'auto' | 'bearer' | 'x-api-key' | 'raw' | 'body'

export type WhatsAppConfig = {
  apiUrl: string
  token: string | null
  senderNumber: string | null
  enabled: boolean
  format: FormatWhatsApp
  authType: AuthTypeWhatsApp
}

/** Auth efektif setelah nilai "auto" diterjemahkan sesuai format body. */
export type AuthEfektifWhatsApp = Exclude<AuthTypeWhatsApp, 'auto'>

export function resolveAuthType(config: {
  format: FormatWhatsApp
  authType: AuthTypeWhatsApp
}): AuthEfektifWhatsApp {
  if (config.authType === 'auto') {
    return config.format === 'json' ? 'bearer' : 'raw'
  }
  return config.authType
}

export type HasilKirimWhatsApp = {
  status: 'terkirim' | 'gagal' | 'dilewati'
  alasan?: string
  /** Nomor tujuan yang sudah dinormalisasi (62xxxx), bila valid. */
  nomorTujuan?: string
}

const DEFAULT_API_URL = 'https://api.fonnte.com/send'

const KONFIG_DEFAULT: WhatsAppConfig = {
  apiUrl: DEFAULT_API_URL,
  token: null,
  senderNumber: null,
  enabled: false,
  format: 'form',
  authType: 'auto',
}

const AUTH_TYPES: AuthTypeWhatsApp[] = ['auto', 'bearer', 'x-api-key', 'raw', 'body']

/** Validasi nilai authType yang datang dari form/DB. */
export function isAuthTypeWhatsApp(value: unknown): value is AuthTypeWhatsApp {
  return typeof value === 'string' && (AUTH_TYPES as string[]).includes(value)
}

/** Baca konfigurasi WhatsApp dari database. Gagal membaca -> dianggap nonaktif. */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const row = await prisma.pengaturanWhatsApp.findUnique({ where: { id: 1 } })
    if (!row) return KONFIG_DEFAULT
    return {
      apiUrl: row.apiUrl || DEFAULT_API_URL,
      token: row.token?.trim() || null,
      senderNumber: row.senderNumber?.trim() || null,
      enabled: row.enabled,
      format: row.format === 'json' ? 'json' : 'form',
      authType: isAuthTypeWhatsApp(row.authType) ? row.authType : 'auto',
    }
  } catch (error) {
    console.error('Gagal membaca konfigurasi WhatsApp:', error)
    return KONFIG_DEFAULT
  }
}

/** Apakah notifikasi siap dikirim: saklar aktif dan token tersedia. */
export function isWhatsAppAktif(config: WhatsAppConfig): boolean {
  return config.enabled && Boolean(config.token)
}

/** Host gateway untuk ditampilkan di UI, tanpa membocorkan token. */
export function whatsAppGatewayHost(apiUrl: string | null | undefined): string | null {
  try {
    return new URL(apiUrl || DEFAULT_API_URL).host
  } catch {
    return null
  }
}

/** Tampilkan token dalam bentuk tersamarkan, mis. "••••••••1a2b". */
export function maskToken(token: string | null | undefined): string | null {
  if (!token) return null
  if (token.length <= 4) return '••••'
  return `••••••••${token.slice(-4)}`
}

/**
 * Normalisasi nomor Indonesia ke format internasional tanpa tanda "+".
 * Contoh: "0812-3456-7890" -> "6281234567890"; "+62 812..." -> "62812...".
 * Mengembalikan null bila nomor tidak masuk akal (terlalu pendek/panjang).
 */
export function normalisasiNomorWhatsApp(input: string | null | undefined): string | null {
  if (!input) return null

  let digit = input.replace(/\D/g, '')
  if (!digit) return null

  if (digit.startsWith('0')) {
    digit = `62${digit.slice(1)}`
  } else if (digit.startsWith('8')) {
    digit = `62${digit}`
  } else if (digit.startsWith('620')) {
    digit = `62${digit.slice(3)}`
  }

  // Nomor Indonesia: kode negara 62 + 8 s.d. 13 digit. Total 10-15 digit.
  if (!digit.startsWith('62') || digit.length < 10 || digit.length > 15) return null
  return digit
}

export type NotifikasiStatusSurat = {
  namaWarga: string
  nomorWhatsApp: string | null | undefined
  jenisSurat: string
  status: 'SELESAI' | 'DITOLAK'
  nomorSurat?: string | null
  catatan?: string | null
}

/** Susun isi pesan notifikasi status surat. */
export function buatPesanStatusSurat({
  namaWarga,
  jenisSurat,
  status,
  nomorSurat,
  catatan,
}: NotifikasiStatusSurat): string {
  const selesai = status === 'SELESAI'
  const baris: string[] = [
    '*SIDU — Desa Hulu Pancur Batu*',
    '',
    `Halo Bapak/Ibu ${namaWarga},`,
    '',
    selesai
      ? 'Pengajuan surat Anda telah *SELESAI* diproses.'
      : 'Mohon maaf, pengajuan surat Anda *DITOLAK*.',
    '',
    `• Jenis surat: ${jenisSurat}`,
    `• Status: ${selesai ? 'Selesai' : 'Ditolak'}`,
  ]

  if (selesai && nomorSurat) {
    baris.push(`• Nomor surat: ${nomorSurat}`)
  }

  baris.push(`• ${selesai ? 'Catatan' : 'Alasan'}: ${catatan?.trim() || '-'}`)

  if (selesai) {
    baris.push(
      '',
      'Silakan mengambil surat di kantor desa pada hari kerja dengan membawa KTP/KK asli.'
    )
  } else {
    baris.push(
      '',
      'Silakan perbaiki kekurangan berkas/data Anda, lalu ajukan kembali melalui portal SIDU atau hubungi kantor desa.'
    )
  }

  baris.push('', 'Pesan ini dikirim otomatis oleh sistem. Mohon tidak dibalas.')
  return baris.join('\n')
}

/**
 * Kirim satu pesan WhatsApp melalui gateway yang tersimpan di database.
 * Tidak pernah melempar error; kegagalan dikembalikan sebagai status.
 */
export async function kirimWhatsApp({
  nomor,
  pesan,
}: {
  nomor: string | null | undefined
  pesan: string
}): Promise<HasilKirimWhatsApp> {
  const config = await getWhatsAppConfig()

  if (!config.enabled) {
    return { status: 'dilewati', alasan: 'Notifikasi WhatsApp sedang dinonaktifkan.' }
  }
  if (!config.token) {
    return { status: 'dilewati', alasan: 'Token WhatsApp Gateway belum diisi.' }
  }

  const nomorTujuan = normalisasiNomorWhatsApp(nomor)
  if (!nomorTujuan) {
    return { status: 'dilewati', alasan: 'Nomor WhatsApp warga tidak tersedia/tidak valid.' }
  }

  let url: URL
  try {
    url = new URL(config.apiUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protokol')
  } catch {
    return { status: 'gagal', nomorTujuan, alasan: 'URL API WhatsApp Gateway tidak valid.' }
  }

  // Header HTTP hanya boleh berisi karakter Latin-1. Token yang ditempel dari
  // clipboard kadang membawa spasi/baris baru di tengah; bersihkan agar fetch
  // tidak gagal dengan "invalid header value" dan token terkirim utuh.
  const token = config.token.replace(/[\r\n\t]+/g, ' ').trim()
  if (!token) {
    return { status: 'dilewati', alasan: 'Token WhatsApp Gateway kosong.' }
  }

  const authType = resolveAuthType(config)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  const payload: Record<string, string> = {
    target: nomorTujuan,
    message: pesan,
  }
  if (config.senderNumber) payload.sender = config.senderNumber
  // Sebagian gateway generik menerima token di body, bukan di header.
  if (authType === 'body') payload.token = token

  const headers: Record<string, string> = {
    'Content-Type':
      config.format === 'json' ? 'application/json' : 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    'User-Agent': 'SIDU-WhatsApp-Gateway/1.0',
  }
  if (authType === 'bearer') headers.Authorization = `Bearer ${token}`
  else if (authType === 'x-api-key') headers['x-api-key'] = token
  else if (authType === 'raw') headers.Authorization = token
  // authType "body" tidak memakai header autentikasi.

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body:
        config.format === 'json'
          ? JSON.stringify(payload)
          : new URLSearchParams(payload).toString(),
      signal: controller.signal,
      cache: 'no-store',
    })

    const teks = await res.text().catch(() => '')
    let json: any = null
    try {
      json = teks ? JSON.parse(teks) : null
    } catch {
      json = null
    }

    if (!res.ok) {
      const rincian = json?.reason || json?.message || ''
      const petunjuk =
        res.status === 401 || res.status === 403
          ? ` Periksa "Metode Autentikasi Token" (Bearer/x-api-key/raw) agar cocok dengan gateway.`
          : ''
      return {
        status: 'gagal',
        nomorTujuan,
        alasan: `Gateway membalas HTTP ${res.status}${rincian ? `: ${rincian}` : ''}.${petunjuk}`,
      }
    }

    // Fonnte mengembalikan { status: true/false, reason: "..." } dengan HTTP 200.
    if (json && json.status === false) {
      return {
        status: 'gagal',
        nomorTujuan,
        alasan: typeof json.reason === 'string' ? json.reason : 'Gateway menolak pesan.',
      }
    }

    return { status: 'terkirim', nomorTujuan }
  } catch (error: any) {
    const kode = error?.cause?.code as string | undefined
    let alasan: string
    if (error?.name === 'AbortError') {
      alasan =
        'Gateway tidak merespons dalam 20 detik. Periksa API URL, port, dan pastikan gateway tidak menunggu header autentikasi yang salah.'
    } else if (kode === 'ECONNREFUSED') {
      alasan =
        'Koneksi ditolak gateway (ECONNREFUSED). Pastikan server gateway berjalan dan port benar.'
    } else if (kode === 'ENOTFOUND') {
      alasan = 'Alamat gateway tidak ditemukan (ENOTFOUND). Periksa kembali API URL.'
    } else if (kode === 'ECONNRESET') {
      alasan = 'Koneksi ke gateway terputus (ECONNRESET). Coba lagi atau periksa log gateway.'
    } else {
      alasan = error?.message || 'Gagal menghubungi gateway WhatsApp.'
    }
    return { status: 'gagal', nomorTujuan, alasan }
  } finally {
    clearTimeout(timeout)
  }
}

/** Susun lalu kirim notifikasi status surat ke warga pemohon. */
export async function kirimNotifikasiStatusSurat(
  input: NotifikasiStatusSurat
): Promise<HasilKirimWhatsApp> {
  return kirimWhatsApp({
    nomor: input.nomorWhatsApp,
    pesan: buatPesanStatusSurat(input),
  })
}
