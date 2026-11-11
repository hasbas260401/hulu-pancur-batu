"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  MotionConfig,
  motion,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  FileCheck2,
  HandHeart,
  Home,
  Landmark,
  MapPin,
  Mail,
  Megaphone,
  MessageSquareWarning,
  Phone,
  Sprout,
  Trees,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import Navbar from "@/components/Navbar";

/* -------------------------------------------------------------------------- */
/*  Font                                                                      */
/*  Judul memakai --font-display (Fraunces, didaftarkan di layout.tsx).       */
/*  Teks isi memakai Geist Sans yang sudah ada di layout.                     */
/* -------------------------------------------------------------------------- */

const HEADING = "font-[family-name:var(--font-display)] tracking-tight";

/* -------------------------------------------------------------------------- */
/*  Data (ganti dengan data desa Anda atau ambil dari CMS/API)                */
/* -------------------------------------------------------------------------- */

const VILLAGE = {
  name: "Desa Hulu Pancur Batu",
  region: "Kec. Pancur Batu, Kab. Deli Serdang",
  tagline: "Desa yang terbuka untuk warganya.",
  address: "Kantor Kepala Desa Hulu, Kec. Pancur Batu, Kab. Deli Serdang, Sumatera Utara",
  phone: "0812-0000-0000",
  email: "info@hulupancurbatu.desa.id",
  emergency: [
    { label: "Kepala Desa", number: "0812-0000-0001" },
    { label: "Linmas / Keamanan", number: "0812-0000-0002" },
    { label: "Ambulans Desa", number: "0812-0000-0003" },
  ],
  hours: [
    { day: "Senin sampai Kamis", time: "08.00 - 15.00" },
    { day: "Jumat", time: "08.00 - 11.30" },
    { day: "Sabtu dan Minggu", time: "Tutup" },
  ],
};

/*
  Bentuknya sama dengan prop `setting` di Navbar.
  Jika data ini dari database, ambil di server component lalu kirim sebagai prop.
*/
const SETTING = {
  namaDesa: VILLAGE.name,
  sloganDesa: VILLAGE.tagline,
  logoDesa: "/logo-desa.png" as string | null,
};

const QUICK_FACTS: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Trees, label: "Luas wilayah", value: "12,4 km²" },
  { icon: Users, label: "Jumlah penduduk", value: "4.328 jiwa" },
  { icon: Home, label: "Jumlah dusun", value: "5 dusun" },
];

const SERVICES: {
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
}[] = [
  {
    icon: FileCheck2,
    title: "Surat keterangan online",
    desc: "Ajukan surat domisili, usaha, atau tidak mampu dari rumah. Ambil hasilnya di kantor desa.",
    cta: "Ajukan surat",
  },
  {
    icon: MessageSquareWarning,
    title: "Lapor aduan",
    desc: "Sampaikan jalan rusak, lampu mati, atau masalah lingkungan. Anda bisa memantau tindak lanjutnya.",
    cta: "Buat laporan",
  },
  {
    icon: HandHeart,
    title: "Program bantuan",
    desc: "Cek apakah Anda terdaftar sebagai penerima BLT, PKH, atau bantuan desa lainnya.",
    cta: "Cek penerima",
  },
  {
    icon: Landmark,
    title: "Transparansi dana",
    desc: "Lihat rencana dan realisasi APBDes, lengkap dengan proyek yang sedang berjalan.",
    cta: "Lihat anggaran",
  },
];

type NewsCategory = "Pengumuman" | "Kegiatan" | "Pembangunan";

const NEWS: {
  category: NewsCategory;
  date: string;
  title: string;
  excerpt: string;
  icon: LucideIcon;
}[] = [
  {
    category: "Pengumuman",
    date: "10 November 2026",
    title: "Pembayaran PBB-P2 dibuka sampai 30 November",
    excerpt:
      "Warga dapat membayar di kantor desa setiap jam layanan. Bawa SPPT tahun lalu atau tunjukkan NOP dari ponsel.",
    icon: Megaphone,
  },
  {
    category: "Kegiatan",
    date: "7 November 2026",
    title: "Gotong royong bersihkan parit di Dusun III dan IV",
    excerpt:
      "Sekitar 120 warga ikut membersihkan 2,5 km parit menjelang musim hujan. Kegiatan berikutnya dijadwalkan di Dusun I.",
    icon: Sprout,
  },
  {
    category: "Pembangunan",
    date: "3 November 2026",
    title: "Pengaspalan jalan usaha tani tahap dua mulai dikerjakan",
    excerpt:
      "Proyek sepanjang 1,8 km ini dibiayai Dana Desa dan ditargetkan selesai akhir Desember.",
    icon: Landmark,
  },
];

const CATEGORY_STYLE: Record<NewsCategory, string> = {
  Pengumuman: "bg-amber-50 text-amber-800 ring-amber-200",
  Kegiatan: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Pembangunan: "bg-slate-100 text-slate-700 ring-slate-200",
};

const BUDGET_SUMMARY = [
  { label: "Pendapatan", target: "Rp 1,92 M", realized: "Rp 1,41 M", pct: 73 },
  { label: "Belanja", target: "Rp 1,92 M", realized: "Rp 1,18 M", pct: 61 },
];

const BUDGET_SPLIT = [
  { label: "Pembangunan desa", pct: 38, amount: "Rp 730 jt" },
  { label: "Penyelenggaraan pemerintahan", pct: 22, amount: "Rp 422 jt" },
  { label: "Pemberdayaan masyarakat", pct: 18, amount: "Rp 346 jt" },
  { label: "Pembinaan kemasyarakatan", pct: 14, amount: "Rp 269 jt" },
  { label: "Penanggulangan bencana dan darurat", pct: 8, amount: "Rp 153 jt" },
];

const POPULATION = {
  total: "4.328",
  households: "1.214",
  male: 2151,
  female: 2177,
};

/* -------------------------------------------------------------------------- */
/*  Util kecil                                                                */
/* -------------------------------------------------------------------------- */

/*
  Tahun dihitung di browser (useEffect), bukan saat render, supaya tidak
  memicu error "new Date() in a Client Component" di Next.js 16.
  Nilai awal dipakai saat prerender, lalu diganti tahun sebenarnya.
*/
function CurrentYear({ fallback = 2026 }: { fallback?: number }) {
  const [year, setYear] = useState(fallback);
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return <>{year}</>;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <h2 className={`${HEADING} text-3xl font-semibold text-slate-900 sm:text-4xl`}>
          {title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p>
      </div>
      {action && (
        <a
          href={action.href}
          className={`group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 ${FOCUS} rounded-md`}
        >
          {action.label}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      )}
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Notice bar                                                                */
/* -------------------------------------------------------------------------- */

function NoticeBar() {
  return (
    <div className="border-b border-amber-200/80 bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm text-amber-900 sm:px-6">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
        <p className="truncate">
          <span className="font-semibold">Penting:</span> PBB-P2 dibuka sampai 30
          November 2026.
        </p>
        <a
          href="#berita"
          className={`ml-auto hidden shrink-0 font-semibold underline underline-offset-4 hover:text-amber-950 sm:inline ${FOCUS} rounded`}
        >
          Selengkapnya
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function Hero() {
  return (
    <section id="beranda" className="scroll-mt-24 bg-slate-50">
      <motion.div
        variants={heroContainer}
        initial="hidden"
        animate="show"
        className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14 lg:py-24"
      >
        <div>
          <motion.p
            variants={heroItem}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-medium text-emerald-800 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            Website resmi {VILLAGE.name}
          </motion.p>

          <motion.h1
            variants={heroItem}
            className={`${HEADING} mt-5 text-4xl font-semibold leading-[1.1] text-slate-900 sm:text-5xl lg:text-6xl`}
          >
            Urusan desa, lebih dekat dari rumah Anda.
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
          >
            {VILLAGE.tagline} Ajukan surat, sampaikan aduan, dan pantau
            penggunaan dana desa tanpa harus antre di kantor.
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#layanan"
              className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg active:translate-y-0 active:scale-[0.98] ${FOCUS}`}
            >
              Buka layanan publik
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#berita"
              className={`group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-800 hover:shadow-md active:translate-y-0 active:scale-[0.98] ${FOCUS}`}
            >
              <MapPin className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" aria-hidden />
              Jelajahi desa
            </a>
          </motion.div>
        </div>

        {/* Papan informasi desa */}
        <motion.aside
          variants={heroItem}
          aria-label="Informasi singkat desa"
          className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-md"
        >
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <h2 className={`${HEADING} text-lg font-semibold text-slate-900`}>
              Sekilas {VILLAGE.name}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Kantor buka hari ini
            </span>
          </div>

          <dl className="divide-y divide-slate-100">
            {QUICK_FACTS.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="group flex items-center gap-4 rounded-xl px-4 py-4 transition-colors duration-300 hover:bg-emerald-50/60"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className={`${HEADING} text-xl font-semibold text-slate-900`}>
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <p className="mx-2 mb-2 mt-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Jam layanan: Senin sampai Kamis 08.00 - 15.00, Jumat 08.00 - 11.30.
          </p>
        </motion.aside>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layanan                                                                   */
/* -------------------------------------------------------------------------- */

function Services() {
  return (
    <section id="layanan" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Layanan mandiri untuk warga"
          description="Empat layanan yang paling sering dipakai. Semuanya bisa diakses dari ponsel, kapan saja."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, desc, cta }, i) => (
            <Reveal key={title} delay={i * 0.08} className="h-full">
              <a
                href="#"
                className={`group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg ${FOCUS}`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className={`${HEADING} mt-5 text-lg font-semibold text-slate-900`}>
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {desc}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Berita & pengumuman                                                       */
/* -------------------------------------------------------------------------- */

function NewsCard({ item }: { item: (typeof NEWS)[number] }) {
  const Icon = item.icon;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/*
        Placeholder gambar. Ganti dengan next/image, contoh:
        <Image src={item.image} alt="" fill className="object-cover" sizes="(min-width:1024px) 33vw, 100vw" />
      */}
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <div className="absolute inset-0 grid place-items-center text-slate-300 transition-transform duration-500 group-hover:scale-110">
          <Icon className="h-14 w-14" strokeWidth={1.25} aria-hidden />
        </div>
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CATEGORY_STYLE[item.category]}`}
        >
          {item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-4 w-4" aria-hidden />
          <time>{item.date}</time>
        </p>
        <h3 className={`${HEADING} mt-2 text-lg font-semibold leading-snug text-slate-900 transition-colors duration-300 group-hover:text-emerald-800`}>
          {item.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
          {item.excerpt}
        </p>
        <a
          href="#"
          className={`mt-4 inline-flex items-center gap-1.5 self-start rounded-md text-sm font-semibold text-emerald-700 hover:text-emerald-800 ${FOCUS}`}
        >
          Baca selengkapnya
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </a>
      </div>
    </article>
  );
}

function News() {
  return (
    <section id="berita" className="scroll-mt-24 bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Berita dan pengumuman terbaru"
          description="Kabar dari balai desa, jadwal kegiatan, dan perkembangan pembangunan."
          action={{ label: "Lihat semua berita", href: "#" }}
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {NEWS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} className="h-full">
              <NewsCard item={item} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Statistik & transparansi anggaran                                         */
/* -------------------------------------------------------------------------- */

function ProgressBar({ pct, tone = "emerald" }: { pct: number; tone?: "emerald" | "teal" }) {
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-600" : "bg-teal-600"}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function Transparency() {
  const maleShare = Math.round(
    (POPULATION.male / (POPULATION.male + POPULATION.female)) * 100
  );

  return (
    <section id="transparansi" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title="Statistik dan transparansi anggaran"
          description="Angka ringkas kependudukan dan realisasi APBDes tahun 2026. Data contoh, perbarui setiap bulan."
          action={{ label: "Unduh laporan APBDes", href: "#" }}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* APBDes */}
          <Reveal className="lg:col-span-3">
            <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                  <Wallet className="h-5 w-5" aria-hidden />
                </span>
                <h3 className={`${HEADING} text-xl font-semibold text-slate-900`}>
                  APBDes 2026
                </h3>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {BUDGET_SUMMARY.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium text-slate-600">{b.label}</p>
                      <p className="text-sm font-semibold text-slate-900">{b.pct}%</p>
                    </div>
                    <div className="mt-2">
                      <ProgressBar pct={b.pct} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Terealisasi {b.realized} dari {b.target}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-900">
                  Belanja menurut bidang
                </h4>
                <ul className="mt-4 space-y-4">
                  {BUDGET_SPLIT.map((row) => (
                    <li key={row.label}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-slate-700">{row.label}</span>
                        <span className="shrink-0 font-semibold text-slate-900">
                          {row.amount}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar pct={row.pct * 2.2} tone="teal" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Rincian proyek dan nilai kontrak tersedia di papan informasi
                kantor desa dan dapat diminta secara tertulis.
              </p>
            </div>
          </Reveal>

          {/* Kependudukan */}
          <div className="grid gap-6 lg:col-span-2">
            <Reveal delay={0.08}>
              <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    <Users className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className={`${HEADING} text-xl font-semibold text-slate-900`}>
                    Kependudukan
                  </h3>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-sm text-slate-500">Penduduk</dt>
                    <dd className={`${HEADING} mt-1 text-2xl font-semibold text-slate-900`}>
                      {POPULATION.total}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-sm text-slate-500">Kepala keluarga</dt>
                    <dd className={`${HEADING} mt-1 text-2xl font-semibold text-slate-900`}>
                      {POPULATION.households}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Laki-laki {POPULATION.male.toLocaleString("id-ID")}</span>
                    <span>Perempuan {POPULATION.female.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-teal-600">
                    <div
                      className="h-full bg-emerald-600"
                      style={{ width: `${maleShare}%` }}
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-900 p-6 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
                <h3 className={`${HEADING} text-xl font-semibold`}>
                  Ada pertanyaan soal anggaran?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Warga berhak meminta penjelasan. Datang ke kantor desa atau
                  tulis pertanyaan Anda lewat layanan aduan.
                </p>
                <a
                  href="#layanan"
                  className="group mt-5 inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-300 hover:bg-emerald-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Tulis pertanyaan
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer id="kontak" className="scroll-mt-24 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1">
              {SETTING.logoDesa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={SETTING.logoDesa} alt="" className="h-full w-full object-contain" />
              ) : (
                <Sprout className="h-5 w-5 text-emerald-700" aria-hidden />
              )}
            </span>
            <span className={`${HEADING} text-lg font-semibold text-white`}>
              {SETTING.namaDesa}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Pemerintah {VILLAGE.name}, {VILLAGE.region}. Melayani warga dengan
            terbuka dan bertanggung jawab.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Kantor desa</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <span>{VILLAGE.address}</span>
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <a href={`tel:${VILLAGE.phone.replace(/-/g, "")}`} className="hover:text-white">
                {VILLAGE.phone}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <a href={`mailto:${VILLAGE.email}`} className="break-all hover:text-white">
                {VILLAGE.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Jam operasional</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {VILLAGE.hours.map((h) => (
              <li key={h.day} className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                <span>
                  <span className="block text-slate-400">{h.day}</span>
                  <span className="font-medium text-slate-200">{h.time}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Kontak darurat</h3>
          <ul className="mt-4 space-y-2.5">
            {VILLAGE.emergency.map((c) => (
              <li key={c.label}>
                <a
                  href={`tel:${c.number.replace(/-/g, "")}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-700 px-4 py-3 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <span>
                    <span className="block text-slate-400">{c.label}</span>
                    <span className="font-semibold text-white">{c.number}</span>
                  </span>
                  <Phone className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-12" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © <CurrentYear /> Pemerintah {VILLAGE.name}. Seluruh hak dilindungi.
          </p>
          <p>Konten situs ini dikelola oleh operator desa.</p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halaman                                                                   */
/* -------------------------------------------------------------------------- */

export default function Page() {
  return (
    // reducedMotion="user": pengunjung yang mengaktifkan "kurangi gerakan"
    // di sistemnya tidak akan melihat animasi geser. Aman untuk SSR.
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)] text-slate-600">
      <Navbar setting={SETTING} />
      {/* Navbar fixed setinggi 76px */}
      <main className="pt-[76px]">
        <NoticeBar />
        <Hero />
        <Services />
        <News />
        <Transparency />
      </main>
      <Footer />
    </div>
    </MotionConfig>
  );
}