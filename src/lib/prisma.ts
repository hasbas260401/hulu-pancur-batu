import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Satu PrismaClient untuk seluruh aplikasi. Ini penting di produksi:
// setiap PrismaClient membuka connection pool sendiri, jadi membuat instance
// baru di tiap modul bisa menghabiskan koneksi PostgreSQL.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Jangan log setiap query di produksi: logging query sangat boros I/O
    // dan memperlambat request. Di development cukup peringatan dan error.
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['warn', 'error'],
  })

globalForPrisma.prisma = prisma
