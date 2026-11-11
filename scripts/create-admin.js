const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await hash('admin123', 10)

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('Admin berhasil dibuat:', admin)
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())