import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  Clock3,
  HandHeart,
  IdCard,
  Lock,
  Users,
  Wallet,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getWargaAccount } from '@/lib/warga-account'
import {
  formatAlamat,
  formatRupiah,
  formatTanggalPanjang,
  labelHubungan,
  labelJenisKelamin,
  labelStatusBansos,
  labelStatusWarga,
} from '@/lib/warga-format'

const MENU_TERKUNCI: Record<string, string> = {
  profil: 'Profil & Keluarga',
  surat: 'Layanan Surat Warga',
  settings: 'Pengaturan Akun',
}

export default function WargaHomePage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] w-full items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Memuat data kependudukan...</span>
          </div>
        </div>
      }
    >
      <WargaHomeContent searchParams={searchParams} />
    </Suspense>
  )
}

async function WargaHomeContent({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>
}) {
  await connection()

  const account = await getWargaAccount()
  if (!account) redirect('/login')
  // Halaman ini khusus warga. Petugas diarahkan ke dashboard operasional.
  if (account.role !== 'WARGA') redirect('/dashboard')

  const params = await searchParams
  const lockedMenu = params.locked ? MENU_TERKUNCI[params.locked] : null

  if (!account.wargaId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <IdCard className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Akun belum terhubung ke data warga</h1>
        <p className="mt-1 text-sm text-slate-500">
          Akun Anda belum ditautkan ke data kependudukan desa. Silakan hubungi Administrator atau
          Kepala Dusun untuk menautkan NIK Anda.
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
        <p className="mt-1 text-sm text-slate-500">
          Data warga yang tertaut pada akun Anda tidak lagi tersedia. Silakan hubungi Administrator.
        </p>
      </div>
    )
  }

  const anggota = warga.kk?.anggota ?? []
  const memberIds = anggota.map((a) => a.id)

  // Bantuan sosial untuk diri sendiri DAN seluruh anggota KK yang sama.
  // Hanya id anggota KK milik warga ini yang dipakai, sehingga tidak mungkin
  // menampilkan bansos warga lain di luar keluarga.
  const bansos = memberIds.length
    ? await prisma.bansos.findMany({
        where: { wargaId: { in: memberIds } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          program: true,
          periode: true,
          nominal: true,
          status: true,
          catatan: true,
          createdAt: true,
          wargaId: true,
          warga: { select: { nama: true } },
        },
      })
    : []

  const isActive = account.isActive
  const totalNominal = bansos.reduce((sum, b) => sum + Number(b.nominal ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Banner status akun.
          Banner peringatan akun PENDING sudah ditampilkan sekali oleh layout
          dashboard, jadi halaman ini tidak mengulanginya. */}
      {isActive && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-xl shadow-emerald-500/20 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-4 sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-md">
              <BadgeCheck className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Status: Terverifikasi Aktif
              </span>
              <h2 className="text-base font-extrabold sm:text-lg">Akun Anda Telah Resmi Terverifikasi</h2>
              <p className="text-xs leading-relaxed text-emerald-100">
                Seluruh fitur layanan administrasi kependudukan dan surat-menyurat online desa kini
                terbuka sepenuhnya untuk Anda.
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-800 shadow-md">
            Verified Account
          </div>
        </div>
      )}

      {/* Pemberitahuan menu terkunci saat mencoba membuka menu lain */}
      {lockedMenu && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed">
            <p className="text-sm font-bold">Menu {lockedMenu} masih terkunci</p>
            <p className="mt-0.5 text-amber-800">
              Menu tersebut terbuka otomatis setelah admin memverifikasi akun Anda.
            </p>
          </div>
        </div>
      )}

      {/* Sapaan */}
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
            Halo, {warga.nama}! 👋
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Selamat datang di Portal Layanan Kependudukan Desa Hulu Pancur Batu.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          <Clock3 className="h-4 w-4 text-slate-400" />
          <span>{formatTanggalPanjang(new Date())}</span>
        </div>
      </div>

      {/* Biodata + keluarga */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Biodata lengkap */}
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <IdCard className="h-4 w-4 text-emerald-600" />
              <span>Informasi Kependudukan</span>
            </h3>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
              Database Resmi
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            <Baris label="Nama Lengkap" value={warga.nama} />
            <Baris label="NIK" value={warga.nik} mono />
            <Baris label="No. Kartu Keluarga" value={warga.kk?.noKk ?? '-'} mono />
            <Baris label="Hubungan Keluarga" value={labelHubungan(warga.hubunganKeluarga)} />
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
            <Baris label="Alamat" value={formatAlamat(warga.kk)} />
            <Baris label="Email Terdaftar" value={warga.user?.email || '-'} />
            <Baris label="No. WhatsApp" value={warga.user?.noWhatsapp || '-'} />
          </div>
        </div>

        {/* Anggota keluarga */}
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>Anggota Keluarga Satu KK</span>
            </h3>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
              {anggota.length} Anggota
            </span>
          </div>

          <div className="space-y-2.5">
            {anggota.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada anggota keluarga yang tertaut pada nomor KK ini.
              </div>
            ) : (
              anggota.map((orang) => (
                <div
                  key={orang.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-bold text-slate-800">
                      {orang.nama}
                      {orang.id === warga.id && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          Anda
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-[11px] text-slate-400">NIK: {orang.nik}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      {labelHubungan(orang.hubunganKeluarga)}
                    </span>
                    <p className="mt-1 text-[10px] text-slate-400">{labelStatusWarga(orang.statusWarga)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-1 text-center text-[11px] text-slate-400">
            Ada perubahan data kependudukan atau keluarga? Silakan hubungi Kepala Dusun atau
            Administrator desa.
          </div>
        </div>
      </div>

      {/* Bantuan sosial */}
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <HandHeart className="h-4 w-4 text-emerald-600" />
            <span>Bantuan Sosial Diterima</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {bansos.length} data
            </span>
            {totalNominal > 0 && (
              <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <Wallet className="h-3.5 w-3.5" />
                {formatRupiah(totalNominal)}
              </span>
            )}
          </div>
        </div>

        {bansos.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada bantuan sosial yang tercatat untuk Anda atau anggota keluarga dalam KK ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-bold">Program</th>
                  <th className="px-3 py-2 font-bold">Periode</th>
                  <th className="px-3 py-2 font-bold">Penerima</th>
                  <th className="px-3 py-2 text-right font-bold">Nominal</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {bansos.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2.5 font-bold text-slate-800">{b.program}</td>
                    <td className="px-3 py-2.5 text-slate-500">{b.periode}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {b.warga?.nama ?? '-'}
                      {b.wargaId === warga.id && (
                        <span className="ml-1 text-[10px] font-bold text-emerald-600">(Anda)</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                      {formatRupiah(b.nominal ? Number(b.nominal) : null)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={statusBansosClass(b.status)}>{labelStatusBansos(b.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Data bantuan sosial mengikuti NIK Anda dan anggota keluarga dalam satu Kartu Keluarga.
          Bila ada kekeliruan, silakan hubungi Kepala Dusun.
        </p>
      </div>

      {!isActive && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
          Ingin mengajukan surat? Menu{' '}
          <span className="font-semibold text-slate-700">Layanan Surat Warga</span> aktif setelah akun
          diverifikasi.{' '}
          <Link href="/dashboard/warga-home" className="font-semibold text-emerald-600 hover:underline">
            Muat ulang status
          </Link>
        </div>
      )}
    </div>
  )
}

function Baris({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 py-1.5">
      <span className="shrink-0 font-medium text-slate-400">{label}</span>
      <span
        className={`text-right font-bold text-slate-800 ${mono ? 'font-mono' : ''} break-words`}
      >
        {value}
      </span>
    </div>
  )
}

function statusBansosClass(status: string) {
  const base = 'rounded-lg px-2 py-0.5 text-[10px] font-bold'
  switch (status) {
    case 'AKTIF':
      return `${base} bg-emerald-100 text-emerald-700`
    case 'SELESAI':
      return `${base} bg-sky-100 text-sky-700`
    case 'DICABUT':
      return `${base} bg-rose-100 text-rose-700`
    default:
      return `${base} bg-slate-100 text-slate-600`
  }
}
