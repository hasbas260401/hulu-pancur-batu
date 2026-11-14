import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import fs from 'fs/promises'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { getScope } from '@/lib/warga-scope'
import FormBuatSuratClient from './FormBuatSuratClient'

type PengajuanPrefill = {
  id: string
  wargaId: string
  nama: string
  nik: string
  dusunNama: string | null
  keperluan: string
  templateId: string | null
  nomorSurat: string | null
  status: string
}

async function cariWargaAction(keyword: string) {
  'use server'
  // Hanya ADMIN, atau KADUS yang punya izin menu surat. Dicek ke database,
  // sehingga pemanggil anonim tidak bisa menelusuri data warga lewat action ini.
  const scope = await getScope('surat', 'pembuatan surat')
  if (!scope.ok) throw new Error(scope.message)

  const kataKunci = String(keyword ?? '').trim()
  if (kataKunci.length < 2) return []

  const hasil = await prisma.warga.findMany({
    where: {
      ...scope.dusunFilter,
      OR: [
        { nama: { contains: kataKunci, mode: 'insensitive' } },
        { nik: { contains: kataKunci, mode: 'insensitive' } },
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

  // Wajib login dan berwenang membuat surat (ADMIN, atau KADUS berizin 'surat').
  const scope = await getScope('surat', 'pembuatan surat')
  if (!scope.ok) throw new Error(scope.message)

  const wargaIdInput = String(formData.get('wargaId') ?? '').trim()
  const pengajuanId = String(formData.get('pengajuanId') ?? '').trim()
  const templateId = String(formData.get('templateId') ?? '').trim()
  const keperluanInput = String(formData.get('keperluan') ?? '').trim().slice(0, 500)
  const rawNomorSurat = String(formData.get('nomorSurat') ?? '').trim()

  // Saat admin memproses permohonan warga, data warga & keperluan diambil dari
  // pengajuan di database agar tidak bisa dimanipulasi lewat form.
  let pengajuan: {
    id: string
    wargaId: string
    dusunId: number
    status: string
    keperluan: string
    nomorSurat: string | null
  } | null = null

  if (pengajuanId) {
    pengajuan = await prisma.pengajuanSurat.findUnique({
      where: { id: pengajuanId },
      select: {
        id: true,
        wargaId: true,
        dusunId: true,
        status: true,
        keperluan: true,
        nomorSurat: true,
      },
    })
    if (!pengajuan) {
      throw new Error('Pengajuan surat tidak ditemukan!')
    }
    if (pengajuan.status === 'SELESAI') {
      throw new Error('Pengajuan ini sudah selesai dan tidak dapat diproses ulang.')
    }
    if (pengajuan.status === 'DITOLAK') {
      throw new Error('Pengajuan yang ditolak harus dibuka kembali sebelum dibuatkan surat.')
    }
    if (scope.role === 'KADUS' && pengajuan.dusunId !== scope.dusunFilter.dusunId) {
      throw new Error('Akses ditolak! Anda hanya dapat memproses permohonan di dusun penugasan Anda.')
    }
  }

  const wargaId = pengajuan?.wargaId ?? wargaIdInput
  const keperluan = keperluanInput || pengajuan?.keperluan || ''
  const nomorSurat =
    rawNomorSurat !== ''
      ? rawNomorSurat.slice(0, 100)
      : pengajuan?.nomorSurat ?? null

  if (!wargaId || !templateId) {
    throw new Error('Warga dan Template Surat wajib dipilih!')
  }

  // Cek kepemilikan dusun SEBELUM membuat berkas apa pun.
  const targetWarga = await prisma.warga.findUnique({
    where: { id: wargaId },
    select: { dusunId: true },
  })
  if (!targetWarga) {
    throw new Error('Data warga tidak ditemukan!')
  }
  if (scope.role === 'KADUS' && targetWarga.dusunId !== scope.dusunFilter.dusunId) {
    throw new Error('Akses ditolak! Anda hanya dapat membuat surat untuk warga di dusun penugasan Anda.')
  }

  // Cegah nomor surat bentrok SEBELUM dokumen dibuat, agar tidak ada berkas
  // yatim saat proses penyimpanan gagal.
  if (nomorSurat) {
    const bentrok = await prisma.pengajuanSurat.findFirst({
      where: {
        nomorSurat,
        ...(pengajuan ? { NOT: { id: pengajuan.id } } : {}),
      },
      select: { id: true },
    })
    if (bentrok) {
      throw new Error(
        `Nomor Surat "${nomorSurat}" sudah pernah digunakan! Silakan gunakan nomor surat lain.`
      )
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

  const publicDir = path.join(process.cwd(), 'public')
  const templatePath = path.join(publicDir, template.filePath)
  const relativeTemplate = path.relative(publicDir, templatePath)
  if (!relativeTemplate || relativeTemplate.startsWith('..') || path.isAbsolute(relativeTemplate)) {
    throw new Error('Lokasi file template tidak valid.')
  }
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

  const alamatRumah = warga.kk?.alamat || ''
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
    if (pengajuan) {
      // Perbarui baris pengajuan yang sama agar riwayat warga dan arsip admin
      // tetap sinkron (tidak membuat duplikat). Status naik ke Proses dan
      // menunggu admin menandai Selesai.
      await prisma.pengajuanSurat.update({
        where: { id: pengajuan.id },
        data: {
          templateId: template.id,
          keperluan: keperluan || 'Pembuatan Surat Keterangan',
          nomorSurat,
          filePath: outputRelativePath,
          status: 'DIVERIFIKASI',
          catatan: null,
          diprosesOlehId: scope.userId,
          diprosesAt: new Date(),
        },
      })
    } else {
      await prisma.pengajuanSurat.create({
        data: {
          wargaId: warga.id,
          templateId: template.id,
          dusunId: warga.dusunId,
          keperluan: keperluan || 'Pembuatan Surat Keterangan',
          nomorSurat: nomorSurat,
          filePath: outputRelativePath,
          status: 'SELESAI',
          diprosesOlehId: scope.userId,
          diprosesAt: new Date(),
        },
      })
    }
  } catch (error: any) {
    // Jangan tinggalkan berkas dokumen tanpa baris database.
    try {
      await fs.unlink(outputFullPath)
    } catch {
      // Berkas mungkin belum sempat dibuat.
    }
    if (error.code === 'P2002') {
      throw new Error(`Nomor Surat "${nomorSurat}" sudah pernah digunakan! Silakan gunakan nomor surat lain.`)
    }
    throw error
  }

  revalidatePath('/dashboard/surat/riwayat')
  revalidatePath('/dashboard/surat/buat')
  redirect('/dashboard/surat/riwayat')
}

export default function BuatSuratPage({
  searchParams,
}: {
  searchParams: Promise<{ pengajuanId?: string }>
}) {
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
      <FormContent searchParams={searchParams} />
    </Suspense>
  )
}

async function FormContent({
  searchParams,
}: {
  searchParams: Promise<{ pengajuanId?: string }>
}) {
  const scope = await getScope('surat', 'pembuatan surat')
  if (!scope.ok) {
    redirect(scope.status === 401 ? '/login' : '/dashboard')
  }

  const isKadus = scope.role === 'KADUS'
  const resolvedParams = await searchParams
  const pengajuanId = String(resolvedParams.pengajuanId ?? '').trim()

  let pengajuan: PengajuanPrefill | null = null

  if (pengajuanId) {
    const ditemukan = await prisma.pengajuanSurat.findUnique({
      where: { id: pengajuanId },
      select: {
        id: true,
        wargaId: true,
        dusunId: true,
        status: true,
        keperluan: true,
        templateId: true,
        nomorSurat: true,
        warga: {
          select: {
            nama: true,
            nik: true,
            dusun: { select: { nama: true } },
          },
        },
      },
    })

    if (!ditemukan) redirect('/dashboard/surat/riwayat')
    if (isKadus && ditemukan.dusunId !== scope.dusunFilter.dusunId) {
      redirect('/dashboard/surat/riwayat')
    }
    if (ditemukan.status === 'SELESAI' || ditemukan.status === 'DITOLAK') {
      redirect('/dashboard/surat/riwayat')
    }

    pengajuan = {
      id: ditemukan.id,
      wargaId: ditemukan.wargaId,
      nama: ditemukan.warga.nama,
      nik: ditemukan.warga.nik,
      dusunNama: ditemukan.warga.dusun?.nama ?? null,
      keperluan: ditemukan.keperluan,
      templateId: ditemukan.templateId,
      nomorSurat: ditemukan.nomorSurat,
      status: ditemukan.status,
    }
  }

  const daftarTemplate = await prisma.templateSurat.findMany({
    where: { aktif: true },
    orderBy: { nama: 'asc' },
  })

  const riwayatSurat = await prisma.pengajuanSurat.findMany({
    where: {
      nomorSurat: { not: null },
      ...(pengajuan ? { NOT: { id: pengajuan.id } } : {}),
    },
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
            {pengajuan ? 'Proses & Buat Surat Warga' : 'Buat / Generate Surat Warga'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {pengajuan
              ? `Lengkapi nomor surat resmi untuk permohonan ${pengajuan.nama}, lalu generate dokumen.`
              : isKadus
                ? `Pilih warga khusus wilayah penugasan ${scope.dusunNama || 'Dusun Anda'} untuk mencetak dokumen.`
                : 'Pilih warga dan jenis surat untuk mencetak dokumen Word secara otomatis.'}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <FormBuatSuratClient
          key={pengajuan?.id ?? suggestedNomorSurat}
          daftarTemplate={daftarTemplate}
          existingNomorSurat={existingNomorSurat}
          suggestedNomorSurat={suggestedNomorSurat}
          pengajuan={pengajuan}
          cariWargaAction={cariWargaAction}
          generateAction={generateSuratAction}
        />
      </div>
    </div>
  )
}