import NextAuth, { CredentialsSignin } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const prisma = new PrismaClient()

const MAX_GAGAL = 5 // salah password 5x berturut-turut -> akun dikunci sementara
const KUNCI_MENIT = 15

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
        if (ip !== 'unknown') {
          const rl = rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000)
          if (!rl.ok) throw new TooManyAttemptsError()
        }

        const user = await prisma.user.findUnique({
          where: { username },
          include: { dusun: true, warga: true },
        })

        const isPasswordValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

        if (!user || !user.passwordHash) {
          throw new InvalidCredentialsError()
        }

        // Akun sedang dikunci
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new AccountLockedError()
        }

        if (!isPasswordValid) {
          const gagal = user.failedLogin + 1
          await prisma.user.update({
            where: { id: user.id },
            data:
              gagal >= MAX_GAGAL
                ? { failedLogin: 0, lockedUntil: new Date(Date.now() + KUNCI_MENIT * 60 * 1000) }
                : { failedLogin: gagal },
          })
          throw new InvalidCredentialsError()
        }

        // Akun belum aktif / pending / non-aktif
        if (!isActiveStatus(user.statusAkun)) {
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

        return {
          id: user.id,
          name: user.warga?.nama || user.username,
          role: user.role,
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
        token.dusunId = (user as any).dusunId
        token.dusunNama = (user as any).dusunNama
        token.permissions = (user as any).permissions
        token.sessionId = (user as any).sessionId
      }

      // Token lama tanpa sessionId → paksa login ulang
      if (!token.sessionId) return null as any

      // Sesi sudah dicabut / kedaluwarsa → logout otomatis
      const active = await prisma.userSession.findUnique({
        where: { id: token.sessionId as string },
      })
      if (!active || active.expiresAt < new Date()) return null as any

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token.id ?? token.sub) as string
        ;(session.user as any).role = token.role
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