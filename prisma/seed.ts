import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Memulai proses seeding data desa...')

  // 1. Buat 5 Dusun
  const dusunData = [
    { nomor: 1, nama: 'Dusun I' },
    { nomor: 2, nama: 'Dusun II' },
    { nomor: 3, nama: 'Dusun III' },
    { nomor: 4, nama: 'Dusun IV' },
    { nomor: 5, nama: 'Dusun V' },
  ]

  for (const d of dusunData) {
    await prisma.dusun.upsert({
      where: { nomor: d.nomor },
      update: {},
      create: d,
    })
  }
  console.log('✅ Data 5 Dusun berhasil dibuat.')

  // 2. Hash Password bawaan
  const defaultPasswordAdmin = await bcrypt.hash('admin123', 10)
  const defaultPasswordKadus = await bcrypt.hash('kadus123', 10)

  // 3. Buat Akun Admin Desa
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: defaultPasswordAdmin,
      role: 'ADMIN',
      statusAkun: 'AKTIF',
    },
  })
  console.log('✅ Akun Admin Desa berhasil dibuat (username: admin / pass: admin123).')

  // 4. Buat Akun KADUS Dusun 1 - 5
  for (let i = 1; i <= 5; i++) {
    const dusun = await prisma.dusun.findUnique({ where: { nomor: i } })
    if (dusun) {
      await prisma.user.upsert({
        where: { username: `kadus${i}` },
        update: {},
        create: {
          username: `kadus${i}`,
          passwordHash: defaultPasswordKadus,
          role: 'KADUS',
          statusAkun: 'AKTIF',
          dusunId: dusun.id,
        },
      })
    }
  }
  console.log('✅ Akun KADUS Dusun 1-5 berhasil dibuat (username: kadus1..5 / pass: kadus123).')

  // 5. Buat Template Surat Dasar
  const templates = [
    {
      kode: 'SKU',
      nama: 'Surat Keterangan Usaha',
      kodeKlasifikasi: '503',
      filePath: '/templates/SKU.docx',
      placeholders: ['NAMA', 'NIK', 'ALAMAT', 'JENIS_USAHA'],
    },
    {
      kode: 'SKTM',
      nama: 'Surat Keterangan Tidak Mampu',
      kodeKlasifikasi: '400',
      filePath: '/templates/SKTM.docx',
      placeholders: ['NAMA', 'NIK', 'ALAMAT', 'KEPERLUAN'],
    },
    {
      kode: 'DOMISILI',
      nama: 'Surat Keterangan Domisili',
      kodeKlasifikasi: '470',
      filePath: '/templates/DOMISILI.docx',
      placeholders: ['NAMA', 'NIK', 'ALAMAT'],
    },
  ]

  for (const t of templates) {
    await prisma.templateSurat.upsert({
      where: { kode: t.kode },
      update: {},
      create: t,
    })
  }
  console.log('✅ Template Surat dasar berhasil ditambahkan.')

  console.log('🎉 Seeding Selesai!')
}

main()
  .catch((e) => {
    console.error('❌ Gagal melakukan seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })