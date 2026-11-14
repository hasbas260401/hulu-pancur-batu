'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

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

const DAFTAR_BANSOS_FILTER = [
  { label: 'Penerima PKH', value: 'PKH (Program Keluarga Harapan)' },
  { label: 'Penerima BPNT', value: 'BPNT (Bantuan Pangan Non-Tunai / Sembako)' },
  { label: 'Penerima BLT-DD', value: 'BLT-DD (Bantuan Langsung Tunai Dana Desa)' },
  { label: 'Penerima PBI-JK', value: 'PBI-JK (Penerima Bantuan Iuran Jaminan Kesehatan)' },
  { label: 'Penerima BST', value: 'BST (Bantuan Sosial Tunai)' },
]

export default function FilterWargaBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [mode, setMode] = useState(searchParams.get('mode') || 'semua')
  const [agama, setAgama] = useState(searchParams.get('agama') || '')
  const [pekerjaan, setPekerjaan] = useState(searchParams.get('pekerjaan') || '')
  const [bantuan, setBantuan] = useState(searchParams.get('bantuan') || '')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const updateFilters = (newValues: {
    query?: string
    mode?: string
    agama?: string
    pekerjaan?: string
    bantuan?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    const currentStatus = searchParams.get('status')
    if (currentStatus) params.set('status', currentStatus)

    const nextQuery = newValues.query !== undefined ? newValues.query : query
    const nextMode = newValues.mode !== undefined ? newValues.mode : mode
    const nextAgama = newValues.agama !== undefined ? newValues.agama : agama
    const nextPekerjaan = newValues.pekerjaan !== undefined ? newValues.pekerjaan : pekerjaan
    const nextBantuan = newValues.bantuan !== undefined ? newValues.bantuan : bantuan

    if (nextQuery) {
      params.set('query', nextQuery)
      params.set('mode', nextMode)
    } else {
      params.delete('query')
      params.delete('mode')
    }

    if (nextAgama) {
      params.set('agama', nextAgama)
    } else {
      params.delete('agama')
    }

    if (nextPekerjaan) {
      params.set('pekerjaan', nextPekerjaan)
    } else {
      params.delete('pekerjaan')
    }

    if (nextBantuan) {
      params.set('bantuan', nextBantuan)
    } else {
      params.delete('bantuan')
    }

    params.delete('page')
    router.push(`/dashboard/warga?${params.toString()}`)
  }

  const handleReset = () => {
    setQuery('')
    setMode('semua')
    setAgama('')
    setPekerjaan('')
    setBantuan('')
    
    const params = new URLSearchParams()
    const currentStatus = searchParams.get('status')
    if (currentStatus) params.set('status', currentStatus)

    router.push(`/dashboard/warga?${params.toString()}`)
  }

  if (!isMounted) return null

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Search className="w-4 h-4 text-emerald-600" /> Filter & Pencarian Data Kependudukan Lanjutan
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Data terfilter otomatis secara instan</span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-10 flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition">
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value)
                updateFilters({ mode: e.target.value })
              }}
              className="px-3 py-2.5 bg-slate-100 text-slate-700 font-semibold border-r border-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="semua">Semua Kategori</option>
              <option value="nama">Nama Lengkap</option>
              <option value="nik">Nomor NIK</option>
              <option value="kk">Nomor KK</option>
            </select>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const val = e.target.value
                setQuery(val)
                const handler = setTimeout(() => {
                  updateFilters({ query: val })
                }, 400)
                return () => clearTimeout(handler)
              }}
              placeholder="Ketik pencarian (Nama, NIK, atau No. KK) - langsung memfilter..."
              className="w-full px-4 py-2.5 bg-transparent focus:outline-none text-slate-800 font-medium"
            />
          </div>

          <div className="lg:col-span-2 flex items-center">
            <button
              type="button"
              onClick={handleReset}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center transition cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Berdasarkan Agama</label>
            <select
              value={agama}
              onChange={(e) => {
                setAgama(e.target.value)
                updateFilters({ agama: e.target.value })
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Semua Agama --</option>
              <option value="ISLAM">Islam</option>
              <option value="KRISTEN">Kristen</option>
              <option value="KATOLIK">Katolik</option>
              <option value="HINDU">Hindu</option>
              <option value="BUDHA">Budha</option>
              <option value="KONGHUCU">Konghucu</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Berdasarkan Pekerjaan</label>
            <select
              value={pekerjaan}
              onChange={(e) => {
                setPekerjaan(e.target.value)
                updateFilters({ pekerjaan: e.target.value })
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Semua Pekerjaan (Dukcapil) --</option>
              {DAFTAR_PEKERJAAN_RESMI.map((pek, index) => (
                <option key={`${pek}-${index}`} value={pek}>
                  {pek}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Berdasarkan Program Bansos</label>
            <select
              value={bantuan}
              onChange={(e) => {
                setBantuan(e.target.value)
                updateFilters({ bantuan: e.target.value })
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Semua Status Bansos --</option>
              {DAFTAR_BANSOS_FILTER.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}