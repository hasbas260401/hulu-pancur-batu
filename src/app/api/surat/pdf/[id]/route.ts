import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getLandingContent } from '@/lib/landing-content'

const NO_STORE = { 'Cache-Control': 'no-store' }

const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN = 56
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont }

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-')
}

function formatTanggal(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Ganti karakter yang tidak tersedia di encoding WinAnsi (dipakai font
 * standar PDF) agar pembuatan berkas tidak gagal karena nama/alamat warga
 * mengandung emoji atau simbol khusus.
 */
function sanitizeText(value: unknown) {
  return String(value ?? '').replace(
    /[^\t\n\r\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g,
    '?'
  )
}

/** Bungkus teks agar muat dalam lebar tertentu. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = []
  const paragraphs = sanitizeText(text).split(/\r?\n/)

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
  }

  return lines
}

/**
 * Pembuat PDF sederhana namun rapi. Dipakai untuk mengubah data surat yang
 * tersimpan menjadi berkas PDF yang benar-benar bisa dibuka (bukan tautan
 * kosong). Isi mengikuti data warga, template, nomor surat, dan keperluan.
 */
async function buildSuratPdf(params: {
  surat: {
    nomorSurat: string | null
    keperluan: string
    createdAt: Date
    dataTambahan: unknown
  }
  warga: {
    nama: string
    nik: string
    jenisKelamin: string
    tempatLahir: string | null
    tanggalLahir: Date | null
    agama: string | null
    pekerjaan: string | null
    alamat: string | null
    dusunNama: string | null
    noKk: string | null
  }
  templateNama: string
  setting: {
    namaDesa: string
    namaKades: string
    periodeKades: string
    alamat: string
  }
}) {
  const { surat, warga, templateNama, setting } = params

  const pdf = await PDFDocument.create()
  pdf.setTitle(`${templateNama} - ${warga.nama}`)
  pdf.setAuthor(setting.namaDesa)
  pdf.setCreator('SIDU Desa')

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
  }

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursorY = PAGE_HEIGHT - MARGIN

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < MARGIN + 40) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      cursorY = PAGE_HEIGHT - MARGIN
    }
  }

  const drawText = (
    text: string,
    options: {
      font?: PDFFont
      size?: number
      x?: number
      align?: 'left' | 'center' | 'right'
      color?: [number, number, number]
      lineGap?: number
      maxWidth?: number
    } = {}
  ) => {
    const font = options.font ?? fonts.regular
    const size = options.size ?? 11
    const maxWidth = options.maxWidth ?? CONTENT_WIDTH
    const lineGap = options.lineGap ?? 4
    const color = options.color ?? [0.1, 0.1, 0.1]
    const lines = wrapText(text, font, size, maxWidth)

    for (const line of lines) {
      ensureSpace(size + lineGap)
      const lineWidth = font.widthOfTextAtSize(line, size)
      let x = MARGIN
      if (options.align === 'center') x = (PAGE_WIDTH - lineWidth) / 2
      if (options.align === 'right') x = PAGE_WIDTH - MARGIN - lineWidth
      if (options.x !== undefined) x = options.x
      page.drawText(line, {
        x,
        y: cursorY - size,
        size,
        font,
        color: rgb(color[0], color[1], color[2]),
      })
      cursorY -= size + lineGap
    }
  }

  const moveDown = (amount: number) => {
    cursorY -= amount
  }

  /* ------------------------------- KOP SURAT ------------------------------ */
  drawText('PEMERINTAH KABUPATEN DELI SERDANG', {
    font: fonts.bold,
    size: 13,
    align: 'center',
    lineGap: 2,
  })
  drawText('KECAMATAN PANCUR BATU', {
    font: fonts.bold,
    size: 12,
    align: 'center',
    lineGap: 2,
  })
  drawText(setting.namaDesa.toUpperCase(), {
    font: fonts.bold,
    size: 16,
    align: 'center',
    lineGap: 2,
  })
  drawText(setting.alamat, {
    size: 9,
    align: 'center',
    color: [0.35, 0.35, 0.35],
    lineGap: 2,
  })

  moveDown(6)
  page.drawLine({
    start: { x: MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: cursorY },
    thickness: 1.5,
    color: rgb(0.1, 0.1, 0.1),
  })
  moveDown(2)
  page.drawLine({
    start: { x: MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: cursorY },
    thickness: 0.6,
    color: rgb(0.1, 0.1, 0.1),
  })
  moveDown(22)

  /* --------------------------------- JUDUL -------------------------------- */
  drawText(templateNama.toUpperCase(), {
    font: fonts.bold,
    size: 14,
    align: 'center',
    lineGap: 4,
  })
  if (surat.nomorSurat) {
    drawText(`Nomor: ${surat.nomorSurat}`, {
      size: 11,
      align: 'center',
      lineGap: 4,
    })
  }
  moveDown(14)

  /* --------------------------------- ISI ---------------------------------- */
  drawText(
    `Yang bertanda tangan di bawah ini Kepala ${setting.namaDesa}, dengan ini menerangkan bahwa:`,
    { size: 11, lineGap: 6 }
  )
  moveDown(6)

  const jenisKelamin =
    warga.jenisKelamin === 'LAKI_LAKI'
      ? 'Laki-laki'
      : warga.jenisKelamin === 'PEREMPUAN'
        ? 'Perempuan'
        : warga.jenisKelamin || '-'

  const tanggalLahir = warga.tanggalLahir
    ? formatTanggal(new Date(warga.tanggalLahir))
    : '-'

  const dusun = warga.dusunNama
    ? warga.dusunNama.toLowerCase().startsWith('dusun')
      ? warga.dusunNama
      : `Dusun ${warga.dusunNama}`
    : '-'

  const alamat = [warga.alamat, dusun].filter(Boolean).join(', ') || '-'

  const rows: Array<[string, string]> = [
    ['Nama', warga.nama || '-'],
    ['NIK', warga.nik || '-'],
    ['No. Kartu Keluarga', warga.noKk || '-'],
    ['Jenis Kelamin', jenisKelamin],
    ['Tempat / Tanggal Lahir', `${warga.tempatLahir || '-'} / ${tanggalLahir}`],
    ['Agama', warga.agama || '-'],
    ['Pekerjaan', warga.pekerjaan || '-'],
    ['Alamat', alamat],
  ]

  const labelWidth = 140
  const valueWidth = CONTENT_WIDTH - labelWidth - 10

  for (const [label, value] of rows) {
    const valueLines = wrapText(value, fonts.regular, 11, valueWidth)
    const rowHeight = Math.max(1, valueLines.length) * 15

    ensureSpace(rowHeight + 4)

    page.drawText(label, {
      x: MARGIN + 8,
      y: cursorY - 11,
      size: 11,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.2),
    })
    page.drawText(':', {
      x: MARGIN + labelWidth,
      y: cursorY - 11,
      size: 11,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.2),
    })

    let lineY = cursorY
    for (const line of valueLines) {
      page.drawText(line, {
        x: MARGIN + labelWidth + 12,
        y: lineY - 11,
        size: 11,
        font: fonts.bold,
        color: rgb(0.1, 0.1, 0.1),
      })
      lineY -= 15
    }

    cursorY -= rowHeight + 2
  }

  moveDown(10)

  drawText(
    `Adalah benar warga ${setting.namaDesa} yang berdomisili di ${dusun}. Surat keterangan ini dibuat untuk keperluan:`,
    { size: 11, lineGap: 6 }
  )
  moveDown(4)
  drawText(surat.keperluan || '-', {
    font: fonts.bold,
    size: 11,
    lineGap: 6,
  })

  // Data tambahan (jika ada) ditampilkan sebagai rincian tambahan.
  const dataTambahan =
    surat.dataTambahan && typeof surat.dataTambahan === 'object' && !Array.isArray(surat.dataTambahan)
      ? Object.entries(surat.dataTambahan as Record<string, unknown>)
      : []
  if (dataTambahan.length > 0) {
    moveDown(4)
    for (const [key, value] of dataTambahan) {
      if (value === null || value === undefined || value === '') continue
      drawText(`• ${key}: ${String(value)}`, { size: 10, lineGap: 5 })
    }
  }

  moveDown(10)
  drawText(
    'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
    { size: 11, lineGap: 6 }
  )

  /* ------------------------------ TANDA TANGAN ---------------------------- */
  moveDown(24)
  ensureSpace(90)
  drawText(`${setting.namaDesa}, ${formatTanggal(new Date(surat.createdAt))}`, {
    align: 'right',
    size: 11,
    lineGap: 4,
  })
  drawText('Kepala Desa,', { align: 'right', size: 11, lineGap: 4 })
  moveDown(52)
  drawText(setting.namaKades, {
    align: 'right',
    font: fonts.bold,
    size: 11,
    lineGap: 2,
  })
  if (setting.periodeKades) {
    drawText(setting.periodeKades, {
      align: 'right',
      font: fonts.italic,
      size: 9,
      color: [0.35, 0.35, 0.35],
      lineGap: 2,
    })
  }

  /* -------------------------------- FOOTER -------------------------------- */
  const footerY = MARGIN - 18
  page.drawLine({
    start: { x: MARGIN, y: footerY + 10 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY + 10 },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  })
  page.drawText(
    `Dokumen ini dicetak dari Sistem Informasi Desa (SIDU) ${setting.namaDesa}.`,
    {
      x: MARGIN,
      y: footerY,
      size: 8,
      font: fonts.italic,
      color: rgb(0.5, 0.5, 0.5),
    }
  )

  return pdf.save()
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' },
      { status: 401, headers: NO_STORE }
    )
  }

  const { id } = await params

  const surat = await prisma.pengajuanSurat.findUnique({
    where: { id },
    include: {
      warga: { include: { kk: true } },
      template: true,
      dusun: true,
    },
  })

  if (!surat) {
    return NextResponse.json(
      { error: 'Data surat tidak ditemukan.' },
      { status: 404, headers: NO_STORE }
    )
  }

  const settings = await prisma.webSettings.findFirst().catch(() => null)
  const landing = getLandingContent(settings)

  const namaDesa = settings?.namaDesa || 'Desa Hulu Pancur Batu'

  try {
    const pdfBytes = await buildSuratPdf({
      surat: {
        nomorSurat: surat.nomorSurat,
        keperluan: surat.keperluan,
        createdAt: surat.createdAt,
        dataTambahan: surat.dataTambahan,
      },
      warga: {
        nama: surat.warga.nama,
        nik: surat.warga.nik,
        jenisKelamin: String(surat.warga.jenisKelamin),
        tempatLahir: surat.warga.tempatLahir,
        tanggalLahir: surat.warga.tanggalLahir,
        agama: surat.warga.agama,
        pekerjaan: surat.warga.pekerjaan,
        alamat: surat.warga.kk?.alamat || null,
        dusunNama: surat.dusun?.nama || null,
        noKk: surat.warga.kk?.noKk || null,
      },
      templateNama: surat.template?.nama || 'Surat Keterangan Desa',
      setting: {
        namaDesa,
        namaKades: settings?.namaKades || 'Kepala Desa',
        periodeKades: settings?.periodeKades || '',
        alamat: landing.address || 'Kec. Pancur Batu, Kab. Deli Serdang, Sumatera Utara',
      },
    })

    // Simpan salinan agar tombol unduh berikutnya tetap cepat dan konsisten.
    if (surat.filePath) {
      const pdfRelative = surat.filePath.replace(/\.docx$/i, '.pdf')
      if (pdfRelative !== surat.filePath) {
        try {
          const outputPath = path.join(process.cwd(), 'public', pdfRelative)
          await fs.mkdir(path.dirname(outputPath), { recursive: true })
          await fs.writeFile(outputPath, pdfBytes)
        } catch (error) {
          console.error('Gagal menyimpan salinan PDF surat:', error)
        }
      }
    }

    const fileName = sanitizeFileName(
      `SURAT-${surat.nomorSurat || surat.id}-${surat.warga.nik}.pdf`
    )

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBytes.byteLength),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Gagal membuat PDF surat:', error)
    return NextResponse.json(
      { error: 'Gagal membuat berkas PDF. Silakan coba lagi.' },
      { status: 500, headers: NO_STORE }
    )
  }
}
