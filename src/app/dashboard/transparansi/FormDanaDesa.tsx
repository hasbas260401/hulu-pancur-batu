'use client'

import { useState } from 'react'

interface FormDanaDesaProps {
  tambahDanaAction: (formData: FormData) => Promise<void>
  defaultTahun: number
}

export default function FormDanaDesa({ tambahDanaAction, defaultTahun }: FormDanaDesaProps) {
  const [jenisSelect, setJenisSelect] = useState('PENDAPATAN')
  const [jenisLainnya, setJenisLainnya] = useState('')

  const [kategoriSelect, setKategoriSelect] = useState('Bidang Pembangunan')
  const [kategoriLainnya, setKategoriLainnya] = useState('')

  return (
    <form action={tambahDanaAction} className="space-y-3 text-xs">
      {/* Input Hidden untuk Mengirim Hasil Jenis & Kategori Akhir ke Server Action */}
      <input
        type="hidden"
        name="jenis"
        value={jenisSelect === 'LAINNYA' ? jenisLainnya : jenisSelect}
      />
      <input
        type="hidden"
        name="kategori"
        value={kategoriSelect === 'LAINNYA' ? kategoriLainnya : kategoriSelect}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Tahun Anggaran</label>
          <input
            type="number"
            name="tahun"
            defaultValue={defaultTahun}
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Jenis Transaksi</label>
          <select
            value={jenisSelect}
            onChange={(e) => setJenisSelect(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="PENDAPATAN">Pendapatan</option>
            <option value="BELANJA">Belanja</option>
            <option value="PEMBIAYAAN">Pembiayaan</option>
            <option value="LAINNYA">Lainnya...</option>
          </select>
        </div>
      </div>

      {/* Form Input Manual Jenis Jika "Lainnya" Dipilih */}
      {jenisSelect === 'LAINNYA' && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <label className="block font-semibold text-slate-700 mb-1">Ketik Jenis Transaksi Manual</label>
          <input
            type="text"
            value={jenisLainnya}
            onChange={(e) => setJenisLainnya(e.target.value)}
            placeholder="Contoh: DANA DARURAT"
            required={jenisSelect === 'LAINNYA'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none uppercase font-bold text-emerald-600"
          />
        </div>
      )}

      <div>
        <label className="block font-semibold text-slate-600 mb-1">Kategori</label>
        <select
          value={kategoriSelect}
          onChange={(e) => setKategoriSelect(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
        >
          <option value="Bidang Pembangunan">Bidang Pembangunan</option>
          <option value="Dana Desa (DDS)">Dana Desa (DDS)</option>
          <option value="Alokasi Dana Desa (ADD)">Alokasi Dana Desa (ADD)</option>
          <option value="Bidang Pemberdayaan Masyarakat">Bidang Pemberdayaan Masyarakat</option>
          <option value="Bidang Penyelenggaraan Pemerintahan">Bidang Penyelenggaraan Pemerintahan</option>
          <option value="LAINNYA">Lainnya...</option>
        </select>
      </div>

      {/* Form Input Manual Kategori Jika "Lainnya" Dipilih */}
      {kategoriSelect === 'LAINNYA' && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
          <label className="block font-semibold text-slate-700 mb-1">Ketik Kategori Manual</label>
          <input
            type="text"
            value={kategoriLainnya}
            onChange={(e) => setKategoriLainnya(e.target.value)}
            placeholder="Contoh: Pendapatan Asli Desa (PAD)"
            required={kategoriSelect === 'LAINNYA'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none font-bold text-slate-800"
          />
        </div>
      )}

      <div>
        <label className="block font-semibold text-slate-600 mb-1">Uraian / Kegiatan</label>
        <input
          type="text"
          name="uraian"
          placeholder="Contoh: Penerimaan Dana Induk Pusat / Paving Block"
          required
          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Anggaran (Rp)</label>
          <input
            type="number"
            step="0.01"
            name="anggaran"
            placeholder="0"
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-600 mb-1">Realisasi (Rp)</label>
          <input
            type="number"
            step="0.01"
            name="realisasi"
            placeholder="0"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-600 mb-1">Sumber Dana (Opsional)</label>
        <input
          type="text"
          name="sumber"
          placeholder="Contoh: DDS / ADD / PBH"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition mt-2"
      >
        Simpan Data Dana Desa
      </button>
    </form>
  )
}