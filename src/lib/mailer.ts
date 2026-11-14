import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Helper email terpusat untuk seluruh aplikasi.
 *
 * Konfigurasi yang dibaca (dari `.env`):
 * - EMAIL_SERVER_HOST      : contoh "smtp.gmail.com". Jika kosong -> fallback Gmail.
 * - EMAIL_SERVER_PORT      : contoh 587 (STARTTLS) atau 465 (SSL). Jika kosong -> fallback Gmail.
 * - EMAIL_SERVER_USER      : alamat email pengirim / akun SMTP.
 * - EMAIL_SERVER_PASSWORD  : App Password Gmail atau password SMTP.
 * - EMAIL_FROM             : alamat pengirim yang ditampilkan. Boleh berupa
 *                            "nama@domain.com" atau `"Nama" <nama@domain.com>`.
 *                            Jika kosong -> memakai EMAIL_SERVER_USER.
 */

type MailerGlobal = typeof globalThis & {
  __siduMailerTransporter?: Transporter
}

const globalForMailer = globalThis as MailerGlobal

function readEnv(name: string): string | undefined {
  const value = process.env[name]
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Apakah kredensial SMTP minimum sudah tersedia. */
export function isMailConfigured(): boolean {
  return Boolean(readEnv('EMAIL_SERVER_USER') && readEnv('EMAIL_SERVER_PASSWORD'))
}

/**
 * Buat transporter baru. Jika EMAIL_SERVER_HOST dan EMAIL_SERVER_PORT diisi,
 * dipakai sebagai SMTP eksplisit. Jika salah satu kosong, fallback ke
 * `service: 'gmail'` seperti perilaku lama.
 */
export function createMailTransporter(): Transporter {
  const user = readEnv('EMAIL_SERVER_USER')
  const pass = readEnv('EMAIL_SERVER_PASSWORD')
  const host = readEnv('EMAIL_SERVER_HOST')
  const portRaw = readEnv('EMAIL_SERVER_PORT')
  const port = portRaw ? Number(portRaw) : NaN

  const auth = user && pass ? { user, pass } : undefined

  if (host && Number.isInteger(port) && port > 0 && port <= 65535) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth,
    })
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth,
  })
}

/** Transporter singleton (disimpan di globalThis agar aman saat hot reload Next.js). */
export function getMailTransporter(): Transporter {
  if (!globalForMailer.__siduMailerTransporter) {
    globalForMailer.__siduMailerTransporter = createMailTransporter()
  }
  return globalForMailer.__siduMailerTransporter
}

/**
 * Tentukan alamat `From` final.
 * - EMAIL_FROM sudah berisi format lengkap (`Nama <email>`) -> dipakai apa adanya.
 * - EMAIL_FROM berisi email saja + fromName -> dibungkus menjadi `"Nama" <email>`.
 * - EMAIL_FROM kosong -> memakai EMAIL_SERVER_USER.
 */
export function resolveFromAddress(fromName?: string): string {
  const configured = readEnv('EMAIL_FROM') || readEnv('EMAIL_SERVER_USER')
  if (!configured) {
    throw new Error(
      'Konfigurasi email belum lengkap: isi EMAIL_FROM atau EMAIL_SERVER_USER di file .env.'
    )
  }

  if (configured.includes('<')) return configured
  if (!fromName) return configured

  // Buang karakter yang bisa memecah header email (CR/LF) dan tanda kutip.
  const safeName = fromName.replace(/["\r\n]/g, '')
  return `"${safeName}" <${configured}>`
}

export type SendMailInput = {
  to: string
  subject: string
  html: string
  text?: string
  /** Nama tampilan pengirim, misalnya "Desa Hulu Pancur Batu". */
  fromName?: string
}

/** Kirim satu email. Melempar error yang jelas bila konfigurasi belum lengkap. */
export async function sendMail({ to, subject, html, text, fromName }: SendMailInput) {
  if (!isMailConfigured()) {
    throw new Error(
      'Konfigurasi email belum lengkap: EMAIL_SERVER_USER dan EMAIL_SERVER_PASSWORD wajib diisi di file .env.'
    )
  }

  return getMailTransporter().sendMail({
    from: resolveFromAddress(fromName),
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  })
}
