import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const templateData = [
    {
      'No KK': '1207052604010000',
      NIK: '1207052604010001',
      'Nama Lengkap': 'Contoh Kepala Keluarga',
      'Hubungan Keluarga': 'Kepala Keluarga', // Pilihan: Kepala Keluarga, Suami, Istri, Anak, dll.
      'Jenis Kelamin': 'LAKI_LAKI',          // Pilihan: LAKI_LAKI atau PEREMPUAN
      'ID Dusun': 1,                         // Angka ID Dusun sesuai database
      'Tempat Lahir': 'Medan',
      'Tanggal Lahir': '1990-08-17',         // Format: YYYY-MM-DD
      Agama: 'Islam',
      'Jenis Pekerjaan': 'Wiraswasta',
      'Status Perkawinan': 'Kawin',
      'Status Warga': 'AKTIF',               // Pilihan: AKTIF, MENINGGAL, PINDAH
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(templateData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Warga Desa')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename="Template_Lengkap_Kependudukan_Desa.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}