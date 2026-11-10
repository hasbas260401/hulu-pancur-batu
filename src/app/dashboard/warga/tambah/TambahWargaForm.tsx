'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Save, Loader2, AlertCircle } from 'lucide-react'
import { tambahWargaAction } from './actions'

// Daftar Pekerjaan Resmi Standar Administrasi Kependudukan (Dukcapil) di Indonesia
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

export default function TambahWargaForm({
  dusunList,
  lockedDusunId,
}: {
  dusunList: { id: number; nama: string }[]
  lockedDusunId: number | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setSaving(true)
    setError(null)
    try {
      const res = await tambahWargaAction(new FormData(formEl))
      if (res.success) {
        router.push('/dashboard/warga')
        router.refresh()
      } else {
        // Isian formulir dibiarkan apa adanya supaya tidak perlu mengetik ulang
        setError(res.message)
      }
    } catch (err) {
      console.error('Gagal menyimpan warga:', err)
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" />
          <span>Form Identitas Kependudukan</span>
        </h2>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">NIK (Nomor Induk Kependudukan) *</label>
            <input
              type="text"
              name="nik"
              required
              maxLength={16}
              inputMode="numeric"
              pattern="\d{16}"
              title="16 digit angka"
              placeholder="16 Digit NIK"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Kartu Keluarga (KK) *</label>
            <input
              type="text"
              name="noKk"
              required
              maxLength={16}
              inputMode="numeric"
              pattern="\d{16}"
              title="16 digit angka"
              placeholder="16 Digit Nomor KK"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
            <input
              type="text"
              name="nama"
              required
              placeholder="Masukkan nama lengkap"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin *</label>
            <select
              name="jenisKelamin"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LAKI_LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Wilayah Dusun *</label>
            <select
              name="dusunId"
              defaultValue={lockedDusunId ?? ''}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>-- Pilih Dusun --</option>
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
              placeholder="Contoh: Medan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir *</label>
            <input
              type="date"
              name="tanggalLahir"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Agama</label>
            <select
              name="agama"
              defaultValue="ISLAM"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              defaultValue="Belum Kawin"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Belum Kawin">Belum Kawin</option>
              <option value="Kawin">Kawin</option>
              <option value="Cerai Hidup">Cerai Hidup</option>
              <option value="Cerai Mati">Cerai Mati</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pekerjaan Resmi (Standar Dukcapil)</label>
            <select
              name="pekerjaan"
              defaultValue="PELAJAR/MAHASISWA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs bg-white font-medium text-slate-800"
            >
              {DAFTAR_PEKERJAAN_RESMI.map((pek) => (
                <option key={pek} value={pek}>
                  {pek}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat / Jalan (Opsional, Jika No. KK Baru)</label>
            <textarea
              name="alamat"
              rows={2}
              placeholder="Masukkan alamat RT/RW atau nama jalan untuk KK baru..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/dashboard/warga"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan…' : 'Simpan Data Warga'}</span>
          </button>
        </div>
      </form>
  )
}
