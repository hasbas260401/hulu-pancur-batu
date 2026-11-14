import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { IdCard, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getWargaAccount } from '@/lib/warga-account'
import {
  formatAlamat,
  formatTanggalPanjang,
  labelHubungan,
  labelJenisKelamin,
  labelStatusWarga,
} from '@/lib/warga-format'

export default function WargaProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] w-full items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Memuat profil keluarga...</span>
          </div>
        </div>
      }
    >
      <WargaProfilContent />
    </Suspense>
  )
}

async function WargaProfilContent() {
  await connection()

  const account = await getWargaAccount()
  if (!account) redirect('/login')
  if (account.role !== 'WARGA') redirect('/dashboard')
  // Halaman ini hanya untuk akun warga yang sudah diverifikasi.
  if (!account.isActive) redirect('/dashboard/warga-home?locked=profil')

  if (!account.wargaId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <IdCard className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Akun belum terhubung ke data warga</h1>
        <p className="mt-1 text-sm text-slate-500">
          Silakan hubungi Administrator atau Kepala Dusun untuk menautkan NIK Anda ke akun ini.
        </p>
      </div>
    )
  }

  const warga = await prisma.warga.findUnique({
    where: { id: account.wargaId },
    select: {
      id: true,
      nik: true,
      nama: true,
      jenisKelamin: true,
      tempatLahir: true,
      tanggalLahir: true,
      agama: true,
      pekerjaan: true,
      statusPerkawinan: true,
      hubunganKeluarga: true,
      statusWarga: true,
      dusun: { select: { nama: true } },
      user: { select: { email: true, noWhatsapp: true } },
      kk: {
        select: {
          id: true,
          noKk: true,
          alamat: true,
          rt: true,
          rw: true,
          dusun: { select: { nama: true } },
          anggota: {
            orderBy: [{ hubunganKeluarga: 'asc' }, { nama: 'asc' }],
            select: {
              id: true,
              nik: true,
              nama: true,
              hubunganKeluarga: true,
              jenisKelamin: true,
              tanggalLahir: true,
              statusWarga: true,
            },
          },
        },
      },
    },
  })

  if (!warga) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-800">Data kependudukan tidak ditemukan</h1>
        <p className="mt-1 text-sm text-slate-500">Silakan hubungi Administrator desa.</p>
      </div>
    )
  }

  const anggota = warga.kk?.anggota ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Profil &amp; Keluarga</h1>
        <p className="text-xs text-slate-500 sm:text-sm">
          Biodata lengkap Anda beserta seluruh anggota keluarga dalam satu Kartu Keluarga.
        </p>
      </div>

      {/* Biodata lengkap */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <IdCard className="h-4 w-4 text-emerald-600" />
            <span>Biodata Lengkap</span>
          </h2>
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            Database Resmi
          </span>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
          <Baris label="Nama Lengkap" value={warga.nama} />
          <Baris label="NIK" value={warga.nik} mono />
          <Baris label="No. Kartu Keluarga (KK)" value={warga.kk?.noKk ?? '-'} mono />
          <Baris label="Hubungan dalam KK" value={labelHubungan(warga.hubunganKeluarga)} />
          <Baris label="Jenis Kelamin" value={labelJenisKelamin(warga.jenisKelamin)} />
          <Baris
            label="Tempat / Tanggal Lahir"
            value={`${warga.tempatLahir || '-'}, ${formatTanggalPanjang(warga.tanggalLahir)}`}
          />
          <Baris label="Agama" value={warga.agama || '-'} />
          <Baris label="Pekerjaan" value={warga.pekerjaan || '-'} />
          <Baris label="Status Perkawinan" value={warga.statusPerkawinan || '-'} />
          <Baris label="Status Warga" value={labelStatusWarga(warga.statusWarga)} />
          <Baris label="Wilayah / Dusun" value={warga.dusun?.nama || warga.kk?.dusun?.nama || '-'} />
          <Baris label="Alamat Lengkap" value={formatAlamat(warga.kk)} />
          <Baris label="Email Terdaftar" value={warga.user?.email || '-'} />
          <Baris label="No. WhatsApp" value={warga.user?.noWhatsapp || '-'} />
        </div>
      </div>

      {/* Tabel anggota keluarga */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Anggota Keluarga (KK {warga.kk?.noKk ?? '-'})</span>
          </h2>
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
            {anggota.length} Anggota
          </span>
        </div>

        {anggota.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Belum ada anggota keluarga yang tertaut pada nomor KK ini.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-bold">No</th>
                  <th className="px-3 py-2 font-bold">Nama</th>
                  <th className="px-3 py-2 font-bold">NIK</th>
                  <th className="px-3 py-2 font-bold">Hubungan</th>
                  <th className="px-3 py-2 font-bold">L/P</th>
                  <th className="px-3 py-2 font-bold">Tanggal Lahir</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {anggota.map((orang, index) => (
                  <tr key={orang.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2.5 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {orang.nama}
                      {orang.id === warga.id && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          Anda
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">{orang.nik}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {labelHubungan(orang.hubunganKeluarga)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {orang.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{formatTanggalPanjang(orang.tanggalLahir)}</td>
                    <td className="px-3 py-2.5">
                      <span className={statusWargaClass(orang.statusWarga)}>
                        {labelStatusWarga(orang.statusWarga)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[11px] text-slate-400">
          Data keluarga diambil berdasarkan nomor KK yang sama. Untuk perubahan data, silakan hubungi
          Kepala Dusun atau Administrator desa.
        </p>
      </div>
    </div>
  )
}

function Baris({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 py-1.5">
      <span className="shrink-0 font-medium text-slate-400">{label}</span>
      <span className={`break-words text-right font-bold text-slate-800 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function statusWargaClass(status: string) {
  const base = 'rounded-lg px-2 py-0.5 text-[10px] font-bold'
  switch (status) {
    case 'AKTIF':
      return `${base} bg-emerald-100 text-emerald-700`
    case 'PINDAH':
      return `${base} bg-amber-100 text-amber-700`
    case 'MENINGGAL':
      return `${base} bg-slate-200 text-slate-600`
    default:
      return `${base} bg-slate-100 text-slate-600`
  }
}
