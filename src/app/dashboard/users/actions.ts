'use server'

import { PrismaClient, Prisma, type Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/require-admin'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const ROLES = ['WARGA', 'KADUS', 'ADMIN']
const STATUSES = ['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED']
// Menu yang boleh diberikan. Menu "users" sengaja tidak ada: hanya ADMIN yang boleh mengelola akun.
const MENU_IDS = [
  'dashboard', 'warga', 'surat', 'bansos', 'transparansi', 'konten', 'settings',
  'warga-home', 'warga-profil', 'warga-surat',
]

// <helpers>
function text(value: FormDataEntryValue | null, max = 255) {
  return String(value ?? '').trim().slice(0, max)
}

function isValidUsername(u: string) {
  return /^[A-Za-z0-9._-]{3,50}$/.test(u)
}

function isActiveStatus(s: string) {
  return s === 'ACTIVE' || s === 'AKTIF'
}

// Hanya id menu yang dikenal, tanpa duplikat
function cleanPermissions(values: FormDataEntryValue[]) {
  return Array.from(new Set(values.map((v) => String(v)).filter((v) => MENU_IDS.includes(v))))
}

function sameSet(a: string[], b: string[]) {
  const sa = new Set(a)
  const sb = new Set(b)
  return sa.size === sb.size && [...sa].every((x) => sb.has(x))
}

// Nomor WhatsApp: abaikan spasi/strip; kosong diperbolehkan
function cleanWhatsapp(raw: string): { ok: boolean; value: string | null } {
  const v = raw.replace(/[\s-]/g, '')
  if (!v) return { ok: true, value: null }
  return /^\+?[0-9]{8,15}$/.test(v) ? { ok: true, value: v } : { ok: false, value: null }
}
// </helpers>

function go(code: string): never {
  redirect(`/dashboard/users?msg=${code}`)
}

async function clientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null
}

async function catatAudit(userId: string, aksi: string, entitasId: string | null, detail: Record<string, string>) {
  try {
    await prisma.auditLog.create({
      data: { userId, aksi, entitas: 'User', entitasId, detail, ip: await clientIp() },
    })
  } catch (error) {
    console.error('Gagal mencatat audit log:', error)
  }
}

async function guard() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    if (admin.status === 401) redirect('/login')
    go('bukan-admin')
  }
  return admin
}

// Validasi isian bersama untuk buat & ubah akun
async function readCommon(formData: FormData) {
  const username = text(formData.get('username'), 60)
  const role = text(formData.get('role'), 10)
  const statusAkun = text(formData.get('statusAkun'), 15) || 'ACTIVE'
  const dusunInput = text(formData.get('dusunId'), 10)
  const wa = cleanWhatsapp(text(formData.get('noWhatsapp'), 30))
  const permissions = cleanPermissions(formData.getAll('permissions'))

  if (!isValidUsername(username)) go('username-tidak-valid')
  if (!ROLES.includes(role)) go('peran-tidak-valid')
  if (!STATUSES.includes(statusAkun)) go('status-tidak-valid')
  if (!wa.ok) go('wa-tidak-valid')

  let dusunId: number | null = null
  if (role === 'KADUS') {
    const n = parseInt(dusunInput, 10)
    if (!Number.isInteger(n)) go('dusun-wajib')
    const ada = await prisma.dusun.findUnique({ where: { id: n }, select: { id: true } })
    if (!ada) go('dusun-tidak-ada')
    dusunId = n
  }

  return { username, role, statusAkun, dusunId, noWhatsapp: wa.value, permissions }
}

export async function createUserAction(formData: FormData): Promise<void> {
  const admin = await guard()
  const data = await readCommon(formData)

  const password = String(formData.get('password') ?? '')
  if (password.length < 8 || password.length > 72) go('password-lemah')

  let code = 'dibuat'
  try {
    const created = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: await bcrypt.hash(password, 10),
        role: data.role as Role,
        statusAkun: data.statusAkun,
        dusunId: data.dusunId,
        noWhatsapp: data.noWhatsapp,
        permissions: data.permissions,
      },
      select: { id: true },
    })
    await catatAudit(admin.userId, 'BUAT_USER', created.id, {
      username: data.username,
      role: data.role,
      status: data.statusAkun,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      code = 'username-dipakai'
    } else {
      console.error('Error buat user:', error)
      code = 'gagal'
    }
  }

  revalidatePath('/dashboard/users')
  go(code)
}

export async function updatePermissionsAction(formData: FormData): Promise<void> {
  const admin = await guard()

  const id = text(formData.get('id'), 100)
  if (!id) go('gagal')
  const data = await readCommon(formData)

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, statusAkun: true, dusunId: true, permissions: true },
  })
  if (!target) go('tidak-ditemukan')

  const isSelf = target.id === admin.userId

  // Admin tidak boleh menurunkan peran atau menonaktifkan akunnya sendiri (mencegah terkunci)
  if (isSelf && (data.role !== target.role || (isActiveStatus(target.statusAkun) && !isActiveStatus(data.statusAkun)))) {
    go('ubah-diri-sendiri')
  }

  // Harus selalu tersisa minimal satu admin aktif
  if (target.role === 'ADMIN' && isActiveStatus(target.statusAkun) && (data.role !== 'ADMIN' || !isActiveStatus(data.statusAkun))) {
    const lain = await prisma.user.count({
      where: { role: 'ADMIN', statusAkun: { in: ['ACTIVE', 'AKTIF'] }, id: { not: id } },
    })
    if (lain < 1) go('admin-terakhir')
  }

  let code = 'tersimpan'
  try {
    await prisma.user.update({
      where: { id },
      data: {
        username: data.username,
        role: data.role as Role,
        statusAkun: data.statusAkun,
        dusunId: data.dusunId,
        noWhatsapp: data.noWhatsapp,
        permissions: data.permissions,
      },
    })

    // Perubahan hak akses harus langsung berlaku: cabut semua sesi pengguna itu agar
    // ia login ulang (token lama menyimpan peran/izin lama sampai kedaluwarsa)
    const berubah =
      data.role !== target.role ||
      data.statusAkun !== target.statusAkun ||
      data.dusunId !== target.dusunId ||
      data.username !== target.username ||
      !sameSet(data.permissions, target.permissions)
    if (berubah && !isSelf) {
      await prisma.userSession.deleteMany({ where: { userId: id } })
    }

    await catatAudit(admin.userId, 'UBAH_USER', id, {
      username: data.username,
      peran: `${target.role} -> ${data.role}`,
      status: `${target.statusAkun} -> ${data.statusAkun}`,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      code = 'username-dipakai'
    } else {
      console.error('Error ubah user:', error)
      code = 'gagal'
    }
  }

  revalidatePath('/dashboard/users')
  go(code)
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const admin = await guard()

  const id = text(formData.get('id'), 100)
  if (!id) go('gagal')
  if (id === admin.userId) go('hapus-diri-sendiri')

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, role: true } })
  if (!target) go('dihapus') // sudah terhapus sebelumnya
  if (target.role === 'ADMIN') go('hapus-admin') // akun admin harus diturunkan perannya dulu

  let code = 'dihapus'
  try {
    await prisma.user.deleteMany({ where: { id } })
    await catatAudit(admin.userId, 'HAPUS_USER', id, { username: target.username, role: target.role })
  } catch (error) {
    console.error('Error hapus user:', error)
    code = 'gagal'
  }

  revalidatePath('/dashboard/users')
  go(code)
}
