
import type { Metadata } from 'next'
import { PrismaClient } from '@prisma/client'
import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import CounterCard from '@/components/CounterCard'
import {
  Building2,
  Target,
  Rocket,
  UserRound,
  MapPin,
  ShieldCheck,
  Video,
  ArrowRight,
  Users,
  FileText,
  Home,
  Info,
  ClipboardList,
  Landmark,
  ExternalLink,
} from 'lucide-react'

const prisma = new PrismaClient()

export async function generateMetadata(): Promise<Metadata> {
  const setting = await prisma.webSettings.findFirst().catch(() => null)

  return {
    title: `${setting?.namaDesa || 'Desa Hulu Pancur Batu'} | Sistem Informasi Desa`,
    description:
      setting?.heroDescription ||
      'Portal resmi administrasi Desa Hulu Pancur Batu.',
    icons: {
      icon: setting?.logoDesa || '/favicon.ico',
    },
  }
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-600">
          Memuat halaman desa...
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  )
}

async function LandingContent() {
  const [totalWarga, totalKK, totalBansos] = await Promise.all([
    prisma.warga.count(),
    prisma.kartuKeluarga.count(),
    prisma.bansos.count({ where: { status: 'AKTIF' } }),
  ])

  let setting = await prisma.webSettings.findFirst()

  if (!setting) {
    setting = {
      id: 'default',
      namaDesa: 'Desa Hulu Pancur Batu',
      sloganDesa: 'Sistem Informasi Desa',
      logoDesa: null,
      heroTitle: 'Membangun Desa, Melayani Masyarakat.',
      heroDescription:
        'Selamat datang di portal resmi Desa Hulu Pancur Batu. Dapatkan informasi pemerintahan, pelayanan administrasi, dan transparansi pembangunan desa.',
      namaKades: 'Kepala Desa Hulu Pancur Batu',
      periodeKades: 'Periode 2023 - 2029',
      fotoKades: null,
      visiDesa:
        'Terwujudnya Desa Hulu Pancur Batu yang Mandiri, Religius, Sejahtera, Transparan, dan Berbasis Teknologi Informasi dalam Pelayanan Publik.',
      misiDesa:
        'Meningkatkan kualitas pelayanan administrasi kependudukan yang cepat, transparan, dan bebas pungutan liar.\nMengoptimalkan penyaluran bantuan sosial agar tepat sasaran kepada warga yang berhak secara adil.\nMemajukan infrastruktur desa serta menggerakkan ekonomi kerakyatan berbasis potensi lokal.',
      youtubeUrl: 'https://www.youtube.com/embed/VUZlZm5V9R8',
      updatedAt: new Date(),
    }
  }

  const listMisi = setting.misiDesa
    ? setting.misiDesa.split('\n').filter((m) => m.trim() !== '')
    : []

  const daftarBansosPublik = await prisma.bansos.findMany({
    where: { status: 'AKTIF' },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      warga: {
        include: { dusun: true },
      },
    },
  })

  return (
    <main className="min-h-screen bg-white text-slate-800 overflow-x-clip">

      <Navbar setting={setting} />

      {/* HERO */}
      <section
        id="beranda"
        className="scroll-mt-20 pt-32 pb-20 lg:pt-40 lg:pb-28 bg-[#F4F7FB]"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">

          <div className="grid lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-7">

              <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold mb-6">
                <span className="w-8 h-[2px] bg-blue-700" />
                PEMERINTAH DESA
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-[58px] font-bold text-[#102B50] leading-[1.12] tracking-tight">
                {setting.heroTitle}
              </h2>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                {setting.heroDescription}
              </p>

              <div className="flex flex-wrap gap-3 mt-9">

                <a
                  href="#transparansi"
                  className="inline-flex items-center gap-2 bg-[#2563B8] hover:bg-blue-800 text-white px-6 py-3.5 rounded-lg font-semibold text-sm transition"
                >
                  Lihat Transparansi
                  <ArrowRight size={17} />
                </a>

                <a
                  href="#profil"
                  className="inline-flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-[#102B50] px-6 py-3.5 rounded-lg font-semibold text-sm transition"
                >
                  Profil Desa
                </a>

              </div>

              <div className="mt-12 pt-8 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium">
                  MELAYANI MASYARAKAT DENGAN TRANSPARAN DAN PROFESIONAL
                </p>
              </div>

            </div>

            {/* STATISTIK */}
            <div className="lg:col-span-5">

              <div className="bg-[#102B50] rounded-2xl p-7 sm:p-9 text-white">

                <div className="mb-7">
                  <p className="text-blue-200 text-sm font-medium">
                    Data Administrasi
                  </p>
                  <h3 className="text-2xl font-bold mt-1">
                    Statistik Desa
                  </h3>
                  <p className="text-sm text-slate-300 mt-2">
                    Informasi ringkas kependudukan dan bantuan sosial.
                  </p>
                </div>

                <div className="divide-y divide-white/15">

                  <div className="py-5 first:pt-0">
                    <CounterCard
                      endValue={totalWarga}
                      label="Total Penduduk Terdaftar"
                      colorClass="text-white"
                    />
                  </div>

                  <div className="py-5">
                    <CounterCard
                      endValue={totalKK}
                      label="Kartu Keluarga"
                      colorClass="text-white"
                    />
                  </div>

                  <div className="py-5 last:pb-0">
                    <CounterCard
                      endValue={totalBansos}
                      label="Bantuan Sosial Aktif"
                      colorClass="text-white"
                    />
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* PROFIL DESA */}
      <section id="profil" className="scroll-mt-24 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">

          <div className="max-w-2xl mb-14">
            <p className="text-sm font-bold text-blue-700 tracking-wider uppercase">
              Tentang Kami
            </p>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#102B50] mt-3">
              Mengenal Desa Kami Lebih Dekat
            </h2>

            <p className="text-slate-500 mt-4 leading-relaxed">
              Mengenal kepemimpinan, visi, dan arah pembangunan{' '}
              {setting.namaDesa}.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">

            {/* KEPALA DESA */}
            <div className="lg:col-span-4">

              <div className="bg-[#F4F7FB] rounded-2xl overflow-hidden border border-slate-200">

                <div className="aspect-[4/5] bg-[#E5EDF6] flex items-center justify-center">

                  {setting.fotoKades ? (
                    <img
                      src={setting.fotoKades}
                      alt={setting.namaKades}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-blue-800">
                      <UserRound size={76} strokeWidth={1.2} />
                      <p className="mt-3 text-sm font-semibold">
                        Foto Kepala Desa
                      </p>
                    </div>
                  )}

                </div>

                <div className="p-6">
                  <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">
                    Kepala Desa
                  </p>

                  <h3 className="text-xl font-bold text-[#102B50] mt-2">
                    {setting.namaKades}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {setting.periodeKades}
                  </p>
                </div>

              </div>

            </div>

            {/* VISI MISI */}
            <div className="lg:col-span-8 space-y-8">

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                    <Target size={21} />
                  </div>

                  <h3 className="text-xl font-bold text-[#102B50]">
                    Visi Desa
                  </h3>
                </div>

                <div className="border-l-4 border-blue-700 pl-6 py-2">
                  <p className="text-slate-600 leading-relaxed text-base">
                    {setting.visiDesa}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8">

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                    <Rocket size={21} />
                  </div>

                  <h3 className="text-xl font-bold text-[#102B50]">
                    Misi Desa
                  </h3>
                </div>

                <div className="space-y-5">
                  {listMisi.map((misi, index) => (
                    <div key={index} className="flex gap-4">
                      <span className="text-sm font-bold text-blue-700 pt-0.5">
                        0{index + 1}
                      </span>

                      <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                        {misi}
                      </p>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* TRANSPARANSI BANSOS */}
      <section
        id="transparansi"
        className="scroll-mt-24 py-20 bg-[#F4F7FB]"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">

            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">
                Keterbukaan Informasi
              </p>

              <h2 className="text-3xl font-bold text-[#102B50] mt-3">
                Transparansi Bantuan Sosial
              </h2>

              <p className="text-sm text-slate-500 mt-3 max-w-xl">
                Informasi penerima bantuan sosial aktif yang tercatat dalam administrasi desa.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-700 font-semibold">
              <ShieldCheck size={19} />
              Data bantuan aktif
            </div>

          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            {daftarBansosPublik.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="mx-auto text-slate-300" size={36} />
                <p className="text-sm text-slate-500 mt-4">
                  Belum ada data bantuan sosial.
                </p>
              </div>
            ) : (
              <>
                {/* MOBILE */}
                <div className="md:hidden divide-y divide-slate-100">
                  {daftarBansosPublik.map((b) => (
                    <div key={b.id} className="p-5 space-y-3">

                      <div>
                        <p className="font-semibold text-[#102B50]">
                          {b.warga?.nama || 'Warga Terdaftar'}
                        </p>

                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin size={13} />
                          {b.warga?.dusun?.nama || setting.namaDesa}
                        </p>
                      </div>

                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-blue-700 font-semibold">
                          {b.program}
                        </span>

                        <span className="text-slate-500">
                          {b.periode || '-'}
                        </span>
                      </div>

                    </div>
                  ))}
                </div>

                {/* DESKTOP */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">

                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-5 font-semibold">Nama Warga</th>
                        <th className="px-6 py-5 font-semibold">Dusun</th>
                        <th className="px-6 py-5 font-semibold">Program</th>
                        <th className="px-6 py-5 font-semibold">Periode</th>
                        <th className="px-6 py-5 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {daftarBansosPublik.map((b) => (
                        <tr key={b.id} className="hover:bg-blue-50/40 transition-colors">

                          <td className="px-6 py-5 font-semibold text-[#102B50]">
                            {b.warga?.nama || 'Warga Terdaftar'}
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {b.warga?.dusun?.nama || setting.namaDesa}
                          </td>

                          <td className="px-6 py-5 text-blue-700 font-medium">
                            {b.program}
                          </td>

                          <td className="px-6 py-5 text-slate-600">
                            {b.periode || '-'}
                          </td>

                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <ShieldCheck size={15} />
                              {b.status}
                            </span>
                          </td>

                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              </>
            )}

          </div>

        </div>
      </section>

      {/* VIDEO KEGIATAN */}
      <section id="kegiatan" className="scroll-mt-24 py-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">

          <div className="max-w-2xl mb-12">
            <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">
              Dokumentasi Desa
            </p>

            <h2 className="text-3xl font-bold text-[#102B50] mt-3">
              Kegiatan dan Informasi Desa
            </h2>

            <p className="text-slate-500 text-sm mt-4 leading-relaxed">
              Dokumentasi kegiatan, pembangunan, dan perkembangan Desa {setting.namaDesa}.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-center">

            <div className="lg:col-span-7">
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <iframe
                  suppressHydrationWarning
                  className="w-full h-full"
                  src={setting.youtubeUrl}
                  title={`Video Profil ${setting.namaDesa}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-7">

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Video size={21} className="text-blue-700" />
                  <h3 className="font-bold text-[#102B50]">
                    Dokumentasi Kegiatan
                  </h3>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed">
                  Melihat kegiatan masyarakat, pembangunan, dan berbagai aktivitas pemerintahan desa.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-7">
                <div className="flex items-center gap-3 mb-3">
                  <Users size={21} className="text-blue-700" />
                  <h3 className="font-bold text-[#102B50]">
                    Pelayanan Masyarakat
                  </h3>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed">
                  Pemerintah desa berkomitmen memberikan pelayanan administrasi yang mudah, transparan, dan bertanggung jawab.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* FOOTER LENGKAP */}
      <footer className="bg-[#102B50] text-white">

        {/* BAGIAN UTAMA FOOTER */}
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-12">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

            {/* KOLOM 1: IDENTITAS DESA */}
            <div className="lg:col-span-1">

              <div className="flex items-center gap-3 mb-6">

                {setting.logoDesa ? (
                  <img
                    src={setting.logoDesa}
                    alt="Logo Desa"
                    className="w-14 h-14 object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
                    <Building2 size={30} />
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {setting.namaDesa}
                  </h3>

                  <p className="text-xs text-blue-200 mt-1">
                    {setting.sloganDesa || 'Sistem Informasi Desa'}
                  </p>
                </div>

              </div>

              <p className="text-sm text-blue-100/80 leading-relaxed">
                Portal resmi {setting.namaDesa} sebagai sarana informasi
                pemerintahan, pelayanan masyarakat, dan keterbukaan informasi
                publik desa.
              </p>

              <div className="flex items-center gap-2 mt-6 text-blue-200">
                <ShieldCheck size={17} />
                <span className="text-xs font-medium">
                  Melayani dengan transparan dan profesional
                </span>
              </div>

            </div>

            {/* KOLOM 2: NAVIGASI */}
            <div>

              <h3 className="text-base font-bold mb-6">
                Navigasi Cepat
              </h3>

              <ul className="space-y-4">

                <li>
                  <a
                    href="#beranda"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <Home size={16} />
                    Beranda
                  </a>
                </li>

                <li>
                  <a
                    href="#profil"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <Info size={16} />
                    Profil Desa
                  </a>
                </li>

                <li>
                  <a
                    href="#transparansi"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <ShieldCheck size={16} />
                    Transparansi Bansos
                  </a>
                </li>

                <li>
                  <a
                    href="#kegiatan"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <Video size={16} />
                    Kegiatan Desa
                  </a>
                </li>

              </ul>

            </div>

            {/* KOLOM 3: LAYANAN DAN INFORMASI */}
            <div>

              <h3 className="text-base font-bold mb-6">
                Layanan dan Informasi
              </h3>

              <ul className="space-y-4">

                <li>
                  <a
                    href="/login"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <FileText size={16} />
                    Pelayanan Administrasi
                  </a>
                </li>

                <li>
                  <a
                    href="/login"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <ClipboardList size={16} />
                    Pengajuan Surat
                  </a>
                </li>

                <li>
                  <a
                    href="#transparansi"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <Users size={16} />
                    Informasi Bantuan Sosial
                  </a>
                </li>

                <li>
                  <a
                    href="/login"
                    className="flex items-center gap-3 text-sm text-blue-100/80 hover:text-white transition-colors"
                  >
                    <ArrowRight size={16} />
                    Masuk Sistem Desa
                  </a>
                </li>

              </ul>

            </div>

            {/* KOLOM 4: INFORMASI WILAYAH */}
            <div>

              <h3 className="text-base font-bold mb-6">
                Informasi Wilayah
              </h3>

              <div className="space-y-5">

                <div className="flex items-start gap-3">

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                    <MapPin size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Wilayah Desa
                    </p>

                    <p className="text-sm text-blue-100/80 leading-relaxed mt-1">
                      {setting.namaDesa}
                      <br />
                      Kecamatan Pancur Batu
                      <br />
                      Kabupaten Deli Serdang
                      <br />
                      Sumatera Utara, Indonesia
                    </p>
                  </div>

                </div>

                <div className="flex items-start gap-3">

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                    <Landmark size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Pemerintahan Desa
                    </p>

                    <p className="text-sm text-blue-100/80 leading-relaxed mt-1">
                      Portal Informasi Resmi Pemerintah {setting.namaDesa}.
                    </p>
                  </div>

                </div>

                <a
                  href="#beranda"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-200 hover:text-white transition-colors"
                >
                  Kembali ke atas
                  <ArrowRight size={16} className="-rotate-45" />
                </a>

              </div>

            </div>

          </div>

        </div>

        {/* BAGIAN BAWAH FOOTER */}
        <div className="border-t border-white/15">

          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6">

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

              <p className="text-xs text-blue-200 text-center md:text-left">
                © {new Date().getFullYear()} {setting.namaDesa}.
                Hak cipta dilindungi.
              </p>

              <p className="text-xs text-blue-200 text-center">
                Dibangun untuk pelayanan publik yang lebih baik.
              </p>

            </div>

          </div>

        </div>

      </footer>

    </main>
  )
}
