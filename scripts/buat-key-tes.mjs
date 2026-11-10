// SKRIP SEMENTARA untuk mengetes endpoint sebelum UI jadi.
// Pemakaian:  node scripts/buat-key-tes.mjs WARGA   (atau BANSOS)
// Hapus file ini setelah fitur di halaman Pengaturan selesai.
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const jenis = (process.argv[2] || '').toUpperCase()
if (!['WARGA', 'BANSOS'].includes(jenis)) {
  console.error('Pakai: node scripts/buat-key-tes.mjs WARGA|BANSOS')
  process.exit(1)
}

const prisma = new PrismaClient()
const key = 'sidu_' + crypto.randomBytes(32).toString('base64url')
const keyHash = crypto.createHash('sha256').update(key).digest('hex')
const keyPrefix = key.slice(0, 12)

await prisma.apiKey.upsert({
  where: { jenis },
  update: { keyHash, keyPrefix, isActive: true },
  create: { jenis, keyHash, keyPrefix, isActive: true },
})

console.log(`\nAPI key ${jenis} (simpan, tidak akan ditampilkan lagi):\n\n${key}\n`)
await prisma.$disconnect()
