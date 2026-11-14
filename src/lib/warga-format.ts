// Pemformat data kependudukan yang dipakai bersama oleh halaman server dan
// komponen klien. File ini sengaja tidak memakai 'use client' agar bisa
// diimpor dari server component maupun client component.

const HUBUNGAN_LABEL: Record<string, string> = {
  KEPALA_KELUARGA: 'Kepala Keluarga',
  ISTRI: 'Istri',
  SUAMI: 'Suami',
  ANAK: 'Anak',
  ORANG_TUA: 'Orang Tua',
  FAMILI_LAIN: 'Famili Lain',
  LAINNYA: 'Lainnya',
}

const JENIS_KELAMIN_LABEL: Record<string, string> = {
  LAKI_LAKI: 'Laki-laki',
  L: 'Laki-laki',
  PEREMPUAN: 'Perempuan',
  P: 'Perempuan',
}

const STATUS_WARGA_LABEL: Record<string, string> = {
  AKTIF: 'Aktif',
  PINDAH: 'Pindah',
  MENINGGAL: 'Meninggal',
}

const STATUS_BANSOS_LABEL: Record<string, string> = {
  AKTIF: 'Aktif',
  SELESAI: 'Selesai',
  DICABUT: 'Dicabut',
}

export function labelHubungan(value: string | null | undefined) {
  if (!value) return 'Anggota Keluarga'
  return HUBUNGAN_LABEL[value.toUpperCase()] ?? value.replaceAll('_', ' ')
}

export function labelJenisKelamin(value: string | null | undefined) {
  if (!value) return '-'
  return JENIS_KELAMIN_LABEL[value.toUpperCase()] ?? value
}

export function labelStatusWarga(value: string | null | undefined) {
  if (!value) return '-'
  return STATUS_WARGA_LABEL[value.toUpperCase()] ?? value
}

export function labelStatusBansos(value: string | null | undefined) {
  if (!value) return '-'
  return STATUS_BANSOS_LABEL[value.toUpperCase()] ?? value
}

/** Format tanggal panjang Indonesia, mis. "12 November 2026". */
export function formatTanggalPanjang(value: Date | string | null | undefined) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

/** Format tanggal ringkas Indonesia, mis. "12 Nov 2026". */
export function formatTanggalSingkat(value: Date | string | null | undefined) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

export function formatRupiah(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatAlamat(kk: {
  alamat?: string | null
  rt?: string | null
  rw?: string | null
} | null | undefined) {
  if (!kk?.alamat) return '-'
  const parts = [kk.alamat]
  if (kk.rt) parts.push(`RT ${kk.rt}`)
  if (kk.rw) parts.push(`RW ${kk.rw}`)
  return parts.join(', ')
}
