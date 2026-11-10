'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateWargaAction } from './actions'
import { formatTitleCase } from '@/lib/format-title-case'

const DAFTAR_PEKERJAAN_RESMI = [
  'BELUM/TIDAK BEKERJA',
  'MENGURUS RUMAH TANGGA',
  'PELAJAR/MAHASISWA',
  'PENSIUNAN',
  'PEGAWAI NEGERI SIPIL (PNS)',
  'TENTARA NASIONAL INDONESIA (TNI)',
  'KEPOLISIAN RI (POLRI)',
  'PERDAGANGAN',
  'PETANI/PEKEBUN',
  'PETERNAK',
  'NELAYAN/PERIKANAN',
  'INDUSTRI',
  'KONSTRUKSI',
  'TRANSPORTASI',
  'KARYAWAN SWASTA',
  'KARYAWAN BUMN',
  'KARYAWAN BUMD',
  'KARYAWAN HONORER',
  'BURUH HARIAN LEPAS',
  'BURUH TANI/PERKEBUNAN',
  'BURUH NELAYAN/PERIKANAN',
  'BURUH PETERNAKAN',
  'TUKANG BATU',
  'TUKANG KAYU',
  'TUKANG SOL SEPATU',
  'TUKANG LAS/PANDAI BESI',
  'TUKANG JAHIT',
  'TUKANG GIGI',
  'PENATA RIAS',
  'PENATA RAMBUT',
  'PENATA BUSANA',
  'MEKANIK',
  'SENIMAN',
  'TABIB',
  'PARAJI',
  'PERANCANG BUSANA',
  'PENTERJEMAH',
  'WARTAWAN',
  'JURU MASAK',
  'APOTEKER',
  'PSIKOLOG/PSIKIATER',
  'NYANYI/PEMUSIK',
  'SENIMAN/LUKIS',
  'KEPALA DAERAH',
  'ANGGOTA DPR-RI',
  'ANGGOTA DPD',
  'ANGGOTA BPK',
  'PRESIDEN',
  'WAKIL PRESIDEN',
  'DUTA BESAR',
  'GUBERNUR',
  'WAKIL GUBERNUR',
  'BUPATI',
  'WAKIL BUPATI',
  'WALIKOTA',
  'WAKIL WALIKOTA',
  'ANGGOTA DPRD PROVINSI',
  'ANGGOTA DPRD KABUPATEN/KOTA',
  'DOSEN',
  'GURU',
  'PILOT',
  'PENGACARA',
  'NOTARIS',
  'ARSITEK',
  'AKUNTAN',
  'KONSULTAN',
  'DOKTER',
  'BIDAN',
  'PERAWAT',
  'PSIKIATER/PSIKOLOG',
  'WIRASWASTA',
  'LAINNYA',
]



const AGAMA_OPTIONS = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDHA', 'KONGHUCU']
const STATUS_KAWIN_OPTIONS = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
const HUBUNGAN_OPTIONS = [
  'Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Cucu',
  'Orang Tua', 'Mertua', 'Famili Lain', 'Lainnya',
]

// Cocokkan nilai tersimpan dengan pilihan yang ada tanpa membedakan huruf besar/kecil.
// (Data hasil import Excel bisa tertulis 'Kristen' atau 'Buddha'; tanpa pencocokan, kolom pilihan
//  menampilkan opsi pertama dan menyimpan formulir akan menimpa data aslinya.)
function matchOption(options: string[], value: string, fallback: string) {
  const v = value.trim().toLowerCase()
  const alias = v === 'buddha' ? 'budha' : v
  return options.find((o) => o.toLowerCase() === alias) ?? fallback
}

type WargaForm = {
  id: string
  nik: string
  nama: string
  jenisKelamin: string
  dusunId: number
  tempatLahir: string
  agama: string
  statusPerkawinan: string
  hubunganKeluarga: string
  pekerjaan: string
  noKk: string
  alamatKK: string
}

export default function EditWargaForm({
  warga: w,
  tanggalLahirValue,
  dusunList,
  lockedDusunId,
}: {
  warga: WargaForm
  tanggalLahirValue: string
  dusunList: { id: number; nama: string }[]
  lockedDusunId: number | null
}) {
  const router = useRouter()

  const pekerjaanTersimpan = w.pekerjaan.trim()
  const pekerjaanCocok = DAFTAR_PEKERJAAN_RESMI.find((p) => p.toLowerCase() === pekerjaanTersimpan.toLowerCase())
  const pekerjaanValue = pekerjaanCocok ?? (pekerjaanTersimpan || 'PELAJAR/MAHASISWA')
  const pekerjaanLama = !pekerjaanCocok && pekerjaanTersimpan ? pekerjaanTersimpan : null

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setSaving(true)
    setError(null)
    try {
      const res = await updateWargaAction(w.id, new FormData(formEl))
      if (res.success) {
        router.push(`/dashboard/warga/${w.id}`)
        router.refresh()
      } else {
        // Isian dibiarkan apa adanya supaya perubahan yang sudah diketik tidak hilang
        setError(res.message)
      }
    } catch (err) {
      console.error('Gagal menyimpan perubahan:', err)
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>📋</span> Informasi Identitas Warga & Kartu Keluarga
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">NIK *</label>
              <input
                type="text"
                name="nik"
                defaultValue={w.nik}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
              />
            </div>

            {/* Kolom Nomor KK sekarang aktif dan bisa diedit */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor KK *</label>
              <input
                type="text"
                name="noKk"
                defaultValue={w.noKk}
                required
                placeholder="Masukkan Nomor KK..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs bg-white text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                name="nama"
                defaultValue={w.nama}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin *</label>
              <select
                name="jenisKelamin"
                defaultValue={w.jenisKelamin}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white"
              >
                <option value="LAKI_LAKI">Laki-laki</option>
                <option value="PEREMPUAN">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Wilayah Dusun *</label>
              <select
                name="dusunId"
                defaultValue={w.dusunId}
                disabled={lockedDusunId !== null}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white"
              >
                {dusunList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat Lahir</label>
              <input
                type="text"
                name="tempatLahir"
                defaultValue={w.tempatLahir}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir *</label>
              <input
                type="date"
                name="tanggalLahir"
                defaultValue={tanggalLahirValue}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Agama</label>
              <select
                name="agama"
                defaultValue={matchOption(AGAMA_OPTIONS, w.agama, 'ISLAM')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white"
              >
                <option value="ISLAM">Islam</option>
                <option value="KRISTEN">Kristen</option>
                <option value="KATOLIK">Katolik</option>
                <option value="HINDU">Hindu</option>
                <option value="BUDHA">Budha</option>
                <option value="KONGHUCU">Konghucu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status Perkawinan</label>
              <select
                name="statusPerkawinan"
                defaultValue={matchOption(STATUS_KAWIN_OPTIONS, w.statusPerkawinan, 'Belum Kawin')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white"
              >
                <option value="Belum Kawin">Belum Kawin</option>
                <option value="Kawin">Kawin</option>
                <option value="Cerai Hidup">Cerai Hidup</option>
                <option value="Cerai Mati">Cerai Mati</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hubungan Keluarga</label>
              <select
                name="hubunganKeluarga"
                defaultValue={matchOption(HUBUNGAN_OPTIONS, w.hubunganKeluarga, 'Kepala Keluarga')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white"
              >
                <option value="Kepala Keluarga">Kepala Keluarga</option>
                <option value="Suami">Suami</option>
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Menantu">Menantu</option>
                <option value="Cucu">Cucu</option>
                <option value="Orang Tua">Orang Tua</option>
                <option value="Mertua">Mertua</option>
                <option value="Famili Lain">Famili Lain</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Rumah (Satu KK)</label>
              <input
                type="text"
                name="alamatKK"
                defaultValue={w.alamatKK}
                placeholder="Contoh: Desa Hulu Pancur Batu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pekerjaan Resmi (Standar Dukcapil)</label>
              <select
                name="pekerjaan"
                defaultValue={pekerjaanValue}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white font-medium text-slate-800"
              >
                {pekerjaanLama && <option value={pekerjaanLama}>{pekerjaanLama} (data lama)</option>}
                {DAFTAR_PEKERJAAN_RESMI.map((pek) => (
                  <option key={pek} value={pek}>
                    {formatTitleCase(pek)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/dashboard/warga/${w.id}`}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan…' : '💾 Simpan Perubahan'}
          </button>
        </div>
      </form>
  )
}