import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/require-admin'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const KONFIRMASI = 'HAPUS SEMUA DATA'
const MAX_GAGAL = 5
const JENDELA_MENIT = 15
const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE })
}

async function catat(userId: string, aksi: string, detail: Record<string, string | number>, ip: string | null) {
  try {
    await prisma.auditLog.create({ data: { userId, aksi, entitas: 'Database', detail, ip } })
  } catch (error) {
    console.error('Gagal mencatat audit log:', error)
  }
}

export async function POST(req: Request) {
  // 0. Di server produksi fitur ini MATI, kecuali dinyalakan secara sengaja lewat ALLOW_DB_RESET=true
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_RESET !== 'true') {
    return fail(403, 'Fitur ini dinonaktifkan di server produksi.')
  }

  // 1. Wajib login sebagai ADMIN (peran dicek dari database, bukan dari token)
  const admin = await requireAdmin()
  if (!admin.ok) return fail(admin.status, admin.message)

  let body: any
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Isi permintaan tidak valid.')
  }
  const password = typeof body?.password === 'string' ? body.password : ''
  const konfirmasi = typeof body?.konfirmasi === 'string' ? body.konfirmasi.trim() : ''
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null

  // 2. Kalimat konfirmasi harus diketik persis
  if (konfirmasi !== KONFIRMASI) {
    return fail(400, `Ketik "${KONFIRMASI}" untuk melanjutkan.`)
  }

  // 3. Batasi percobaan password yang salah (dihitung dari audit log, jadi tahan restart server)
  const sejak = new Date(Date.now() - JENDELA_MENIT * 60 * 1000)
  const jumlahGagal = await prisma.auditLog.count({
    where: { userId: admin.userId, aksi: 'RESET_DB_GAGAL', createdAt: { gte: sejak } },
  })
  if (jumlahGagal >= MAX_GAGAL) {
    return fail(429, `Terlalu banyak percobaan yang gagal. Coba lagi dalam ${JENDELA_MENIT} menit.`)
  }

  // 4. Password harus milik akun admin yang sedang login (bukan password tetap bersama)
  const me = await prisma.user.findUnique({
    where: { id: admin.userId },
    select: { passwordHash: true },
  })
  const valid = !!me?.passwordHash && password.length > 0 && (await bcrypt.compare(password, me.passwordHash))
  if (!valid) {
    await catat(admin.userId, 'RESET_DB_GAGAL', { alasan: 'password salah' }, ip)
    return fail(403, 'Password salah.')
  }

  // 5. Eksekusi: satu transaksi, urutan mengikuti relasi (bansos -> warga -> KK)
  try {
    // Riwayat pengajuan surat ikut terhapus otomatis (relasi Cascade ke warga); dihitung untuk catatan
    const pengajuanSurat = await prisma.pengajuanSurat.count()

    const [bansos, warga, kk] = await prisma.$transaction([
      prisma.bansos.deleteMany({}),
      prisma.warga.deleteMany({}),
      prisma.kartuKeluarga.deleteMany({}),
    ])

    await catat(
      admin.userId,
      'RESET_DB',
      {
        warga: warga.count,
        kartuKeluarga: kk.count,
        bansos: bansos.count,
        pengajuanSuratIkutTerhapus: pengajuanSurat,
      },
      ip
    )

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/warga')

    return NextResponse.json(
      {
        success: true,
        message: `Data dikosongkan: ${warga.count} warga, ${kk.count} KK, ${bansos.count} penerima bansos.`,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('Gagal memproses reset database:', error)
    return fail(500, 'Terjadi kesalahan saat mengosongkan data. Tidak ada data yang diubah.')
  }
}