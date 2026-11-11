import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { getLandingContent } from "@/lib/landing-content";
import HomeClient from "./HomeClient";

/**
 * Halaman depan publik.
 *
 * Server component ini mengambil identitas desa dan seluruh konten landing
 * page dari tabel `WebSettings`, lalu meneruskannya ke komponen klien.
 * Dengan begitu perubahan dari menu "Kelola Konten Web" langsung tampil
 * tanpa perlu mengubah kode.
 *
 * Data dibaca di dalam <Suspense> agar Cache Components bisa menampilkan
 * kerangka halaman lebih dulu, lalu mengalirkan konten setelah database
 * selesai dibaca.
 */
export default function Page() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <LandingContent />
    </Suspense>
  );
}

async function LandingContent() {
  const settings = await prisma.webSettings
    .findFirst()
    .catch((error) => {
      console.error("Gagal memuat konten halaman depan:", error);
      return null;
    });

  const setting = {
    namaDesa: settings?.namaDesa || "Desa Hulu Pancur Batu",
    sloganDesa: settings?.sloganDesa || "Sistem Informasi Desa",
    logoDesa: settings?.logoDesa || "/logo-desa.png",
  };

  const content = getLandingContent(settings);

  return <HomeClient setting={setting} content={content} />;
}

/** Kerangka sederhana saat konten halaman depan masih dimuat. */
function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <div className="h-16 border-b border-emerald-900/10 bg-white/70" />
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="h-4 w-40 animate-pulse rounded-full bg-emerald-900/10" />
        <div className="mt-6 h-12 w-full max-w-2xl animate-pulse rounded-2xl bg-emerald-900/10" />
        <div className="mt-3 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-emerald-900/10" />
        <div className="mt-8 h-4 w-full max-w-lg animate-pulse rounded-full bg-emerald-900/10" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded-full bg-emerald-900/10" />
      </div>
    </div>
  );
}
