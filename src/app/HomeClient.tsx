"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
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
import { useAlert } from "@/components/ui/alert";
import type {
  FactIcon,
  LandingContent,
  NewsCategory,
  NewsIcon,
  ServiceIcon,
} from "@/lib/landing-content";

/* -------------------------------------------------------------------------- */
/*  Font                                                                      */
/*  Judul memakai --font-display (Fraunces, didaftarkan di layout.tsx).       */
/*  Teks isi memakai Geist Sans yang sudah ada di layout.                     */
/* -------------------------------------------------------------------------- */

const HEADING = "font-[family-name:var(--font-display)] tracking-tight";

/* -------------------------------------------------------------------------- */
/*  Ikon konten dinamis                                                       */
/*  Nilai ikon disimpan sebagai teks di database agar bisa dipilih dari       */
/*  panel admin, lalu dipetakan ke komponen Lucide di sini.                   */
/* -------------------------------------------------------------------------- */

const FACT_ICONS: Record<FactIcon, LucideIcon> = {
  trees: Trees,
  users: Users,
  home: Home,
  wallet: Wallet,
  sprout: Sprout,
};

const SERVICE_ICONS: Record<ServiceIcon, LucideIcon> = {
  file: FileCheck2,
  report: MessageSquareWarning,
  hand: HandHeart,
  landmark: Landmark,
};

const NEWS_ICONS: Record<NewsIcon, LucideIcon> = {
  announcement: Megaphone,
  activity: Sprout,
  development: Landmark,
};

const CATEGORY_STYLE: Record<NewsCategory, string> = {
  Pengumuman: "bg-amber-50 text-amber-800 ring-amber-200",
  Kegiatan: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Pembangunan: "bg-slate-100 text-slate-700 ring-slate-200",
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

function NoticeBar({
  notice,
  prefix,
}: {
  notice: LandingContent["notice"];
  prefix: string;
}) {
  return (
    <div className="border-b border-amber-200/80 bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm text-amber-900 sm:px-6">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
        <p className="truncate">
          <span className="font-semibold">{prefix}</span> {notice.text}
        </p>
        {notice.linkLabel && (
          <a
            href={notice.href || "#berita"}
            className={`ml-auto hidden shrink-0 font-semibold underline underline-offset-4 hover:text-amber-950 sm:inline ${FOCUS} rounded`}
          >
            {notice.linkLabel}
          </a>
        )}
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

function Hero({ content }: { content: LandingContent }) {
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
            {content.hero.badge}
          </motion.p>

          <motion.h1
            variants={heroItem}
            className={`${HEADING} mt-5 text-4xl font-semibold leading-[1.1] text-slate-900 sm:text-5xl lg:text-6xl`}
          >
            {content.hero.title}
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
          >
            {content.hero.description}
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#layanan"
              className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg active:translate-y-0 active:scale-[0.98] ${FOCUS}`}
            >
              {content.hero.primaryCta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#berita"
              className={`group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-800 hover:shadow-md active:translate-y-0 active:scale-[0.98] ${FOCUS}`}
            >
              <MapPin className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" aria-hidden />
              {content.hero.secondaryCta}
            </a>
          </motion.div>
        </div>

        {/* Papan informasi desa */}
        <motion.aside
          variants={heroItem}
          aria-label="Informasi singkat desa"
          className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-md"
        >
          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
            <h2 className={`${HEADING} text-lg font-semibold text-slate-900`}>
              {content.hero.cardTitle}
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {content.hero.officeBadge}
            </span>
          </div>

          <dl className="divide-y divide-slate-100">
            {content.quickFacts.map(({ icon, label, value }) => {
              const Icon = FACT_ICONS[icon] ?? FACT_ICONS.trees;
              return (
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
              );
            })}
          </dl>

          <p className="mx-2 mb-2 mt-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {content.hero.hoursSummary}
          </p>
        </motion.aside>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layanan                                                                   */
/* -------------------------------------------------------------------------- */

function Services({ section }: { section: LandingContent["services"] }) {
  const alert = useAlert();

  /**
   * Tautan layanan yang memerlukan akun diarahkan ke halaman login dengan
   * notifikasi kustom, bukan langsung berpindah halaman tanpa penjelasan.
   */
  const handleServiceClick = async (
    event: MouseEvent<HTMLAnchorElement>,
    item: LandingContent["services"]["items"][number]
  ) => {
    const title = item.title.toLowerCase();
    const isSurat = item.icon === "file" || title.includes("surat");
    const isAduan =
      item.icon === "report" ||
      title.includes("aduan") ||
      title.includes("lapor");
    const requiresLogin = isSurat || isAduan;
    if (!requiresLogin) return;

    event.preventDefault();

    const goToLogin = await alert.show({
      title: isSurat
        ? "Login untuk Mengajukan Surat"
        : "Login untuk Melapor Aduan",
      message: isSurat
        ? 'Anda harus login terlebih dahulu untuk mengajukan surat keterangan online.\n\nSilakan masuk ke akun Anda, lalu buka menu "Layanan Surat" di dashboard.'
        : 'Anda harus login terlebih dahulu untuk menyampaikan aduan.\n\nSilakan masuk ke akun Anda, lalu buka menu "Lapor Aduan" di dashboard.',
      type: "info",
      confirmText: "Masuk Sekarang",
      cancelText: "Nanti Saja",
      showCancel: true,
    });

    if (goToLogin) {
      window.location.href = "/login";
    }
  };

  const resolveHref = (
    item: LandingContent["services"]["items"][number]
  ) => {
    // Konten lama dari database mungkin masih menyimpan "#layanan" untuk
    // kartu Program Bantuan. Arahkan ke halaman publik yang sebenarnya.
    if (item.icon === "hand" && (!item.href || item.href === "#layanan")) {
      return "/program-bantuan";
    }
    return item.href || "#";
  };

  return (
    <section id="layanan" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={section.title}
          description={section.description}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {section.items.map((item, i) => {
            const Icon = SERVICE_ICONS[item.icon] ?? SERVICE_ICONS.file;
            return (
              <Reveal key={`${item.title}-${i}`} delay={i * 0.08} className="h-full">
                <a
                  href={resolveHref(item)}
                  onClick={(event) => handleServiceClick(event, item)}
                  className={`group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg ${FOCUS}`}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className={`${HEADING} mt-5 text-lg font-semibold text-slate-900`}>
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    {item.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Berita & pengumuman                                                       */
/* -------------------------------------------------------------------------- */

function NewsCard({
  item,
  readMoreLabel,
}: {
  item: LandingContent["news"]["items"][number];
  readMoreLabel: string;
}) {
  const Icon = NEWS_ICONS[item.icon] ?? NEWS_ICONS.announcement;
  const categoryStyle =
    CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.Pengumuman;
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
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${categoryStyle}`}
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
          {readMoreLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </a>
      </div>
    </article>
  );
}

function News({
  section,
  readMoreLabel,
}: {
  section: LandingContent["news"];
  readMoreLabel: string;
}) {
  return (
    <section id="berita" className="scroll-mt-24 bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={section.title}
          description={section.description}
          action={
            section.actionLabel
              ? { label: section.actionLabel, href: "#berita" }
              : undefined
          }
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item, i) => (
            <Reveal key={`${item.title}-${i}`} delay={i * 0.08} className="h-full">
              <NewsCard item={item} readMoreLabel={readMoreLabel} />
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
  const safePct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={safePct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-600" : "bg-teal-600"}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${safePct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function Transparency({
  section,
  labels,
}: {
  section: LandingContent["transparency"];
  labels: LandingContent["labels"];
}) {
  const { male, female } = section.population;
  const totalGender = male + female;
  const maleShare = totalGender > 0 ? Math.round((male / totalGender) * 100) : 50;

  return (
    <section id="transparansi" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={section.title}
          description={section.description}
          action={
            section.actionLabel
              ? { label: section.actionLabel, href: "#transparansi" }
              : undefined
          }
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
                  {section.budgetTitle}
                </h3>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {section.budgetSummary.map((b, index) => (
                  <div key={`${b.label}-${index}`}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium text-slate-600">{b.label}</p>
                      <p className="text-sm font-semibold text-slate-900">{b.pct}%</p>
                    </div>
                    <div className="mt-2">
                      <ProgressBar pct={b.pct} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {labels.realizedPrefix} {b.realized} {labels.realizedFrom} {b.target}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-900">
                  {labels.budgetSplitTitle}
                </h4>
                <ul className="mt-4 space-y-4">
                  {section.budgetSplit.map((row, index) => (
                    <li key={`${row.label}-${index}`}>
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

              {section.budgetNote && (
                <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {section.budgetNote}
                </p>
              )}
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
                    {labels.populationTitle}
                  </h3>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-sm text-slate-500">{labels.populationTotal}</dt>
                    <dd className={`${HEADING} mt-1 text-2xl font-semibold text-slate-900`}>
                      {section.population.total}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-sm text-slate-500">{labels.households}</dt>
                    <dd className={`${HEADING} mt-1 text-2xl font-semibold text-slate-900`}>
                      {section.population.households}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{labels.male} {male.toLocaleString("id-ID")}</span>
                    <span>{labels.female} {female.toLocaleString("id-ID")}</span>
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
                  {section.questionTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {section.questionText}
                </p>
                <a
                  href="#layanan"
                  className="group mt-5 inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-300 hover:bg-emerald-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {section.questionCta}
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

type HomeSetting = {
  namaDesa: string;
  sloganDesa: string;
  logoDesa: string | null;
};

function Footer({
  content,
  setting,
}: {
  content: LandingContent;
  setting: HomeSetting;
}) {
  return (
    <footer id="kontak" className="scroll-mt-24 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1">
              {setting.logoDesa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={setting.logoDesa} alt="" className="h-full w-full object-contain" />
              ) : (
                <Sprout className="h-5 w-5 text-emerald-700" aria-hidden />
              )}
            </span>
            <span className={`${HEADING} text-lg font-semibold text-white`}>
              {setting.namaDesa}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            {content.footer.description}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">
            {content.footer.officeTitle}
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <span>{content.address}</span>
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <a href={`tel:${content.phone.replace(/-/g, "")}`} className="hover:text-white">
                {content.phone}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              <a href={`mailto:${content.email}`} className="break-all hover:text-white">
                {content.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">
            {content.footer.hoursTitle}
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            {content.hours.map((h, index) => (
              <li key={`${h.day}-${index}`} className="flex items-start gap-2.5">
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
          <h3 className="text-sm font-semibold text-white">
            {content.footer.emergencyTitle}
          </h3>
          <ul className="mt-4 space-y-2.5">
            {content.emergency.map((c, index) => (
              <li key={`${c.label}-${index}`}>
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
            © <CurrentYear /> {content.footer.copyright}
          </p>
          <p>{content.footer.note}</p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halaman                                                                   */
/* -------------------------------------------------------------------------- */

export default function HomeClient({
  setting,
  content,
}: {
  setting: HomeSetting;
  content: LandingContent;
}) {
  return (
    // reducedMotion="user": pengunjung yang mengaktifkan "kurangi gerakan"
    // di sistemnya tidak akan melihat animasi geser. Aman untuk SSR.
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-white font-[family-name:var(--font-geist-sans)] text-slate-600">
      <Navbar setting={setting} nav={content.nav} />
      {/* Navbar fixed setinggi 76px */}
      <main className="pt-[76px]">
        <NoticeBar notice={content.notice} prefix={content.labels.noticePrefix} />
        <Hero content={content} />
        <Services section={content.services} />
        <News section={content.news} readMoreLabel={content.labels.readMore} />
        <Transparency section={content.transparency} labels={content.labels} />
      </main>
      <Footer content={content} setting={setting} />
    </div>
    </MotionConfig>
  );
}