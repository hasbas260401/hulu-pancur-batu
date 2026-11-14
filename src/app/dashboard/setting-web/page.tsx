import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { connection } from 'next/server'
import { Suspense } from 'react'
import FormSettingWebClient from './FormSettingWebClient'
import { getLandingContent } from '@/lib/landing-content'
import { applyCommunityStats, getCommunityStats } from '@/lib/community-stats'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'
import { redirect } from 'next/navigation'
import fs from 'fs/promises'
import path from 'path'

const MAX_GAMBAR = 2 * 1024 * 1024 // 2 MB
const MAKS_KONTEN = 500_000 // batas ukuran JSON konten landing

/** Hanya izinkan gambar sungguhan (dicek dari isi berkas, bukan hanya namanya). */
function deteksiGambar(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return '.png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return '.jpg'
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp'
  }
  return null
}

// Server Action untuk memproses penyimpanan data
async function updateWebSettingsAction(formData: FormData) {
  'use server'

  // Wajib ADMIN (dicek ke database). Server Action bisa dipanggil langsung
  // tanpa membuka halaman, jadi guard di layout saja tidak cukup.
  const admin = await requireAdmin()
  if (!admin.ok) throw new Error(admin.message)

  const teks = (name: string, max: number) =>
    String(formData.get(name) ?? '').trim().slice(0, max)

  const namaDesa = teks('namaDesa', 100)
  const sloganDesa = teks('sloganDesa', 150)
  const namaKades = teks('namaKades', 100)
  const periodeKades = teks('periodeKades', 50)
  const visiDesa = teks('visiDesa', 1000)
  const misiDesa = teks('misiDesa', 3000)
  const youtubeUrl = teks('youtubeUrl', 300)
  const landingContentRaw = formData.get('landingContent')

  if (!namaDesa || !sloganDesa || !namaKades || !periodeKades || !visiDesa || !youtubeUrl) {
    throw new Error('Kolom identitas desa wajib diisi.')
  }
  if (!/^https?:\/\//i.test(youtubeUrl)) {
    throw new Error('Tautan video harus diawali http:// atau https://.')
  }

  let landingContent: Prisma.InputJsonValue | undefined
  if (typeof landingContentRaw === 'string' && landingContentRaw) {
    if (landingContentRaw.length > MAKS_KONTEN) {
      throw new Error('Konten halaman depan terlalu besar.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(landingContentRaw)
    } catch {
      throw new Error('Format konten halaman depan tidak valid. Silakan muat ulang halaman lalu coba lagi.')
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Format konten halaman depan tidak valid.')
    }

    landingContent = parsed as Prisma.InputJsonValue
  }

  const fotoFile = formData.get('fotoKades')
  const logoFile = formData.get('logoDesa')

  let fotoKadesUrl: string | undefined
  let logoDesaUrl: string | undefined

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadDir, { recursive: true })

  // Validasi & Upload Foto Kades (maks 2 MB, harus gambar asli)
  if (fotoFile instanceof File && fotoFile.size > 0) {
    if (fotoFile.size > MAX_GAMBAR) {
      throw new Error('Ukuran foto kepala desa maksimal 2 MB!')
    }
    const bytes = Buffer.from(await fotoFile.arrayBuffer())
    const ext = deteksiGambar(bytes)
    if (!ext) throw new Error('Foto kepala desa harus berupa gambar PNG, JPG, atau WEBP.')
    const fileName = `kades-${Date.now()}${ext}`
    await fs.writeFile(path.join(uploadDir, fileName), bytes)
    fotoKadesUrl = `/uploads/${fileName}`
  }

  // Validasi & Upload Logo Desa (maks 2 MB, harus gambar asli)
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_GAMBAR) {
      throw new Error('Ukuran logo desa maksimal 2 MB!')
    }
    const bytes = Buffer.from(await logoFile.arrayBuffer())
    const ext = deteksiGambar(bytes)
    if (!ext) throw new Error('Logo desa harus berupa gambar PNG, JPG, atau WEBP.')
    const fileName = `logo-${Date.now()}${ext}`
    await fs.writeFile(path.join(uploadDir, fileName), bytes)
    logoDesaUrl = `/uploads/${fileName}`
  }

  const setting = await prisma.webSettings.findFirst()

  const dataPayload = {
    namaDesa,
    sloganDesa,
    namaKades,
    periodeKades,
    visiDesa,
    misiDesa,
    youtubeUrl,
    ...(landingContent !== undefined ? { landingContent } : {}),
    ...(fotoKadesUrl ? { fotoKades: fotoKadesUrl } : {}),
    ...(logoDesaUrl ? { logoDesa: logoDesaUrl } : {}),
  }

  if (setting) {
    await prisma.webSettings.update({ where: { id: setting.id }, data: dataPayload })
  } else {
    await prisma.webSettings.create({ data: dataPayload })
  }

  revalidatePath('/')
  revalidatePath('/dashboard/setting-web')
}

export default function KelolaKontenWebPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat data...</span>
          </div>
        </div>
      }
    >
      <KelolaKontenContent />
    </Suspense>
  )
}

async function KelolaKontenContent() {
  await connection()

  const admin = await requireAdmin()
  if (!admin.ok) redirect('/dashboard')

  // Identitas desa dan statistik kependudukan diambil paralel agar halaman
  // tidak menunggu satu query selesai sebelum query berikutnya dimulai.
  const [setting, stats] = await Promise.all([
    prisma.webSettings.findFirst(),
    getCommunityStats(),
  ])

  const baseContent = getLandingContent(setting)

  const defaultSetting = {
    namaDesa: 'Desa Hulu Pancur Batu',
    sloganDesa: 'Sistem Informasi Desa',
    logoDesa: null,
    namaKades: 'Kepala Desa Hulu Pancur Batu',
    periodeKades: 'Periode 2023 - 2029',
    fotoKades: null,
    visiDesa: 'Terwujudnya Desa Hulu Pancur Batu yang Mandiri, Religius, Sejahtera, Transparan, dan Berbasis Teknologi Informasi dalam Pelayanan Publik.',
    misiDesa: 'Meningkatkan kualitas pelayanan administrasi kependudukan yang cepat, transparan, dan bebas pungutan liar.\nMengoptimalkan penyaluran bantuan sosial agar tepat sasaran kepada warga yang berhak secara adil.\nMemajukan infrastruktur desa serta menggerakkan ekonomi kerakyatan berbasis potensi lokal.',
    youtubeUrl: 'https://www.youtube.com/embed/VUZlZm5V9R8',
    ...(setting ?? {}),
    landingContent: stats ? applyCommunityStats(baseContent, stats) : baseContent,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Kelola Konten Halaman Depan</h1>
        <p className="text-sm text-slate-500">Ubah identitas, logo, foto kepala desa, dan daftar misi secara dinamis.</p>
      </div>

      <FormSettingWebClient
        initialData={defaultSetting}
        stats={stats}
        updateAction={updateWebSettingsAction}
      />
    </div>
  )
}