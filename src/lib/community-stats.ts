import { prisma } from "@/lib/prisma";
import {
  formatCount,
  quickFactValue,
  type LandingContent,
  type QuickFactStats,
} from "@/lib/landing-content";

/**
 * Statistik kependudukan yang ditampilkan di halaman depan.
 *
 * Nilainya selalu dihitung langsung dari database (bukan disimpan di JSON
 * konten) sehingga tidak bisa basi ketika data warga berubah.
 */
export interface CommunityStats extends QuickFactStats {
  totalWarga: number;
  totalKK: number;
  totalDusun: number;
  lakiLaki: number;
  perempuan: number;
}

/**
 * Ambil statistik kependudukan dengan beberapa query paralel.
 *
 * Hanya warga berstatus `AKTIF` yang dihitung agar warga yang sudah pindah
 * atau meninggal tidak ikut masuk ke angka publik. Bila database gagal
 * diakses, fungsi mengembalikan `null` supaya halaman tetap dapat dirender.
 */
export async function getCommunityStats(): Promise<CommunityStats | null> {
  try {
    const [totalWarga, totalKK, totalDusun, genderGroups] = await Promise.all([
      prisma.warga.count({ where: { statusWarga: "AKTIF" } }),
      prisma.kartuKeluarga.count(),
      prisma.dusun.count(),
      prisma.warga.groupBy({
        by: ["jenisKelamin"],
        where: { statusWarga: "AKTIF" },
        _count: { _all: true },
      }),
    ]);

    const countGender = (jenisKelamin: "LAKI_LAKI" | "PEREMPUAN") =>
      genderGroups.find((group) => group.jenisKelamin === jenisKelamin)?._count
        ._all ?? 0;

    return {
      totalWarga,
      totalKK,
      totalDusun,
      lakiLaki: countGender("LAKI_LAKI"),
      perempuan: countGender("PEREMPUAN"),
    };
  } catch (error) {
    console.error("Gagal memuat statistik kependudukan:", error);
    return null;
  }
}

/**
 * Timpa angka kependudukan dan statistik ringkas pada konten landing page
 * dengan nilai terbaru dari database.
 *
 * Konten asli tidak diubah (immutable) agar aman dipakai di server component.
 */
export function applyCommunityStats(
  content: LandingContent,
  stats: CommunityStats
): LandingContent {
  return {
    ...content,
    quickFacts: content.quickFacts.map((fact) => {
      const autoValue = quickFactValue(fact.source, stats);
      return autoValue === null ? fact : { ...fact, value: autoValue };
    }),
    transparency: {
      ...content.transparency,
      population: {
        total: formatCount(stats.totalWarga),
        households: formatCount(stats.totalKK),
        male: stats.lakiLaki,
        female: stats.perempuan,
      },
    },
  };
}
