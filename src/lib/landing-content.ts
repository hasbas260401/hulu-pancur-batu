/**
 * Tipe dan nilai bawaan untuk konten halaman depan (landing page).
 *
 * Data disimpan pada kolom `WebSettings.landingContent` (JSON) sehingga
 * seluruh teks, kontak, jam operasional, layanan, berita, dan statistik
 * dapat diubah dari menu "Kelola Konten Web" tanpa mengubah kode.
 */

export type FactIcon = "trees" | "users" | "home" | "wallet" | "sprout";
export type ServiceIcon = "file" | "report" | "hand" | "landmark";
export type NewsIcon = "announcement" | "activity" | "development";
export type NewsCategory = "Pengumuman" | "Kegiatan" | "Pembangunan";

/**
 * Sumber nilai untuk statistik ringkas di halaman depan.
 *
 * - `manual`     : diisi sendiri oleh operator (mis. luas wilayah).
 * - `population` : total warga aktif dari tabel `Warga`.
 * - `households` : total kartu keluarga dari tabel `KartuKeluarga`.
 * - `villages`   : jumlah dusun dari tabel `Dusun`.
 *
 * Nilai otomatis selalu dihitung ulang saat halaman dirender sehingga tidak
 * pernah basi walaupun data di database berubah.
 */
export type FactSource = "manual" | "population" | "households" | "villages";

export interface LandingQuickFact {
  icon: FactIcon;
  label: string;
  value: string;
  source?: FactSource;
}

/** Bagian statistik kependudukan yang dibutuhkan untuk nilai otomatis. */
export interface QuickFactStats {
  totalWarga: number;
  totalKK: number;
  totalDusun: number;
}

const countFormatter = new Intl.NumberFormat("id-ID");
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Format angka dengan pemisah ribuan gaya Indonesia (mis. 4.328). */
export function formatCount(value: number): string {
  return countFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Format nominal rupiah tanpa desimal (mis. Rp 1.411.000.000). */
export function formatRupiah(value: number): string {
  return `Rp ${rupiahFormatter.format(Number.isFinite(value) ? value : 0)}`;
}

/**
 * Hitung nilai tampilan untuk statistik ringkas berdasarkan sumbernya.
 * Mengembalikan `null` bila sumbernya manual atau statistik belum tersedia.
 */
export function quickFactValue(
  source: FactSource | undefined,
  stats: QuickFactStats | null | undefined
): string | null {
  if (!stats) return null;

  switch (source) {
    case "population":
      return `${formatCount(stats.totalWarga)} jiwa`;
    case "households":
      return `${formatCount(stats.totalKK)} KK`;
    case "villages":
      return `${formatCount(stats.totalDusun)} dusun`;
    default:
      return null;
  }
}

export interface LandingServiceItem {
  icon: ServiceIcon;
  title: string;
  desc: string;
  cta: string;
  href: string;
}

export interface LandingNewsItem {
  icon: NewsIcon;
  category: NewsCategory;
  date: string;
  title: string;
  excerpt: string;
}

export interface LandingHour {
  day: string;
  time: string;
}

export interface LandingEmergency {
  label: string;
  number: string;
}

export interface LandingBudgetSummary {
  label: string;
  target: string;
  realized: string;
  pct: number;
}

export interface LandingBudgetSplit {
  label: string;
  /** Persentase bagian ini terhadap total pagu belanja. */
  pct: number;
  /** Pagu anggaran untuk bidang ini, sudah diformat rupiah. */
  amount: string;
  /** Realisasi bidang ini, sudah diformat rupiah. */
  realized?: string;
  /** Persentase realisasi terhadap pagu bidang ini. */
  realizedPct?: number;
}

export interface LandingContent {
  address: string;
  phone: string;
  email: string;
  nav: {
    home: string;
    services: string;
    news: string;
    transparency: string;
    contact: string;
    contactCta: string;
    loginStaff: string;
    loginShort: string;
  };
  labels: {
    noticePrefix: string;
    readMore: string;
    realizedPrefix: string;
    realizedFrom: string;
    budgetSplitTitle: string;
    populationTitle: string;
    populationTotal: string;
    households: string;
    male: string;
    female: string;
  };
  notice: {
    text: string;
    linkLabel: string;
    href: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    cardTitle: string;
    officeBadge: string;
    hoursSummary: string;
  };
  quickFacts: LandingQuickFact[];
  services: {
    title: string;
    description: string;
    items: LandingServiceItem[];
  };
  news: {
    title: string;
    description: string;
    actionLabel: string;
    items: LandingNewsItem[];
  };
  transparency: {
    title: string;
    description: string;
    actionLabel: string;
    year: string;
    budgetTitle: string;
    budgetNote: string;
    questionTitle: string;
    questionText: string;
    questionCta: string;
    population: {
      total: string;
      households: string;
      male: number;
      female: number;
    };
    budgetSummary: LandingBudgetSummary[];
    budgetSplit: LandingBudgetSplit[];
  };
  footer: {
    description: string;
    officeTitle: string;
    hoursTitle: string;
    emergencyTitle: string;
    copyright: string;
    note: string;
  };
  hours: LandingHour[];
  emergency: LandingEmergency[];
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  address:
    "Kantor Kepala Desa Hulu, Kec. Pancur Batu, Kab. Deli Serdang, Sumatera Utara",
  phone: "0812-0000-0000",
  email: "info@hulupancurbatu.desa.id",
  nav: {
    home: "Beranda",
    services: "Layanan",
    news: "Berita",
    transparency: "Transparansi",
    contact: "Kontak",
    contactCta: "Kontak darurat",
    loginStaff: "Login Perangkat Desa",
    loginShort: "Login",
  },
  labels: {
    noticePrefix: "Penting:",
    readMore: "Baca selengkapnya",
    realizedPrefix: "Terealisasi",
    realizedFrom: "dari",
    budgetSplitTitle: "Belanja menurut bidang",
    populationTitle: "Kependudukan",
    populationTotal: "Penduduk",
    households: "Kepala keluarga",
    male: "Laki-laki",
    female: "Perempuan",
  },
  notice: {
    text: "PBB-P2 dibuka sampai 30 November 2026.",
    linkLabel: "Selengkapnya",
    href: "#berita",
  },
  hero: {
    badge: "Website resmi Desa Hulu Pancur Batu",
    title: "Urusan desa, lebih dekat dari rumah Anda.",
    description:
      "Desa yang terbuka untuk warganya. Ajukan surat, sampaikan aduan, dan pantau penggunaan dana desa tanpa harus antre di kantor.",
    primaryCta: "Buka layanan publik",
    secondaryCta: "Jelajahi desa",
    cardTitle: "Sekilas Desa Hulu Pancur Batu",
    officeBadge: "Kantor buka hari ini",
    hoursSummary:
      "Jam layanan: Senin sampai Kamis 08.00 - 15.00, Jumat 08.00 - 11.30.",
  },
  quickFacts: [
    { icon: "trees", label: "Luas wilayah", value: "12,4 km²", source: "manual" },
    { icon: "users", label: "Jumlah penduduk", value: "4.328 jiwa", source: "population" },
    { icon: "home", label: "Jumlah dusun", value: "5 dusun", source: "villages" },
  ],
  services: {
    title: "Layanan mandiri untuk warga",
    description:
      "Empat layanan yang paling sering dipakai. Semuanya bisa diakses dari ponsel, kapan saja.",
    items: [
      {
        icon: "file",
        title: "Surat keterangan online",
        desc: "Ajukan surat domisili, usaha, atau tidak mampu dari rumah. Ambil hasilnya di kantor desa.",
        cta: "Ajukan surat",
        href: "#layanan",
      },
      {
        icon: "report",
        title: "Lapor aduan",
        desc: "Sampaikan jalan rusak, lampu mati, atau masalah lingkungan. Anda bisa memantau tindak lanjutnya.",
        cta: "Buat laporan",
        href: "#layanan",
      },
      {
        icon: "hand",
        title: "Program bantuan",
        desc: "Cek apakah Anda terdaftar sebagai penerima BLT, PKH, atau bantuan desa lainnya.",
        cta: "Cek penerima",
        href: "/program-bantuan",
      },
      {
        icon: "landmark",
        title: "Transparansi dana",
        desc: "Lihat rencana dan realisasi APBDes, lengkap dengan proyek yang sedang berjalan.",
        cta: "Lihat anggaran",
        href: "#transparansi",
      },
    ],
  },
  news: {
    title: "Berita dan pengumuman terbaru",
    description:
      "Kabar dari balai desa, jadwal kegiatan, dan perkembangan pembangunan.",
    actionLabel: "Lihat semua berita",
    items: [
      {
        icon: "announcement",
        category: "Pengumuman",
        date: "10 November 2026",
        title: "Pembayaran PBB-P2 dibuka sampai 30 November",
        excerpt:
          "Warga dapat membayar di kantor desa setiap jam layanan. Bawa SPPT tahun lalu atau tunjukkan NOP dari ponsel.",
      },
      {
        icon: "activity",
        category: "Kegiatan",
        date: "7 November 2026",
        title: "Gotong royong bersihkan parit di Dusun III dan IV",
        excerpt:
          "Sekitar 120 warga ikut membersihkan 2,5 km parit menjelang musim hujan. Kegiatan berikutnya dijadwalkan di Dusun I.",
      },
      {
        icon: "development",
        category: "Pembangunan",
        date: "3 November 2026",
        title: "Pengaspalan jalan usaha tani tahap dua mulai dikerjakan",
        excerpt:
          "Proyek sepanjang 1,8 km ini dibiayai Dana Desa dan ditargetkan selesai akhir Desember.",
      },
    ],
  },
  transparency: {
    title: "Statistik dan transparansi anggaran",
    description:
      "Angka kependudukan diambil otomatis dari data desa, dilengkapi realisasi APBDes tahun berjalan.",
    actionLabel: "Unduh laporan APBDes",
    year: "2026",
    budgetTitle: "APBDes 2026",
    budgetNote:
      "Rincian proyek dan nilai kontrak tersedia di papan informasi kantor desa dan dapat diminta secara tertulis.",
    questionTitle: "Ada pertanyaan soal anggaran?",
    questionText:
      "Warga berhak meminta penjelasan. Datang ke kantor desa atau tulis pertanyaan Anda lewat layanan aduan.",
    questionCta: "Tulis pertanyaan",
    population: {
      total: "4.328",
      households: "1.214",
      male: 2151,
      female: 2177,
    },
    budgetSummary: [],
    budgetSplit: [],
  },
  footer: {
    description:
      "Pemerintah Desa Hulu Pancur Batu, Kec. Pancur Batu, Kab. Deli Serdang. Melayani warga dengan terbuka dan bertanggung jawab.",
    officeTitle: "Kantor desa",
    hoursTitle: "Jam operasional",
    emergencyTitle: "Kontak darurat",
    copyright: "Pemerintah Desa Hulu Pancur Batu. Seluruh hak dilindungi.",
    note: "Konten situs ini dikelola oleh operator desa.",
  },
  hours: [
    { day: "Senin sampai Kamis", time: "08.00 - 15.00" },
    { day: "Jumat", time: "08.00 - 11.30" },
    { day: "Sabtu dan Minggu", time: "Tutup" },
  ],
  emergency: [
    { label: "Kepala Desa", number: "0812-0000-0001" },
    { label: "Linmas / Keamanan", number: "0812-0000-0002" },
    { label: "Ambulans Desa", number: "0812-0000-0003" },
  ],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Menggabungkan data dari database dengan nilai bawaan. Data yang hilang,
 * null, atau bertipe salah otomatis memakai nilai bawaan agar halaman tidak
 * pernah menampilkan nilai kosong/rusak.
 */
function mergeValue<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) return base;

    const template = base[0];
    return override.map((item, index) => {
      const fallback = base[index] ?? template;
      return fallback === undefined
        ? (item as T)
        : (mergeValue(fallback, item) as T);
    }) as T;
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;

    const result: Record<string, unknown> = { ...base };
    for (const key of Object.keys(base)) {
      if (key in override) {
        result[key] = mergeValue(
          (base as Record<string, unknown>)[key],
          override[key]
        );
      }
    }
    return result as T;
  }

  if (typeof base === "string") {
    return (typeof override === "string" ? override : base) as T;
  }

  if (typeof base === "number") {
    return (typeof override === "number" && Number.isFinite(override)
      ? override
      : base) as T;
  }

  if (typeof base === "boolean") {
    return (typeof override === "boolean" ? override : base) as T;
  }

  return (override === undefined || override === null ? base : override) as T;
}

export function normalizeLandingContent(raw: unknown): LandingContent {
  return mergeValue(
    JSON.parse(JSON.stringify(DEFAULT_LANDING_CONTENT)) as LandingContent,
    raw
  );
}

export function getLandingContent(
  settings: { landingContent?: unknown } | null | undefined
): LandingContent {
  return normalizeLandingContent(settings?.landingContent);
}
