import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { connection } from 'next/server'
import { Suspense } from 'react'
import FormSettingWebClient from './FormSettingWebClient'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

// Server Action untuk memproses penyimpanan data
async function updateWebSettingsAction(formData: FormData) {
  'use server'

  const namaDesa = formData.get('namaDesa') as string
  const sloganDesa = formData.get('sloganDesa') as string
  const heroTitle = formData.get('heroTitle') as string
  const heroDescription = formData.get('heroDescription') as string
  const namaKades = formData.get('namaKades') as string
  const periodeKades = formData.get('periodeKades') as string
  const visiDesa = formData.get('visiDesa') as string
  const misiDesa = formData.get('misiDesa') as string
  const youtubeUrl = formData.get('youtubeUrl') as string
  
  const fotoFile = formData.get('fotoKades') as File
  const logoFile = formData.get('logoDesa') as File

  let fotoKadesUrl = undefined
  let logoDesaUrl = undefined

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadDir, { recursive: true })

  // Validasi & Upload Foto Kades (Maks 2 MB)
  if (fotoFile && fotoFile.size > 0) {
    if (fotoFile.size > 2 * 1024 * 1024) {
      throw new Error('Ukuran foto kepala desa maksimal 2 MB!')
    }
    const ext = path.extname(fotoFile.name) || '.jpg'
    const fileName = `kades-${Date.now()}${ext}`
    await fs.writeFile(path.join(uploadDir, fileName), Buffer.from(await fotoFile.arrayBuffer()))
    fotoKadesUrl = `/uploads/${fileName}`
  }

  // Validasi & Upload Logo Desa (Maks 2 MB)
  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      throw new Error('Ukuran logo desa maksimal 2 MB!')
    }
    const ext = path.extname(logoFile.name) || '.png'
    const fileName = `logo-${Date.now()}${ext}`
    await fs.writeFile(path.join(uploadDir, fileName), Buffer.from(await logoFile.arrayBuffer()))
    logoDesaUrl = `/uploads/${fileName}`
  }

  let setting = await prisma.webSettings.findFirst()

  const dataPayload = {
    namaDesa,
    sloganDesa,
    heroTitle,
    heroDescription,
    namaKades,
    periodeKades,
    visiDesa,
    misiDesa,
    youtubeUrl,
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
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
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

  let setting = await prisma.webSettings.findFirst()

  const defaultSetting = setting || {
    namaDesa: 'Desa Hulu Pancur Batu',
    sloganDesa: 'Sistem Informasi Desa',
    logoDesa: null,
    heroTitle: 'Transparan, Akuntabel, & Melayani Sepenuh Hati.',
    heroDescription: 'Website resmi administrasi kependudukan dan transparansi penyaluran bantuan sosial Desa Hulu Pancur Batu untuk mewujudkan tata kelola pemerintahan desa yang modern.',
    namaKades: 'Kepala Desa Hulu Pancur Batu',
    periodeKades: 'Periode 2023 - 2029',
    fotoKades: null,
    visiDesa: 'Terwujudnya Desa Hulu Pancur Batu yang Mandiri, Religius, Sejahtera, Transparan, dan Berbasis Teknologi Informasi dalam Pelayanan Publik.',
    misiDesa: 'Meningkatkan kualitas pelayanan administrasi kependudukan yang cepat, transparan, dan bebas pungutan liar.\nMengoptimalkan penyaluran bantuan sosial agar tepat sasaran kepada warga yang berhak secara adil.\nMemajukan infrastruktur desa serta menggerakkan ekonomi kerakyatan berbasis potensi lokal.',
    youtubeUrl: 'https://www.youtube.com/embed/VUZlZm5V9R8',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Kelola Konten Halaman Depan</h1>
        <p className="text-sm text-slate-500">Ubah identitas, logo, foto kepala desa, dan daftar misi secara dinamis.</p>
      </div>

      <FormSettingWebClient initialData={defaultSetting} updateAction={updateWebSettingsAction} />
    </div>
  )
}