import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })
    }

    // Data diambil HANYA lewat relasi akun -> warga milik pengguna yang login.
    // (sebelumnya dicari lewat kecocokan nama/NIK secara longgar, sehingga warga bernama "Ali"
    //  bisa mendapat data lengkap warga bernama "Alimuddin")
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        noWhatsapp: true,
        statusAkun: true,
        dusun: { select: { nama: true } },
        warga: {
          select: {
            nama: true,
            nik: true,
            tanggalLahir: true,
            jenisKelamin: true,
            dusun: { select: { nama: true } },
            kk: {
              select: {
                noKk: true,
                alamat: true,
                rt: true,
                rw: true,
                anggota: { select: { id: true, nama: true, nik: true, hubunganKeluarga: true } },
              },
            },
          },
        },
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })
    }

    // Normalisasi status: ACTIVE atau AKTIF dijadikan 'AKTIF'
    const rawStatus = dbUser.statusAkun || 'PENDING'
    const normalizedStatus = rawStatus.toString().toUpperCase()
    const userStatus = normalizedStatus === 'ACTIVE' || normalizedStatus === 'AKTIF' ? 'AKTIF' : rawStatus

    const userEmail = dbUser.email || '-'
    const userWhatsApp = dbUser.noWhatsapp || '-'
    const warga = dbUser.warga

    // Akun belum terhubung ke data warga
    if (!warga) {
      return NextResponse.json(
        {
          nama: (session?.user as any)?.name || 'Warga Desa',
          nik: dbUser.username || '-',
          status: userStatus,
          dusun: dbUser.dusun?.nama || '-',
          email: userEmail,
          noWhatsapp: userWhatsApp,
          noKK: '-',
          alamat: '-',
          tanggalLahir: '-',
          jenisKelamin: '-',
          anggotaKeluarga: [],
        },
        { headers: NO_STORE }
      )
    }

    const kk = warga.kk
    const anggotaKeluarga = (kk?.anggota ?? []).map((ang) => ({
      id: ang.id,
      nama: ang.nama,
      nik: ang.nik,
      hubungan: ang.hubunganKeluarga || 'Anggota Keluarga',
    }))

    return NextResponse.json(
      {
        nama: warga.nama,
        nik: warga.nik,
        status: userStatus,
        dusun: warga.dusun?.nama || dbUser.dusun?.nama || '-',
        email: userEmail,
        noWhatsapp: userWhatsApp,
        noKK: kk?.noKk || '-',
        alamat: kk ? `${kk.alamat}${kk.rt ? `, RT ${kk.rt}` : ''}${kk.rw ? `/RW ${kk.rw}` : ''}` : '-',
        tanggalLahir: warga.tanggalLahir
          ? new Date(warga.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
          : '-',
        jenisKelamin: warga.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
        anggotaKeluarga,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('Error fetching warga data:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500, headers: NO_STORE })
  }
}