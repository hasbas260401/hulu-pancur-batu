import { Suspense } from 'react'
import { PrismaClient } from '@prisma/client'
import LoginFormClient from './LoginFormClient'

const prisma = new PrismaClient()

// Komponen terpisah untuk mengambil data logo dari database
async function LoginWithLogo() {
  const settings = await prisma.webSettings.findFirst().catch(() => null)
  const logoDesa = settings?.logoDesa || ''

  return <LoginFormClient logoDesa={logoDesa} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormClient logoDesa="" />}>
      <LoginWithLogo />
    </Suspense>
  )
}