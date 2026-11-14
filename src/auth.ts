import NextAuth, { CredentialsSignin } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { catatKejadianKeamanan, deteksiPayloadMencurigakan } from '@/lib/audit'

const MAX_GAGAL = 5 // salah password 5x berturut-turut -> akun dikunci sementara
const KUNCI_MENIT = 15

/**
 * Pemeriksaan sesi ke database, di-cache per request.
 *
 * Satu kali membuka halaman dashboard bisa memanggil `auth()` beberapa kali
 * (proxy, layout, halaman, dan pengecekan scope). Tanpa cache, setiap
 * pemanggilan menembak satu query `userSession`. Dengan `cache()` dari React,
 * query yang sama hanya dijalankan sekali untuk satu request, sehingga jumlah
 * query ke PostgreSQL tidak bertambah mengikuti jumlah pemanggilan `auth()`.
 *
 * Cache ini hanya berlaku selama satu request dan tidak pernah membocorkan
 * sesi antar pengguna. Pencabutan sesi tetap berlaku pada request berikutnya.
 */
const getActiveSession = cache(async (sessionId: string) => {
  return prisma.userSession.findUnique({ where: { id: sessionId } })
})

/**
 * Kode kesalahan login yang aman dikirim ke halaman login.
 * Pesan asli tetap dicatat di server, sedangkan klien hanya menerima kode
 * singkat agar bisa menampilkan pesan yang jelas dan konsisten.
 */
class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super()
    this.code = code
  }
}

class InvalidCredentialsError extends LoginError {
  constructor() {
    super('invalid_credentials')
  }
}

class AccountInactiveError extends LoginError {
  constructor() {
    super('account_inactive')
  }
}

class AccountLockedError extends LoginError {
  constructor() {
    super('account_locked')
  }
}

class TooManyAttemptsError extends LoginError {
  constructor() {
    super('too_many_attempts')
  }
}

class MissingFieldsError extends LoginError {
  constructor() {
    super('missing_fields')
  }
}

// Hash cadangan: bcrypt tetap dijalankan walau username tidak ada, supaya waktu respons
// tidak membocorkan apakah sebuah username terdaftar
const DUMMY_HASH = bcrypt.hashSync('kata-sandi-cadangan-untuk-pengukur-waktu', 10)

// Hanya akun berstatus aktif yang boleh masuk (ACTIVE / AKTIF). PENDING, REJECTED, SUSPENDED, dll ditolak.
function isActiveStatus(status: string | null | undefined) {
  return status === 'ACTIVE' || status === 'AKTIF'
}

// Warga dengan akun PENDING tetap boleh login agar bisa melihat dashboard-nya,
// tetapi menu lain dikunci sampai admin memverifikasi. Akun DITOLAK/NONAKTIF
// (dan akun non-warga yang belum aktif) tetap tidak boleh masuk.
function canLogin(status: string | null | undefined, role: string) {
  if (isActiveStatus(status)) return true
  return status === 'PENDING' && role === 'WARGA'
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username / NIK', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) {
          throw new MissingFieldsError()
        }

        const username = String(credentials.username).trim()
        const password = String(credentials.password)

        const ip = request ? clientIp(request) : 'unknown'

        // Catat upaya injeksi payload pada formulir login. Autentikasi tetap
        // diproses seperti biasa; pencatatan hanya untuk sinyal keamanan.
        const polaUsername = deteksiPayloadMencurigakan(username)
        const polaPassword = deteksiPayloadMencurigakan(password)
        if (polaUsername || polaPassword) {
          await catatKejadianKeamanan({
            aksi: 'SECURITY_INJEKSI_PAYLOAD',
            entitas: 'Login',
            detail: {
              sumber: 'form login',
              username: username.slice(0, 80),
              parameter: [polaUsername ? 'username' : null, polaPassword ? 'password' : null]
                .filter(Boolean)
                .join(', '),
              pola: polaUsername ?? polaPassword,
            },
            ip: ip === 'unknown' ? null : ip,
            tingkat: 'TINGGI',
          })
        }

        if (ip !== 'unknown') {
          const rl = rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000)
          if (!rl.ok) {
            await catatKejadianKeamanan({
              aksi: 'SECURITY_LOGIN_DIBLOKIR',
              entitas: 'Login',
              detail: {
                username: username.slice(0, 80),
                alasan: 'terlalu banyak percobaan login dari IP yang sama',
                coba_lagi_detik: rl.retryAfterSec,
              },
              ip,
              tingkat: 'TINGGI',
            })
            throw new TooManyAttemptsError()
          }
        }

        const user = await prisma.user.findUnique({
          where: { username },
          include: { dusun: true, warga: true },
        })

        const isPasswordValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

        if (!user || !user.passwordHash) {
          await catatKejadianKeamanan({
            aksi: 'SECURITY_LOGIN_GAGAL',
            entitas: 'Login',
            detail: {
              username: username.slice(0, 80),
              alasan: 'username tidak terdaftar',
            },
            ip: ip === 'unknown' ? null : ip,
          })
          throw new InvalidCredentialsError()
        }

        // Akun sedang dikunci
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await catatKejadianKeamanan({
            userId: user.id,
            aksi: 'SECURITY_AKUN_TERKUNCI',
            entitas: 'Login',
            entitasId: user.id,
            detail: {
              username: user.username,
              dikunci_sampai: user.lockedUntil.toISOString(),
            },
            ip: ip === 'unknown' ? null : ip,
            tingkat: 'TINGGI',
          })
          throw new AccountLockedError()
        }

        if (!isPasswordValid) {
          const gagal = user.failedLogin + 1
          const akanDikunci = gagal >= MAX_GAGAL
          await prisma.user.update({
            where: { id: user.id },
            data: akanDikunci
              ? { failedLogin: 0, lockedUntil: new Date(Date.now() + KUNCI_MENIT * 60 * 1000) }
              : { failedLogin: gagal },
          })
          await catatKejadianKeamanan({
            userId: user.id,
            aksi: 'SECURITY_LOGIN_GAGAL',
            entitas: 'Login',
            entitasId: user.id,
            detail: {
              username: user.username,
              alasan: 'kata sandi salah',
              percobaan_ke: gagal,
              akun_dikunci: akanDikunci,
            },
            ip: ip === 'unknown' ? null : ip,
            tingkat: akanDikunci ? 'TINGGI' : 'PERINGATAN',
          })
          throw new InvalidCredentialsError()
        }

        // Akun belum aktif / pending / non-aktif
        if (!canLogin(user.statusAkun, user.role)) {
          throw new AccountInactiveError()
        }

        // Login berhasil: reset counter dan catat sesi
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogin: 0, lockedUntil: null, lastLoginAt: new Date() },
        })

        const userAgent = request?.headers?.get('user-agent') || 'Tidak diketahui'
        const forwarded = request?.headers?.get('x-forwarded-for')
        const ipAddress =
          forwarded?.split(',')[0].trim() ||
          request?.headers?.get('x-real-ip') ||
          'Tidak diketahui'

        const userSession = await prisma.userSession.create({
          data: {
            userId: user.id,
            token: crypto.randomUUID(),
            userAgent,
            ipAddress,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })

        // Catat aktivitas login berhasil agar riwayat aktivitas lengkap.
        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              aksi: 'LOGIN',
              entitas: 'User',
              entitasId: user.id,
              detail: {
                username: user.username,
                perangkat: userAgent.slice(0, 150),
              },
              ip: ipAddress === 'Tidak diketahui' ? null : ipAddress,
            },
          })
        } catch (error) {
          console.error('Gagal mencatat audit login:', error)
        }

        return {
          id: user.id,
          name: user.warga?.nama || user.username,
          role: user.role,
          statusAkun: user.statusAkun || 'PENDING',
          dusunId: user.dusunId,
          dusunNama: user.dusun?.nama || null,
          permissions: user.permissions || [],
          sessionId: userSession.id,
        }
      },
    }),
  ],
  events: {
    // Saat logout: hapus baris sesi di database. Tanpa ini, logout hanya menghapus cookie
    // di browser, sedangkan token lama tetap dianggap sah sampai kedaluwarsa (30 hari).
    async signOut(message) {
      const sessionId = (message as any)?.token?.sessionId as string | undefined
      if (!sessionId) return
      try {
        await prisma.userSession.deleteMany({ where: { id: sessionId } })
        const userId = (message as any)?.token?.id as string | undefined
        if (userId) {
          await prisma.auditLog.create({
            data: {
              userId,
              aksi: 'LOGOUT',
              entitas: 'User',
              entitasId: userId,
              detail: {},
            },
          })
        }
      } catch (error) {
        console.error('Gagal mencabut sesi saat logout:', error)
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.statusAkun = (user as any).statusAkun
        token.dusunId = (user as any).dusunId
        token.dusunNama = (user as any).dusunNama
        token.permissions = (user as any).permissions
        token.sessionId = (user as any).sessionId
      }

      // Token lama tanpa sessionId → paksa login ulang
      if (!token.sessionId) return null as any

      // Sesi sudah dicabut / kedaluwarsa → logout otomatis
      const active = await getActiveSession(token.sessionId as string)
      if (!active || active.expiresAt < new Date()) return null as any

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token.id ?? token.sub) as string
        ;(session.user as any).role = token.role
        // Token lama (sebelum statusAkun disimpan) dianggap aktif; akun PENDING
        // baru selalu membawa status ini sejak login.
        ;(session.user as any).statusAkun = (token.statusAkun as string) || 'ACTIVE'
        ;(session.user as any).dusunId = token.dusunId
        ;(session.user as any).dusunNama = token.dusunNama
        ;(session.user as any).permissions = token.permissions
        ;(session.user as any).sessionId = token.sessionId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
})