import type { Prisma } from '@prisma/client'

export const PER_HALAMAN = 25

export type AuditLogJenis = 'semua' | 'mencurigakan'

export type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: {
    user: {
      select: {
        username: true
        role: true
        warga: { select: { nama: true; nik: true } }
      }
    }
  }
}>

export type AuditLogData = {
  rows: AuditLogRow[]
  total: number
  totalMencurigakan: number
  totalHariIni: number
  page: number
  q: string
  jenis: AuditLogJenis
}
