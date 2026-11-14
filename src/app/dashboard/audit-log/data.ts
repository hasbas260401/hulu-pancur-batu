import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PER_HALAMAN, type AuditLogData } from './types'

export type AuditLogSearchParams = {
  q?: string
  jenis?: string
  page?: string
}

/**
 * Ambil data audit log (ringkasan, filter, dan halaman aktif) dari database.
 * Autentikasi/otorisasi diperiksa oleh pemanggil (halaman server).
 */
export async function ambilDataAudit(
  params: AuditLogSearchParams
): Promise<AuditLogData> {
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 80) : ''
  const jenis = params.jenis === 'mencurigakan' ? 'mencurigakan' : 'semua'
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const filterMencurigakan: Prisma.AuditLogWhereInput = {
    OR: [{ aksi: { startsWith: 'SECURITY_' } }, { aksi: 'RESET_DB_GAGAL' }],
  }

  const filterCari: Prisma.AuditLogWhereInput = {
    OR: [
      { aksi: { contains: q, mode: 'insensitive' } },
      { entitas: { contains: q, mode: 'insensitive' } },
      { ip: { contains: q } },
      { user: { is: { username: { contains: q, mode: 'insensitive' } } } },
      { user: { is: { warga: { is: { nama: { contains: q, mode: 'insensitive' } } } } } },
      { user: { is: { warga: { is: { nik: { contains: q } } } } } },
    ],
  }

  const kondisi: Prisma.AuditLogWhereInput[] = []
  if (jenis === 'mencurigakan') kondisi.push(filterMencurigakan)
  if (q) kondisi.push(filterCari)
  const where: Prisma.AuditLogWhereInput = kondisi.length ? { AND: kondisi } : {}

  // Awal hari ini menurut WIB (UTC+7), dipakai untuk ringkasan.
  const sekarang = new Date()
  const wib = new Date(sekarang.getTime() + 7 * 60 * 60 * 1000)
  const awalHari = new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 60 * 60 * 1000
  )

  const [total, totalMencurigakan, totalHariIni, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: filterMencurigakan }),
    prisma.auditLog.count({ where: { createdAt: { gte: awalHari } } }),
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      include: {
        user: {
          select: {
            username: true,
            role: true,
            warga: { select: { nama: true, nik: true } },
          },
        },
      },
    }),
  ])

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN))

  return {
    rows,
    total,
    totalMencurigakan,
    totalHariIni,
    page: Math.min(page, totalHalaman),
    q,
    jenis,
  }
}
