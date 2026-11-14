import { prisma } from "@/lib/prisma";
import {
  formatRupiah,
  type LandingBudgetSplit,
  type LandingBudgetSummary,
  type LandingContent,
} from "@/lib/landing-content";

/**
 * Satu baris data anggaran dari tabel `DanaDesa`.
 *
 * Nilai `anggaran`/`realisasi` sengaja bertipe longgar agar bisa menerima
 * `number` maupun `Prisma.Decimal` tanpa mengubahnya lebih dulu.
 */
export interface BudgetRowInput {
  jenis: string;
  kategori: string;
  anggaran: number | { toString(): string };
  realisasi: number | { toString(): string };
}

export interface BudgetBreakdown {
  year: number;
  hasData: boolean;
  totalPendapatanAnggaran: number;
  totalPendapatanRealisasi: number;
  totalBelanjaAnggaran: number;
  totalBelanjaRealisasi: number;
  totalPembiayaanAnggaran: number;
  totalPembiayaanRealisasi: number;
  totalLainnyaAnggaran: number;
  totalLainnyaRealisasi: number;
  /** Belanja + pembiayaan + jenis lain di luar pendapatan. */
  totalKeluarAnggaran: number;
  totalKeluarRealisasi: number;
  /** Pendapatan realisasi dikurangi seluruh realisasi keluar. */
  silpa: number;
  summary: LandingBudgetSummary[];
  split: LandingBudgetSplit[];
}

const JENIS_PENDAPATAN = "PENDAPATAN";
const JENIS_BELANJA = "BELANJA";
const JENIS_PEMBIAYAAN = "PEMBIAYAAN";

function toNumber(value: number | { toString(): string }): number {
  const parsed = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Hitung persentase realisasi terhadap pagu, aman dari pembagian nol. */
export function budgetPercent(realized: number, target: number): number {
  if (!Number.isFinite(realized) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }
  return Math.round((realized / target) * 100);
}

function emptyTotals() {
  return { anggaran: 0, realisasi: 0 };
}

function sumRows(rows: BudgetRowInput[]) {
  return rows.reduce(
    (total, row) => ({
      anggaran: total.anggaran + toNumber(row.anggaran),
      realisasi: total.realisasi + toNumber(row.realisasi),
    }),
    emptyTotals()
  );
}

function makeSummary(
  label: string,
  totals: { anggaran: number; realisasi: number }
): LandingBudgetSummary {
  return {
    label,
    target: formatRupiah(totals.anggaran),
    realized: formatRupiah(totals.realisasi),
    pct: budgetPercent(totals.realisasi, totals.anggaran),
  };
}

/**
 * Ubah baris `DanaDesa` menjadi angka rekap dan rincian bidang yang dipakai
 * bersama oleh dashboard admin dan halaman publik.
 *
 * Dengan satu fungsi sumber ini, total Pendapatan/Belanja, persentase, dan
 * rincian bidang dijamin sama di kedua tempat.
 */
export function summarizeBudget(
  rows: BudgetRowInput[],
  year: number
): BudgetBreakdown {
  const normalized = rows.map((row) => ({
    ...row,
    jenis: String(row.jenis ?? "").trim().toUpperCase(),
    kategori: String(row.kategori ?? "").trim(),
  }));

  const pendapatanRows = normalized.filter((row) => row.jenis === JENIS_PENDAPATAN);
  const belanjaRows = normalized.filter((row) => row.jenis === JENIS_BELANJA);
  const pembiayaanRows = normalized.filter(
    (row) => row.jenis === JENIS_PEMBIAYAAN
  );
  const lainnyaRows = normalized.filter(
    (row) =>
      row.jenis !== JENIS_PENDAPATAN &&
      row.jenis !== JENIS_BELANJA &&
      row.jenis !== JENIS_PEMBIAYAAN
  );

  const pendapatan = sumRows(pendapatanRows);
  const belanja = sumRows(belanjaRows);
  const pembiayaan = sumRows(pembiayaanRows);
  const lainnya = sumRows(lainnyaRows);

  const summary: LandingBudgetSummary[] = [];
  if (normalized.length > 0) {
    summary.push(makeSummary("Pendapatan", pendapatan));
    summary.push(makeSummary("Belanja", belanja));
    if (pembiayaan.anggaran > 0 || pembiayaan.realisasi > 0) {
      summary.push(makeSummary("Pembiayaan", pembiayaan));
    }
    if (lainnya.anggaran > 0 || lainnya.realisasi > 0) {
      summary.push(makeSummary("Lainnya", lainnya));
    }
  }

  // Rincian bidang dihitung dari seluruh baris BELANJA, dikelompokkan per
  // kategori. Persentase = porsi pagu bidang terhadap total pagu belanja.
  const splitByCategory = new Map<
    string,
    { anggaran: number; realisasi: number }
  >();

  for (const row of belanjaRows) {
    const label = row.kategori || "Tanpa kategori";
    const current = splitByCategory.get(label) ?? emptyTotals();
    current.anggaran += toNumber(row.anggaran);
    current.realisasi += toNumber(row.realisasi);
    splitByCategory.set(label, current);
  }

  const split: LandingBudgetSplit[] = [...splitByCategory.entries()]
    .sort((a, b) => b[1].anggaran - a[1].anggaran)
    .map(([label, totals]) => ({
      label,
      pct: budgetPercent(totals.anggaran, belanja.anggaran),
      amount: formatRupiah(totals.anggaran),
      realized: formatRupiah(totals.realisasi),
      realizedPct: budgetPercent(totals.realisasi, totals.anggaran),
    }));

  const totalKeluarAnggaran =
    belanja.anggaran + pembiayaan.anggaran + lainnya.anggaran;
  const totalKeluarRealisasi =
    belanja.realisasi + pembiayaan.realisasi + lainnya.realisasi;

  return {
    year,
    hasData: normalized.length > 0,
    totalPendapatanAnggaran: pendapatan.anggaran,
    totalPendapatanRealisasi: pendapatan.realisasi,
    totalBelanjaAnggaran: belanja.anggaran,
    totalBelanjaRealisasi: belanja.realisasi,
    totalPembiayaanAnggaran: pembiayaan.anggaran,
    totalPembiayaanRealisasi: pembiayaan.realisasi,
    totalLainnyaAnggaran: lainnya.anggaran,
    totalLainnyaRealisasi: lainnya.realisasi,
    totalKeluarAnggaran,
    totalKeluarRealisasi,
    silpa: pendapatan.realisasi - totalKeluarRealisasi,
    summary,
    split,
  };
}

/** Tahun anggaran terbaru yang tersedia di database (fallback tahun berjalan). */
export async function getLatestBudgetYear(): Promise<number> {
  const currentYear = new Date().getFullYear();
  try {
    const latest = await prisma.danaDesa.findFirst({
      select: { tahun: true },
      orderBy: [{ tahun: "desc" }, { createdAt: "desc" }],
    });
    return latest?.tahun ?? currentYear;
  } catch (error) {
    console.error("Gagal memuat tahun anggaran terbaru:", error);
    return currentYear;
  }
}

/**
 * Ambil dan rekap data anggaran untuk satu tahun (default: tahun terbaru).
 * Selalu mengembalikan objek valid agar halaman publik tidak pernah
 * menampilkan angka statis ketika database kosong atau gagal diakses.
 */
export async function getBudgetBreakdown(
  year?: number
): Promise<BudgetBreakdown> {
  const targetYear = year ?? (await getLatestBudgetYear());
  try {
    const rows = await prisma.danaDesa.findMany({
      where: { tahun: targetYear },
    });
    return summarizeBudget(rows, targetYear);
  } catch (error) {
    console.error("Gagal memuat data anggaran desa:", error);
    return summarizeBudget([], targetYear);
  }
}

/**
 * Timpa angka APBDes pada konten landing page dengan rekap terbaru dari
 * database. Judul kartu dan tahun ikut disesuaikan agar tidak pernah
 * menampilkan tahun yang salah.
 */
export function applyBudgetBreakdown(
  content: LandingContent,
  breakdown: BudgetBreakdown
): LandingContent {
  return {
    ...content,
    transparency: {
      ...content.transparency,
      year: String(breakdown.year),
      budgetTitle: `APBDes ${breakdown.year}`,
      budgetSummary: breakdown.summary,
      budgetSplit: breakdown.split,
    },
  };
}
