import { NextResponse } from 'next/server'
import { type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getWargaScope } from '@/lib/warga-scope'

const NO_STORE = { 'Cache-Control': 'no-store' }
const STATUS_VALID = ['AKTIF', 'MENINGGAL', 'PINDAH']
const MODE_VALID = ['semua', 'nik', 'kk', 'nama']

function param(sp: URLSearchParams, key: string, max = 100) {
  return (sp.get(key) || '').trim().slice(0, max)
}

export async function GET(request: Request) {
  // Wajib login, wajib ADMIN/KADUS, dan KADUS hanya mendapat data dusunnya sendiri
  const scope = await getWargaScope()
  if (!scope.ok) {
    return NextResponse.json({ error: scope.message }, { status: scope.status, headers: NO_STORE })
  }

  try {
    const { searchParams } = new URL(request.url)

    const query = param(searchParams, 'query')
    const modeRaw = param(searchParams, 'mode', 10)
    const mode = MODE_VALID.includes(modeRaw) ? modeRaw : 'semua'
    const agama = param(searchParams, 'agama')
    const pekerjaan = param(searchParams, 'pekerjaan')
    const bantuan = param(searchParams, 'bantuan')
    const statusRaw = param(searchParams, 'status', 20).toUpperCase()
    const statusTab = STATUS_VALID.includes(statusRaw) ? statusRaw : 'AKTIF'

    const page = Math.min(100000, Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1))
    const pageSize = 15
    const skip = (page - 1) * pageSize

    let textSearchCondition: Prisma.WargaWhereInput | undefined = undefined
    if (query) {
      if (mode === 'nik') {
        textSearchCondition = { nik: { contains: query, mode: 'insensitive' } }
      } else if (mode === 'kk') {
        textSearchCondition = { kk: { noKk: { contains: query, mode: 'insensitive' } } }
      } else if (mode === 'nama') {
        textSearchCondition = { nama: { contains: query, mode: 'insensitive' } }
      } else {
        textSearchCondition = {
          OR: [
            { nama: { contains: query, mode: 'insensitive' } },
            { nik: { contains: query, mode: 'insensitive' } },
            { kk: { noKk: { contains: query, mode: 'insensitive' } } },
          ],
        }
      }
    }

    let bansosCondition: Prisma.BansosListRelationFilter | undefined = undefined
    if (bantuan) {
      bansosCondition = {
        some: {
          program: { contains: bantuan, mode: 'insensitive' },
          status: 'AKTIF',
        },
      }
    }

    const whereCondition: Prisma.WargaWhereInput = {
      statusWarga: statusTab,
      ...scope.dusunFilter,
      ...textSearchCondition,
      agama: agama ? { equals: agama, mode: 'insensitive' } : undefined,
      pekerjaan: pekerjaan ? { contains: pekerjaan, mode: 'insensitive' } : undefined,
      ...(bansosCondition ? { bansos: bansosCondition } : {}),
    }

    const totalFilteredWarga = await prisma.warga.count({ where: whereCondition })
    const dataWarga = await prisma.warga.findMany({
      where: whereCondition,
      include: {
        dusun: true,
        kk: {
          include: { dusun: true },
        },
        bansos: true,
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: skip,
    })

    return NextResponse.json({ dataWarga, totalFilteredWarga }, { headers: NO_STORE })
  } catch (error) {
    console.error('Error fetching warga API:', error)
    return NextResponse.json({ error: 'Gagal mengambil data warga' }, { status: 500, headers: NO_STORE })
  }
}