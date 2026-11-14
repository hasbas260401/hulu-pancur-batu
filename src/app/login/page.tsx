import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import LoginFormClient from './LoginFormClient'

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