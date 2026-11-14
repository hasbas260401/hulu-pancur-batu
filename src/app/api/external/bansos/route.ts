import { NextResponse } from 'next/server'
import { type Prisma, type StatusBansos } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/api-key'
import { catatKejadianKeamanan, periksaParameterMencurigakan } from '@/lib/audit'
import { clientIp } from '@/lib/rate-limit'

const STATUS_VALID = ['AKTIF', 'SELESAI', 'DICABUT']
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
  const check = await verifyApiKey(req, 'BANSOS')
  if (!check.ok) return check.response

  try {
    const { searchParams } = new URL(req.url)

    const mencurigakan = periksaParameterMencurigakan(searchParams)
    if (mencurigakan) {
      await catatKejadianKeamanan({
        aksi: 'SECURITY_INJEKSI_PAYLOAD',
        entitas: 'API Eksternal',
        detail: {
          sumber: 'API data bansos',
          parameter: mencurigakan.parameter,
          pola: mencurigakan.pola,
        },
        ip: clientIp(req) === 'unknown' ? null : clientIp(req),
        tingkat: 'TINGGI',
      })
      return NextResponse.json(
        { error: 'Parameter permintaan tidak valid.' },
        { status: 400, headers: NO_STORE }
      )
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100))

    const program = searchParams.get('program')?.trim()
    const periode = searchParams.get('periode')?.trim()
    const status = searchParams.get('status')?.trim().toUpperCase()

    if (status && !STATUS_VALID.includes(status)) {
      return NextResponse.json(
        { error: `Parameter status tidak valid. Pilihan: ${STATUS_VALID.join(', ')}.` },
        { status: 400, headers: NO_STORE }
      )
    }

    const where: Prisma.BansosWhereInput = {}
    if (program) where.program = { equals: program, mode: 'insensitive' }
    if (periode) where.periode = { equals: periode, mode: 'insensitive' }
    if (status) where.status = status as StatusBansos

    const [total, rows] = await prisma.$transaction([
      prisma.bansos.count({ where }),
      prisma.bansos.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], // urutan stabil agar paginasi konsisten
        skip: (page - 1) * limit,
        take: limit,
        select: {
          program: true,
          periode: true,
          nominal: true,
          status: true,
          warga: { select: { nik: true, nama: true } },
          dusun: { select: { nama: true } },
        },
      }),
    ])

    const data = rows.map((b) => ({
      program: b.program,
      periode: b.periode,
      nominal: b.nominal ? Number(b.nominal) : null,
      status: b.status,
      nik: b.warga.nik,
      nama: b.warga.nama,
      dusun: b.dusun.nama,
    }))

    return NextResponse.json(
      {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          filter: { program: program || null, periode: periode || null, status: status || null },
        },
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('External API bansos error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500, headers: NO_STORE }
    )
  }
}
