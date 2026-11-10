import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import fs from 'fs/promises'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { auth } from '@/auth'
import FormBuatSuratClient from './FormBuatSuratClient'

const prisma = new PrismaClient()

async function cariWargaAction(keyword: string) {
  'use server'
  if (!keyword || keyword.trim().length < 2) return []

  const session = await auth()
  const user = session?.user as any
  const isKadus = user?.role === 'KADUS'
  const userDusunId = user?.dusunId

  const dusunFilter = isKadus && userDusunId ? { dusunId: userDusunId } : {}

  const hasil = await prisma.warga.findMany({
    where: {
      ...dusunFilter,
      OR: [
        { nama: { contains: keyword, mode: 'insensitive' } },
        { nik: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: {
      id: true,
      nik: true,
      nama: true,
      dusun: { select: { nama: true } },
    },
  })

  return hasil
}

async function generateSuratAction(formData: FormData) {
  'use server'

  const wargaId = formData.get('wargaId') as string
  const templateId = formData.get('templateId') as string
  const keperluan = formData.get('keperluan') as string
  const rawNomorSurat = formData.get('nomorSurat') as string

  const nomorSurat = rawNomorSurat && rawNomorSurat.trim() !== '' ? rawNomorSurat.trim() : null

  if (!wargaId || !templateId) {
    throw new Error('Warga dan Template Surat wajib dipilih!')
  }

  const session = await auth()
  const user = session?.user as any
  if (user?.role === 'KADUS' && user?.dusunId) {
    const targetWarga = await prisma.warga.findUnique({ where: { id: wargaId }, select: { dusunId: true } })
    if (!targetWarga || targetWarga.dusunId !== user.dusunId) {
      throw new Error('Akses ditolak! Anda hanya dapat membuat surat untuk warga di dusun penugasan Anda.')
    }
  }

  const warga = await prisma.warga.findUnique({
    where: { id: wargaId },
    include: { dusun: true, kk: true },
  })

  const template = await prisma.templateSurat.findUnique({
    where: { id: templateId },
  })

  if (!warga || !template) {
    throw new Error('Data Warga atau Template tidak ditemukan!')
  }

  const templatePath = path.join(process.cwd(), 'public', template.filePath)
  const content = await fs.readFile(templatePath)

  const zip = new PizZip(content)
  const doc = new Docxtemplater()

  doc.setOptions({
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
    delimiters: { start: '[[', end: ']]' },
  })

  try {
    doc.loadZip(zip)
  } catch (err) {
    console.error('Gagal memuat zip file template:', err)
    throw new Error('File template corrupt atau bukan dokumen Word (.docx) yang valid.')
  }

  const tglLahirFormatted = warga.tanggalLahir
    ? new Date(warga.tanggalLahir).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const dusunNamaRaw = warga.dusun?.nama || ''
  const dusunFormatted = dusunNamaRaw.toLowerCase().startsWith('dusun')
    ? dusunNamaRaw
    : (dusunNamaRaw ? `Dusun ${dusunNamaRaw}` : '')

  const alamatRumah = warga.alamat || warga.kk?.alamat || ''
  const alamatLengkap = alamatRumah
    ? (dusunFormatted ? `${alamatRumah}, ${dusunFormatted}` : alamatRumah)
    : (dusunFormatted || '-')

  doc.setData({
    nama: warga.nama || '',
    nik: warga.nik || '',
    no_kk: warga.kk?.noKk || '',
    jenis_kelamin: warga.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
    tempat_lahir: warga.tempatLahir || '',
    tanggal_lahir: tglLahirFormatted,
    agama: warga.agama || '',
    pekerjaan: warga.pekerjaan || '',
    alamat: alamatLengkap,
    dusun: dusunFormatted || warga.dusun?.nama || '',
    keperluan: keperluan || '',
    nomor_surat: nomorSurat || '',
    tanggal_surat: todayFormatted,
  })

  try {
    doc.render()
  } catch (error: any) {
    if (error.properties && error.properties.errors) {
      const detailErrors = error.properties.errors
        .map((e: any) => e.properties?.explanation || e.message)
        .join(' | ')
      console.error('Detail Error Template Word:', detailErrors)
      throw new Error(`Peringatan Template Word: ${detailErrors}`)
    }
    console.error('Error saat render:', error)
  }

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })

  const outputDir = path.join(process.cwd(), 'public', 'generated-surat')
  await fs.mkdir(outputDir, { recursive: true })

  const outputFileName = `SURAT-${template.kode}-${warga.nik}-${Date.now()}.docx`
  const outputRelativePath = `/generated-surat/${outputFileName}`
  const outputFullPath = path.join(outputDir, outputFileName)

  await fs.writeFile(outputFullPath, buf)

  try {
    await prisma.pengajuanSurat.create({
      data: {
        wargaId: warga.id,
        templateId: template.id,
        dusunId: warga.dusunId,
        keperluan: keperluan || 'Pembuatan Surat Keterangan',
        nomorSurat: nomorSurat,
        filePath: outputRelativePath,
        status: 'SELESAI',
      },
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error(`Nomor Surat "${nomorSurat}" sudah pernah digunakan! Silakan gunakan nomor surat lain.`)
    }
    throw error
  }

  revalidatePath('/dashboard/surat/riwayat')
  revalidatePath('/dashboard/surat/buat')
  redirect('/dashboard/surat/riwayat')
}

export default function BuatSuratPage() {
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
      <FormContent />
    </Suspense>
  )
}

async function FormContent() {
  const session = await auth()
  const user = session?.user as any

  const isKadus = user?.role === 'KADUS'

  const daftarTemplate = await prisma.templateSurat.findMany({
    where: { aktif: true },
    orderBy: { nama: 'asc' },
  })

  const riwayatSurat = await prisma.pengajuanSurat.findMany({
    where: { nomorSurat: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { nomorSurat: true },
  })
  
  const existingNomorSurat = riwayatSurat
    .map((s) => s.nomorSurat)
    .filter((n): n is string => n !== null)

  let suggestedNomorSurat = '01/SK/DH/X/2026'
  if (existingNomorSurat.length > 0) {
    const lastNomor = existingNomorSurat[0]
    const parts = lastNomor.split('/')
    const firstPartNum = parseInt(parts[0], 10)
    
    if (!isNaN(firstPartNum)) {
      let nextNum = firstPartNum + 1
      let candidate = ''
      
      while (true) {
        parts[0] = String(nextNum).padStart(parts[0].length, '0')
        candidate = parts.join('/')
        if (!existingNomorSurat.includes(candidate)) {
          suggestedNomorSurat = candidate
          break
        }
        nextNum++
        if (nextNum > firstPartNum + 100) {
          suggestedNomorSurat = candidate
          break
        }
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Buat / Generate Surat Warga</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isKadus
              ? `Pilih warga khusus wilayah penugasan ${user?.dusunNama || 'Dusun Anda'} untuk mencetak dokumen.`
              : 'Pilih warga dan jenis surat untuk mencetak dokumen Word secara otomatis.'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <FormBuatSuratClient
          key={suggestedNomorSurat}
          daftarTemplate={daftarTemplate}
          existingNomorSurat={existingNomorSurat}
          suggestedNomorSurat={suggestedNomorSurat}
          cariWargaAction={cariWargaAction}
          generateAction={generateSuratAction}
        />
      </div>
    </div>
  )
}