// Pemeriksaan AMAN (hanya membaca, tidak mengubah apa pun): daftar status akun.
// Jalankan di folder proyek:  node scripts/cek-status-akun.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const users = await prisma.user.findMany({
  select: { username: true, role: true, statusAkun: true, lastLoginAt: true },
  orderBy: [{ role: 'asc' }, { username: 'asc' }],
})

const hitung = {}
for (const u of users) {
  const kunci = `${u.role} / ${u.statusAkun}`
  hitung[kunci] = (hitung[kunci] || 0) + 1
}

console.log('\nJumlah akun per peran dan status:')
for (const [k, v] of Object.entries(hitung).sort()) console.log(`  ${k.padEnd(24)} ${v}`)

// Username WARGA berisi NIK, jadi hanya akun ADMIN dan KADUS yang ditampilkan
console.log('\nAkun ADMIN dan KADUS:')
for (const u of users.filter((x) => x.role !== 'WARGA')) {
  console.log(`  ${u.role.padEnd(6)} ${u.username.padEnd(20)} status=${u.statusAkun}`)
}
console.log('')
await prisma.$disconnect()
