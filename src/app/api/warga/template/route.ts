import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

/**
 * Generator template Excel data kependudukan.
 *
 * Struktur file:
 *  - Sheet 1 "Template Warga Desa" : data yang diimpor (baris 1 = nama kolom).
 *  - Sheet 2 "Panduan Pengisian"   : catatan cara pengisian lengkap.
 *
 * Sheet panduan sengaja diletakkan di urutan kedua karena proses impor
 * membaca sheet pertama sebagai sumber data.
 */

const HEADERS = [
  'No KK',
  'NIK',
  'Nama Lengkap',
  'Hubungan Keluarga',
  'Jenis Kelamin',
  'ID Dusun',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Agama',
  'Jenis Pekerjaan',
  'Status Perkawinan',
  'Status Warga',
]

const EXAMPLE_ROW = [
  '1207052604010000',
  '1207052604010001',
  'Contoh Kepala Keluarga',
  'Kepala Keluarga',
  'LAKI_LAKI',
  1,
  'Medan',
  '1990-08-17',
  'Islam',
  'Wiraswasta',
  'Kawin',
  'AKTIF',
]

const COLUMN_GUIDE: (string | number)[][] = [
  ['No', 'Nama Kolom', 'Wajib', 'Format / Pilihan yang Valid', 'Contoh'],
  ['1', 'No KK', 'Ya', 'Angka 16 digit, tanpa spasi/titik/tanda hubung', '1207052604010000'],
  ['2', 'NIK', 'Ya', 'Angka 16 digit, unik untuk setiap warga', '1207052604010001'],
  ['3', 'Nama Lengkap', 'Ya', 'Teks nama sesuai KTP', 'Contoh Kepala Keluarga'],
  [
    '4',
    'Hubungan Keluarga',
    'Ya',
    'Kepala Keluarga, Istri, Anak, Orang Tua, Famili Lain',
    'Kepala Keluarga',
  ],
  ['5', 'Jenis Kelamin', 'Ya', 'LAKI_LAKI atau PEREMPUAN', 'LAKI_LAKI'],
  [
    '6',
    'ID Dusun',
    'Ya',
    'Angka ID dusun yang terdaftar di database (contoh: 1 sampai 5)',
    1,
  ],
  ['7', 'Tempat Lahir', 'Ya', 'Teks nama kota/kabupaten', 'Medan'],
  [
    '8',
    'Tanggal Lahir',
    'Ya',
    'Format YYYY-MM-DD (tahun-bulan-tanggal). Contoh: 1990-08-17',
    '1990-08-17',
  ],
  [
    '9',
    'Agama',
    'Ya',
    'Islam, Kristen, Katolik, Hindu, Buddha, Konghucu',
    'Islam',
  ],
  ['10', 'Jenis Pekerjaan', 'Tidak', 'Teks pekerjaan utama', 'Wiraswasta'],
  [
    '11',
    'Status Perkawinan',
    'Ya',
    'Belum Kawin, Kawin, Cerai Hidup, Cerai Mati',
    'Kawin',
  ],
  ['12', 'Status Warga', 'Ya', 'AKTIF, MENINGGAL, atau PINDAH', 'AKTIF'],
]

const GUIDE_ROWS: (string | number)[][] = [
  ['Note: Cara Pengisian Lengkap'],
  [],
  [
    'Sheet "Template Warga Desa" adalah data yang diunggah. Sheet ini hanya panduan dan tidak ikut diimpor.',
  ],
  [],
  ['Langkah pengisian:'],
  ['1. Isi data mulai baris ke-2 pada sheet "Template Warga Desa".'],
  ['2. Jangan mengubah, menambah, atau menghapus nama kolom di baris pertama.'],
  ['3. Satu baris = satu anggota keluarga. No. KK yang sama otomatis digabung.'],
  ['4. No. KK dan NIK ditulis 16 digit tanpa spasi, titik, atau tanda hubung.'],
  ['5. Tanggal Lahir wajib format YYYY-MM-DD, contoh 1990-08-17.'],
  ['6. Baris dengan NIK/Nama/No. KK kosong akan dilewati saat impor.'],
  ['7. NIK yang sudah terdaftar tidak diduplikasi (baris dilewati).'],
  ['8. Maksimal 5.000 baris dan ukuran file 5 MB per unggahan.'],
  ['9. Unggah file melalui menu Data Kependudukan > Impor Data Excel.'],
  [],
  ['Panduan per kolom:'],
  ...COLUMN_GUIDE,
  [],
  ['Pilihan nilai yang valid:'],
  ['', 'Jenis Kelamin', '', 'LAKI_LAKI atau PEREMPUAN', 'LAKI_LAKI'],
  ['', 'Status Warga', '', 'AKTIF, MENINGGAL, atau PINDAH', 'AKTIF'],
  [
    '',
    'Hubungan Keluarga',
    '',
    'Kepala Keluarga, Istri, Anak, Orang Tua, Famili Lain',
    'Kepala Keluarga',
  ],
  [
    '',
    'Status Perkawinan',
    '',
    'Belum Kawin, Kawin, Cerai Hidup, Cerai Mati',
    'Kawin',
  ],
  [
    '',
    'Agama',
    '',
    'Islam, Kristen, Katolik, Hindu, Buddha, Konghucu',
    'Islam',
  ],
  [],
  [
    'Catatan: penulisan nilai tidak membedakan huruf besar/kecil, tetapi gunakan huruf kapital agar seragam.',
  ],
]

/**
 * Hitung lebar kolom otomatis berdasarkan isi terpanjang, dengan batas
 * minimum dan maksimum agar tidak ada teks yang terpotong dan sheet tetap
 * nyaman dibaca.
 */
function autoFitColumns(
  sheet: XLSX.WorkSheet,
  rows: (string | number | null | undefined)[][],
  options: { min?: number; max?: number } = {}
) {
  const min = options.min ?? 10
  const max = options.max ?? 48
  const columnCount = rows.reduce(
    (longest, row) => Math.max(longest, row.length),
    0
  )

  const columns: XLSX.ColInfo[] = []
  for (let column = 0; column < columnCount; column++) {
    let longest = 0
    for (const row of rows) {
      const value = row[column]
      if (value === null || value === undefined) continue
      const text = String(value)
      const lineLength = text
        .split('\n')
        .reduce((lineMax, line) => Math.max(lineMax, line.length), 0)
      longest = Math.max(longest, lineLength)
    }
    columns.push({ wch: Math.min(max, Math.max(min, longest + 2)) })
  }

  sheet['!cols'] = columns
}

export async function GET() {
  const workbook = XLSX.utils.book_new()

  // ---- Sheet 1: data template ----
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE_ROW])
  autoFitColumns(worksheet, [HEADERS, EXAMPLE_ROW])
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Warga Desa')

  // ---- Sheet 2: panduan pengisian ----
  const guideSheet = XLSX.utils.aoa_to_sheet(GUIDE_ROWS)
  // Lebar kolom mengikuti tabel panduan (bukan baris paragraf) agar rapi.
  autoFitColumns(guideSheet, COLUMN_GUIDE, { min: 8, max: 58 })

  // Gabungkan baris judul dan baris instruksi (yang hanya berisi teks di
  // kolom pertama) agar terbaca penuh tanpa terpotong.
  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]
  GUIDE_ROWS.forEach((row, index) => {
    if (index === 0) return
    const filled = row.filter(
      (value) => value !== '' && value !== null && value !== undefined
    ).length
    if (
      filled === 1 &&
      typeof row[0] === 'string' &&
      row[0].length > 30
    ) {
      merges.push({ s: { r: index, c: 0 }, e: { r: index, c: 4 } })
    }
  })
  guideSheet['!merges'] = merges

  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Panduan Pengisian')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition':
        'attachment; filename="Template_Lengkap_Kependudukan_Desa.xlsx"',
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Cache-Control': 'no-store',
    },
  })
}
