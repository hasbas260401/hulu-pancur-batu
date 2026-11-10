import type { Metadata } from 'next'
import Link from 'next/link'
import { PrismaClient } from '@prisma/client'
import { Suspense } from 'react'
import MobileMenu from '@/components/MobileMenu'
import CounterCard from '@/components/CounterCard'
import Navbar from '@/components/Navbar'
import { 
  Building2, 
  Sparkles, 
  Search, 
  BookOpen, 
  Target, 
  Rocket, 
  UserCheck, 
  Video, 
  Megaphone, 
  MapPin,
  ShieldCheck 
} from 'lucide-react'

const prisma = new PrismaClient()

// 1. Fungsi dinamis Next.js untuk mengambil logo desa dari database sebagai favicon tab browser
export async function generateMetadata(): Promise<Metadata> {
  const setting = await prisma.webSettings.findFirst().catch(() => null)
  const logoUrl = setting?.logoDesa || '/favicon.ico'

  return {
    title: `${setting?.namaDesa || 'Desa Hulu Pancur Batu'} | Sistem Informasi Desa`,
    description: setting?.heroDescription || 'Portal resmi administrasi kependudukan dan transparansi penyaluran bantuan sosial.',
    icons: {
      icon: logoUrl,
    },
  }
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-medium">Memuat Portal Desa...</div>}>
      <LandingContent />
    </Suspense>
  )
}

async function LandingContent() {
  const totalBansos = await prisma.bansos.count({ where: { status: 'AKTIF' } })
  const totalWarga = await prisma.warga.count()
  const totalKk = await prisma.kartuKeluarga.count()

  let setting = await prisma.webSettings.findFirst()
  if (!setting) {
    setting = {
      id: 'default',
      namaDesa: 'Desa Hulu Pancur Batu',
      sloganDesa: 'Sistem Informasi Desa',
      logoDesa: null,
      heroTitle: 'Transparan, Akuntabel, & Melayani Sepenuh Hati.',
      heroDescription: 'Website resmi administrasi kependudukan dan transparansi penyaluran bantuan sosial Desa Hulu Pancur Batu untuk mewujudkan tata kelola pemerintahan desa yang modern.',
      namaKades: 'Kepala Desa Hulu Pancur Batu',
      periodeKades: 'Periode 2023 - 2029',
      fotoKades: null,
      visiDesa: 'Terwujudnya Desa Hulu Pancur Batu yang Mandiri, Religius, Sejahtera, Transparan, dan Berbasis Teknologi Informasi dalam Pelayanan Publik.',
      misiDesa: 'Meningkatkan kualitas pelayanan administrasi kependudukan yang cepat, transparan, dan bebas pungutan liar.\nMengoptimalkan penyaluran bantuan sosial agar tepat sasaran kepada warga yang berhak secara adil.\nMemajukan infrastruktur desa serta menggerakkan ekonomi kerakyatan berbasis potensi lokal.',
      youtubeUrl: 'https://www.youtube.com/embed/VUZlZm5V9R8',
      updatedAt: new Date(),
    }
  }

  // Pecah teks misi berdasarkan baris baru (enter) secara otomatis
  const listMisi = setting.misiDesa ? setting.misiDesa.split('\n').filter(m => m.trim() !== '') : []

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
    <div className="min-h-screen overflow-x-clip bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* NAVBAR DINAMIS (Transparan di atas, kaca buram saat di-scroll) */}
      <Navbar setting={setting} />

      {/* HERO SECTION (Diberi padding atas pt-28/pt-36 agar tidak tertutup navbar fixed) */}
      <section id="beranda" className="scroll-mt-24 relative overflow-hidden bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white min-h-screen flex items-center pt-24 pb-16">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Selamat Datang di Portal Resmi Desa
              </span>
              <h1 className="text-[1.75rem] sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                {setting.heroTitle}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
                {setting.heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href="#transparansi"
                  className="w-full sm:w-auto justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
                >
                  <Search className="w-4 h-4" /> Cek Penyaluran Bansos
                </a>
                <a
                  href="#profil"
                  className="w-full sm:w-auto text-center px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm rounded-xl backdrop-blur-md transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" /> Profil Kepala Desa & Visi Misi
                </a>
              </div>
            </div>

            {/* KARTU STATISTIK */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <CounterCard endValue={totalWarga} label="Total Jiwa Terdaftar" colorClass="text-blue-400" />
              <CounterCard endValue={totalKk} label="Kepala Keluarga (KK)" colorClass="text-emerald-400" />
              <CounterCard endValue={totalBansos} label="Penerima Bantuan Sosial Aktif" colorClass="text-amber-400" />
            </div>
          </div>
        </div>
      </section>

      {/* PROFIL KEPALA DESA & VISI MISI DINAMIS */}
      <section id="profil" className="scroll-mt-16 sm:scroll-mt-20 py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Kepemimpinan Desa</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Profil Kepala Desa & Arah Kebijakan</h3>
            <p className="text-sm text-slate-500">Mengenal lebih dekat pimpinan desa serta visi dan misi pembangunan {setting.namaDesa}.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Foto Kepala Desa */}
            <div className="lg:col-span-5 w-full max-w-sm mx-auto lg:max-w-none">
              <div className="relative bg-gradient-to-tr from-blue-600 to-indigo-700 p-2 rounded-3xl shadow-xl">
                <div className="bg-slate-200 aspect-[4/5] rounded-2xl overflow-hidden flex items-center justify-center relative">
                  {setting.fotoKades ? (
                    <img src={setting.fotoKades} alt={setting.namaKades} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <UserCheck className="w-10 h-10 sm:w-12 sm:h-12" />
                      </div>
                      <div className="font-bold text-slate-700 text-lg">Kepala Desa</div>
                      <div className="text-xs text-slate-500">{setting.namaDesa}</div>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6 bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-lg border border-slate-100 text-center">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">{setting.namaKades}</h4>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">{setting.periodeKades}</p>
                </div>
              </div>
            </div>

            {/* Visi & Misi Otomatis */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-8">
              <div className="bg-slate-50 p-5 sm:p-8 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <Target className="w-5 h-5" />
                  </div>
                  <span>Visi {setting.namaDesa}</span>
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed italic bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  &ldquo;{setting.visiDesa}&rdquo;
                </p>
              </div>

              <div className="bg-slate-50 p-5 sm:p-8 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <span>Misi Desa</span>
                </h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  {listMisi.map((misi, index) => (
                    <li key={index} className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                        {index + 1}
                      </span>
                      <span>{misi}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSPARANSI BANSOS */}
      <section id="transparansi" className="scroll-mt-16 sm:scroll-mt-20 py-12 sm:py-20 bg-slate-100 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          <div className="space-y-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Keterbukaan Informasi Publik</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Transparansi Penyaluran Bantuan Sosial</h3>
            <p className="text-sm text-slate-500">Daftar penerima bantuan pemerintah yang disalurkan secara transparan di desa.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {daftarBansosPublik.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                Belum ada data penyaluran bantuan sosial yang tercatat.
              </div>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-slate-100">
                  {daftarBansosPublik.map((b) => (
                    <li key={b.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm break-words">{b.warga?.nama || 'Warga Terdaftar'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {b.warga?.dusun?.nama || setting.namaDesa}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> {b.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs pt-1">
                        <span className="font-semibold text-blue-600">{b.program}</span>
                        <span className="text-slate-500">Periode: {b.periode || '-'}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-xs">
                      <tr>
                        <th className="px-6 py-4">Nama Warga</th>
                        <th className="px-6 py-4">Wilayah Dusun</th>
                        <th className="px-6 py-4">Program Bansos</th>
                        <th className="px-6 py-4">Periode</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daftarBansosPublik.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-bold text-slate-900">{b.warga?.nama || 'Warga Terdaftar'}</td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {b.warga?.dusun?.nama || setting.namaDesa}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-blue-600">{b.program}</td>
                          <td className="px-6 py-4 text-slate-600">{b.periode || '-'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> {b.status}
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

      {/* KEGIATAN DESA & VIDEO YOUTUBE */}
      <section id="kegiatan" className="scroll-mt-16 sm:scroll-mt-20 py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Media & Kegiatan Desa</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Video Profil & Dokumentasi Kegiatan</h3>
            <p className="text-sm text-slate-500">Saksikan video kegiatan dan suasana perkembangan pembangunan di {setting.namaDesa}.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900">
                <iframe
                  suppressHydrationWarning
                  className="w-full h-full"
                  src={setting.youtubeUrl}
                  title={`Video Profil ${setting.namaDesa}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full">
                  <Video className="w-3.5 h-3.5" /> Video Resmi
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-slate-900">Pembangunan & Potensi Desa</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Video dokumentasi ini menampilkan potret kebersamaan warga, gotong royong, serta pemanfaatan teknologi digital dalam pelayanan administrasi pemerintahan desa.
                </p>
              </div>

              <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">
                  <Megaphone className="w-3.5 h-3.5" /> Informasi Layanan
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-slate-900">Akses Cepat Warga</h4>
                <p className="text-sm text-slate-600">
                  Bagi perangkat desa atau Kepala Dusun yang ingin mengelola data kependudukan dan surat-menyurat, silakan masuk melalui tombol login di atas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 sm:py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {setting.logoDesa ? (
              <img src={setting.logoDesa} alt="Logo Footer" className="w-10 h-10 object-contain rounded-xl shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="block font-bold text-white text-sm">{setting.namaDesa}</span>
              <span className="block text-xs text-slate-500">Kecamatan Pancur Batu, Kabupaten Deli Serdang</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Pemerintah {setting.namaDesa}. Hak Cipta Dilindungi.
          </p>
        </div>
      </footer>
    </div>
  )
}