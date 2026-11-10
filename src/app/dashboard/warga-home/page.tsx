'use client'

import { useState, useEffect } from 'react'

export default function WargaHomeDashboard() {
  const [residentData, setResidentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/warga/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setResidentData(data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-xs font-semibold">
        Memuat Data Kependudukan Warga...
      </div>
    )
  }

  // Fallback data jika data dari API belum tersedia
  const data = residentData || {
    nama: 'Warga Desa',
    nik: '-',
    status: 'PENDING',
    dusun: 'Dusun II',
    email: '-',
    noWhatsapp: '-',
    noKK: '-',
    alamat: '-',
    tanggalLahir: '-',
    jenisKelamin: '-',
    anggotaKeluarga: []
  }

  // Cek apakah akun sudah aktif (ACTIVE atau AKTIF)
  const isActive = data.status && 
    (data.status.toUpperCase() === 'ACTIVE' || data.status.toUpperCase() === 'AKTIF')

  return (
    <div className="space-y-6">
      
      {/* BANNER STATUS AKUN DINAMIS (Kuning jika Pending, Hijau jika Aktif) */}
      {isActive ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Status: Terverifikasi Aktif
              </span>
              <h2 className="text-base sm:text-lg font-extrabold">Akun Anda Telah Resmi Terverifikasi</h2>
              <p className="text-xs text-emerald-100 leading-relaxed">
                Seluruh fitur layanan administrasi kependudukan dan surat-menyurat online desa kini terbuka sepenuhnya untuk Anda.
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow-md shrink-0">
            Verified Account
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Status: Menunggu Verifikasi
              </span>
              <h2 className="text-base sm:text-lg font-extrabold">Akun Anda Belum Diverifikasi oleh Administrator</h2>
              <p className="text-xs text-amber-100 leading-relaxed">
                Beberapa fitur layanan administrasi desa akan terbuka otomatis setelah Admin atau Kepala Dusun menyetujui akun Anda.
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white text-amber-800 font-bold text-xs rounded-xl shadow-md shrink-0">
            Pending Approval
          </div>
        </div>
      )}

      {/* WELCOME GREETING */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Halo, {data.nama}! 👋</h1>
          <p className="text-xs sm:text-sm text-slate-500">Selamat datang di Portal Layanan Kependudukan Desa Hulu Pancur Batu.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3.5 py-2 rounded-xl shadow-sm border border-slate-200">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* GRID KARTU BIODATA KOMPREHENSIF & KELUARGA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM KIRI: Biodata Lengkap Berdasarkan Database NIK */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <span>Informasi Kependudukan (NIK)</span>
            </h3>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">Database Resmi</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Nama Lengkap</span>
              <span className="font-bold text-slate-800">{data.nama}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">NIK</span>
              <span className="font-mono font-bold text-slate-800">{data.nik}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">No. Kartu Keluarga (KK)</span>
              <span className="font-mono font-bold text-slate-800">{data.noKK}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Wilayah / Dusun</span>
              <span className="font-bold text-slate-800">{data.dusun}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Alamat Tempat Tinggal</span>
              <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">{data.alamat}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Tanggal Lahir</span>
              <span className="font-medium text-slate-800">{data.tanggalLahir}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Jenis Kelamin</span>
              <span className="font-medium text-slate-800">{data.jenisKelamin}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400 font-medium">Email Terdaftar</span>
              <span className="font-medium text-slate-800">{data.email}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">No. WhatsApp</span>
              <span className="font-medium text-slate-800">{data.noWhatsapp}</span>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Daftar Anggota Keluarga Dalam 1 KK */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Anggota Keluarga Dalam Satu KK</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {data.anggotaKeluarga ? data.anggotaKeluarga.length : 0} Anggota
            </span>
          </div>

          <div className="space-y-2.5">
            {!data.anggotaKeluarga || data.anggotaKeluarga.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Belum ada data anggota keluarga yang tertaut pada nomor KK ini.
              </div>
            ) : (
              data.anggotaKeluarga.map((anggota: any) => (
                <div key={anggota.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{anggota.nama}</p>
                    <p className="text-[11px] text-slate-400 font-mono">NIK: {anggota.nik}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px]">
                    {anggota.hubungan}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400">
              Ada perubahan data kependudukan atau keluarga? Silakan hubungi Kepala Dusun atau Administrator desa.
            </p>
          </div>
        </div>

      </div>

    </div>
  )
}