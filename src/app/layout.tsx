import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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