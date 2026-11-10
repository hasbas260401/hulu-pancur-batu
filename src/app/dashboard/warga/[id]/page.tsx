import { PrismaClient, type StatusBansos } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { connection } from 'next/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getWargaScope, getBansosScope } from '@/lib/warga-scope'
import BansosFormModal from './BansosFormModal'
import {
  ArrowLeft,
  Pencil,
  AlertCircle,
  Info,
  Gift,
  Users,
  MapPin,
  MapPinned,
  Cake,
  BookOpen,
  HeartHandshake,
  Briefcase,
  Network,
  UserRound,
  CreditCard,
  Home,
  CalendarDays,
  Navigation,
  MessageSquare,
  HeartPulse,
  Venus,
  Mars,
  Banknote,
  type LucideIcon,
} from 'lucide-react'
import DeleteBansosButton from './DeleteBansosButton' // Komponen client kecil untuk SweetAlert hapus bansos

const prisma = new PrismaClient()

// Fungsi pembantu untuk merapikan teks menjadi Title Case yang profesional
function formatTitleCase(str: string | null | undefined): string {
  if (!str) return '-'
  if (str === 'PNS' || str === 'TNI' || str === 'POLRI' || str === 'BUMN' || str === 'BUMD') {
    return str
  }
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function formatTanggal(date: Date | string | null | undefined): string {
  return date
    ? new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'
}

// Judul bagian: ikon dalam kotak berwarna lembut + judul
function SectionTitle({
  icon: Icon,
  tone,
  title,
  desc,
}: {
  icon: LucideIcon
  tone: string
  title: string
  desc?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {desc && <p className="text-sm text-slate-500">{desc}</p>}
      </div>
    </div>
  )
}

// Satu data: ikon kecil + label + nilai
function Field({
  icon: Icon,
  label,
  children,
  mono,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className={`mt-0.5 text-sm font-medium text-slate-900 break-words ${mono ? 'font-mono tabular-nums' : ''}`}>
          {children}
        </dd>
      </div>
    </div>
  )
}

const cardClass = 'rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm'

export default function DetailWargaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat data...</span>
          </div>
        </div>
      }
    >
      <DetailContent params={params} />
    </Suspense>
  )
}

async function DetailContent({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params

  // Wajib login. ADMIN, atau KADUS berizin 'warga' yang hanya boleh melihat warga di dusunnya.
  // (sebelumnya: pengguna mana pun yang sudah login bisa membuka data lengkap warga mana pun lewat ID)
  const scope = await getWargaScope()
  if (!scope.ok) {
    if (scope.status === 401) redirect('/login')
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Akses ditolak</h1>
        <p className="mt-1 text-sm text-slate-500">{scope.message}</p>
      </div>
    )
  }
  if (typeof id !== 'string' || id.length > 100) notFound()

  // Hak mengubah bansos dicek terpisah (izin 'bansos')
  const bansosScope = await getBansosScope()
  const canEditBansos = bansosScope.ok

  const warga = await prisma.warga.findFirst({
    where: { id, ...scope.dusunFilter },
    include: {
      dusun: true,
      kk: {
        include: {
          dusun: true,
          anggota: {
            orderBy: { nama: 'asc' },
          },
        },
      },
      bansos: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!warga) {
    notFound()
  }

  async function handleBansosAction(formData: FormData): Promise<{ success: boolean; message: string }> {
    'use server'

    // Diperiksa ULANG saat aksi dijalankan, karena aksi dapat dipanggil terpisah dari halaman ini
    const wargaScope = await getWargaScope()
    const bansosAccess = await getBansosScope()
    if (!wargaScope.ok || !bansosAccess.ok) {
      return { success: false, message: 'Anda tidak memiliki izin untuk mengelola bansos.' }
    }

    // Warga harus berada di wilayah pengguna
    const target = await prisma.warga.findFirst({
      where: { id, ...wargaScope.dusunFilter },
      select: { id: true, dusunId: true, nama: true },
    })
    if (!target) return { success: false, message: 'Data warga tidak ditemukan.' }

    const actionType = String(formData.get('actionType') ?? '')

    const catat = async (aksi: string, entitasId: string | null, detail: Record<string, string>) => {
      try {
        await prisma.auditLog.create({
          data: { userId: bansosAccess.userId, aksi, entitas: 'Bansos', entitasId, detail },
        })
      } catch (error) {
        console.error('Gagal mencatat audit log:', error)
      }
    }

    try {
      if (actionType === 'delete') {
        const bansosId = String(formData.get('bansosId') ?? '')
        if (!bansosId) return { success: false, message: 'Data bansos tidak valid.' }

        // Hanya bansos milik warga ini; deleteMany tidak error bila sudah terhapus (klik ganda)
        const hasil = await prisma.bansos.deleteMany({ where: { id: bansosId, wargaId: target.id } })
        if (hasil.count > 0) await catat('HAPUS_BANSOS', bansosId, { warga: target.nama })

        revalidatePath(`/dashboard/warga/${id}`)
        return { success: true, message: 'Data bansos berhasil dihapus.' }
      }

      if (actionType === 'add') {
        const programSelect = String(formData.get('program_select') ?? '')
        const programManual = String(formData.get('program_manual') ?? '')
        const finalProgram = (programSelect === 'LAINNYA' ? programManual : programSelect).trim()

        const bulan = String(formData.get('bulan') ?? '').trim().slice(0, 20)
        const tahun = String(formData.get('tahun') ?? '').trim()
        const nominalRaw = String(formData.get('nominal') ?? '').trim()
        const status = String(formData.get('status') ?? 'AKTIF')
        const catatan = String(formData.get('catatan') ?? '').trim().slice(0, 255)

        if (!finalProgram || finalProgram.length > 100) return { success: false, message: 'Nama program bansos tidak valid.' }
        if (!/^\d{4}$/.test(tahun) || Number(tahun) < 2000 || Number(tahun) > 2100) {
          return { success: false, message: 'Tahun periode harus 4 angka antara 2000 dan 2100.' }
        }
        if (!['AKTIF', 'SELESAI', 'DICABUT'].includes(status)) return { success: false, message: 'Status bansos tidak valid.' }

        let nominal: number | null = null
        if (nominalRaw) {
          nominal = Number(nominalRaw)
          if (!Number.isFinite(nominal) || nominal < 0 || nominal > 1_000_000_000_000) {
            return { success: false, message: 'Nominal bantuan tidak valid.' }
          }
        }

        const baru = await prisma.bansos.create({
          data: {
            wargaId: target.id,
            dusunId: target.dusunId,
            program: finalProgram,
            periode: `${bulan} ${tahun}`.trim(),
            nominal,
            status: status as StatusBansos,
            catatan: catatan || null,
          },
          select: { id: true },
        })
        await catat('TAMBAH_BANSOS', baru.id, { warga: target.nama, program: finalProgram })

        revalidatePath(`/dashboard/warga/${id}`)
        return { success: true, message: 'Bansos berhasil didaftarkan.' }
      }

      return { success: false, message: 'Aksi tidak dikenal.' }
    } catch (error) {
      console.error('Error aksi bansos:', error)
      return { success: false, message: 'Terjadi kesalahan. Silakan coba lagi.' }
    }
  }

  const tglLahirFormatted = formatTanggal(warga.tanggalLahir)
  const tglMeninggalFormatted = formatTanggal(warga.tanggalMeninggal)
  const tglPindahFormatted = formatTanggal(warga.tanggalPindah)

  const isLaki = warga.jenisKelamin === 'LAKI_LAKI'
  const GenderIcon = isLaki ? Mars : Venus
  const namaDusun = warga.dusun?.nama || warga.kk?.dusun?.nama || '-'
  const jumlahAnggota = warga.kk?.anggota.length ?? 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Navigasi */}
      <Link
        href="/dashboard/warga"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar warga
      </Link>

      {/* Header profil */}
      <header className={`${cardClass} overflow-hidden`}>
        <div className="h-24 sm:h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800" />
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            {/* Hanya avatar yang menumpuk di atas banner */}
            <div
              className={`-mt-12 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-3xl font-semibold ring-4 ring-white shadow-sm sm:-mt-14 ${
                isLaki ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
              }`}
              aria-hidden="true"
            >
              {getInitials(warga.nama)}
            </div>
            <div className="min-w-0 flex-1 sm:pt-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {formatTitleCase(warga.nama)}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isLaki ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  }`}
                >
                  <GenderIcon className="h-3.5 w-3.5" />
                  {isLaki ? 'Laki-laki' : 'Perempuan'}
                </span>
                {warga.statusWarga === 'MENINGGAL' && (
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
                    Meninggal
                  </span>
                )}
                {warga.statusWarga === 'PINDAH' && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                    Pindah domisili
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <CreditCard className="h-4 w-4 text-slate-400" />
                NIK <span className="font-mono tabular-nums font-medium text-slate-700">{warga.nik}</span>
              </p>
            </div>
            <Link
              href={`/dashboard/warga/${warga.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:mt-4"
            >
              <Pencil className="h-4 w-4" />
              Edit data utama
            </Link>
          </div>

          {/* Ringkasan singkat */}
          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <dt className="text-xs text-slate-500">Wilayah</dt>
                <dd className="text-sm font-semibold text-slate-900">{namaDusun}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <Users className="h-5 w-5 text-teal-600" />
              <div>
                <dt className="text-xs text-slate-500">Anggota keluarga</dt>
                <dd className="text-sm font-semibold text-slate-900">{jumlahAnggota} orang</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <Gift className="h-5 w-5 text-violet-600" />
              <div>
                <dt className="text-xs text-slate-500">Bantuan sosial</dt>
                <dd className="text-sm font-semibold text-slate-900">{warga.bansos.length} program</dd>
              </div>
            </div>
          </dl>
        </div>
      </header>

      {/* Keterangan khusus: meninggal */}
      {warga.statusWarga === 'MENINGGAL' && (
        <section className="rounded-2xl bg-slate-900 p-5 sm:p-6 text-white shadow-sm" aria-label="Informasi warga meninggal dunia">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <AlertCircle className="h-5 w-5 text-rose-300" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Warga ini telah meninggal dunia</h2>
              <p className="text-sm text-slate-400">Data dipertahankan sebagai arsip desa.</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-slate-400">Tanggal meninggal</dt>
                <dd className="font-medium">{tglMeninggalFormatted}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HeartPulse className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-slate-400">Sebab / keterangan</dt>
                <dd className="font-medium">{warga.sebabMeninggal || '-'}</dd>
              </div>
            </div>
          </dl>
        </section>
      )}

      {/* Keterangan khusus: pindah domisili */}
      {warga.statusWarga === 'PINDAH' && (
        <section className="rounded-2xl bg-amber-50 p-5 sm:p-6 ring-1 ring-amber-200" aria-label="Informasi pindah domisili">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Info className="h-5 w-5 text-amber-700" />
            </span>
            <h2 className="text-base font-semibold text-amber-950">Warga ini telah pindah domisili</h2>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-amber-200 pt-4 text-sm md:grid-cols-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-amber-700" />
              <div>
                <dt className="text-amber-800">Tanggal pindah</dt>
                <dd className="font-medium text-amber-950">{tglPindahFormatted}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Navigation className="mt-0.5 h-4 w-4 text-amber-700" />
              <div>
                <dt className="text-amber-800">Alamat tujuan</dt>
                <dd className="font-medium text-amber-950">{warga.alamatTujuan || '-'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 h-4 w-4 text-amber-700" />
              <div>
                <dt className="text-amber-800">Alasan pindah</dt>
                <dd className="font-medium text-amber-950">{warga.alasanPindah || 'Pindah Domisili'}</dd>
              </div>
            </div>
          </dl>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Kolom utama */}
        <div className="space-y-6 lg:col-span-2">
          {/* Identitas pribadi */}
          <section className={`${cardClass} p-6`}>
            <SectionTitle
              icon={UserRound}
              tone="bg-blue-50 text-blue-600"
              title="Identitas pribadi"
              desc="Data diri sesuai dokumen kependudukan."
            />
            <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field icon={Cake} label="Tempat, tanggal lahir">
                {warga.tempatLahir ? `${formatTitleCase(warga.tempatLahir)}, ` : ''}
                {tglLahirFormatted}
              </Field>
              <Field icon={BookOpen} label="Agama">
                {formatTitleCase(warga.agama)}
              </Field>
              <Field icon={HeartHandshake} label="Status perkawinan">
                {formatTitleCase(warga.statusPerkawinan)}
              </Field>
              <Field icon={Briefcase} label="Pekerjaan">
                {formatTitleCase(warga.pekerjaan)}
              </Field>
              <Field icon={Network} label="Hubungan keluarga">
                {formatTitleCase(warga.hubunganKeluarga)}
              </Field>
            </dl>
          </section>

          {/* Bantuan sosial */}
          <section className={cardClass}>
            <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <SectionTitle
                icon={Gift}
                tone="bg-violet-50 text-violet-600"
                title="Bantuan sosial"
                desc="Program bantuan pemerintah atau desa yang diterima."
              />
              {canEditBansos && <BansosFormModal actionServer={handleBansosAction} />}
            </div>

            {warga.bansos.length === 0 ? (
              <div className="mx-6 mb-6 flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                  <Gift className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-slate-900">Belum ada bansos tercatat</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Gunakan tombol <strong className="font-semibold text-slate-700">Tambah Bantuan</strong> untuk
                  mencatat bantuan pertama warga ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-xs text-slate-500">
                      <th className="px-6 py-3 font-medium">Program</th>
                      <th className="px-4 py-3 font-medium">Periode</th>
                      <th className="px-4 py-3 font-medium">Nominal</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Catatan</th>
                      <th className="px-6 py-3 text-center font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warga.bansos.map((b) => (
                      <tr key={b.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-6 py-4 font-medium text-slate-900">{b.program}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">{b.periode || '-'}</td>
                        <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                          {b.nominal ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                              <Banknote className="h-4 w-4" />
                              Rp {Number(b.nominal).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-400">Non-tunai / layanan</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              b.status === 'AKTIF'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                : 'bg-slate-100 text-slate-700 ring-slate-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${b.status === 'AKTIF' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500">{b.catatan || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          {canEditBansos ? (
                            <DeleteBansosButton bansosId={b.id} actionServer={handleBansosAction} />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Kolom samping */}
        <aside className="space-y-6">
          {/* Kartu keluarga & wilayah */}
          <section className={`${cardClass} p-6`}>
            <SectionTitle icon={MapPinned} tone="bg-teal-50 text-teal-600" title="Kartu keluarga & wilayah" />
            <dl className="mt-6 space-y-5">
              <Field icon={CreditCard} label="Nomor KK" mono>
                <span className="text-blue-700">{warga.kk?.noKk || '-'}</span>
              </Field>
              <Field icon={MapPin} label="Wilayah dusun">
                {namaDusun}
              </Field>
              <Field icon={Home} label="Alamat rumah">
                {formatTitleCase(warga.kk?.alamat || 'Desa Hulu Pancur Batu')}
              </Field>
            </dl>
          </section>

          {/* Anggota keluarga */}
          {warga.kk && warga.kk.anggota.length > 0 && (
            <section className={`${cardClass} p-3`}>
              <div className="p-3">
                <SectionTitle
                  icon={Users}
                  tone="bg-sky-50 text-sky-600"
                  title={`Anggota keluarga (${warga.kk.anggota.length})`}
                  desc={`No. KK ${warga.kk.noKk}`}
                />
              </div>
              <ul className="space-y-1">
                {warga.kk.anggota.map((member) => {
                  const isCurrent = member.id === warga.id
                  const memberLaki = member.jenisKelamin === 'LAKI_LAKI'
                  const MemberGender = memberLaki ? Mars : Venus
                  return (
                    <li key={member.id}>
                      <Link
                        href={`/dashboard/warga/${member.id}`}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                          isCurrent ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            memberLaki ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                          }`}
                          aria-hidden="true"
                        >
                          {getInitials(member.nama)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-900">
                              {formatTitleCase(member.nama)}
                            </span>
                            {isCurrent && (
                              <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
                                Warga ini
                              </span>
                            )}
                          </span>
                          <span className="block font-mono text-xs tabular-nums text-slate-500">{member.nik}</span>
                        </span>
                        <MemberGender
                          className={`h-4 w-4 shrink-0 ${memberLaki ? 'text-sky-500' : 'text-rose-400'}`}
                          aria-label={memberLaki ? 'Laki-laki' : 'Perempuan'}
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}