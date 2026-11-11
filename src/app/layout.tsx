import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import Script from "next/script";
import InstallPWA from "@/app/dashboard/InstallPWA"; // Import komponen InstallPWA
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font judul untuk landing page (dipakai lewat var(--font-display))
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Desa Hulu Pancur Batu | Sistem Informasi Desa",
  description:
    "Portal resmi administrasi kependudukan dan transparansi penyaluran bantuan sosial Desa Hulu Pancur Batu.",
  icons: {
    icon: "/logo-desa.png?v=2",
    apple: "/logo-desa.png?v=2", 
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIDU Desa",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full scroll-smooth antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}

        {/* Banner Install PWA Aktif Global (Halaman Login & Dashboard) */}
        <InstallPWA />

        {/* Script untuk mendaftarkan Service Worker PWA */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}