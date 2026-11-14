import type { NextConfig } from "next";

// Nilai ini dievaluasi saat server/build dijalankan (bukan di browser).
const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * Catatan penting agar aplikasi tidak rusak:
 * - `script-src 'unsafe-inline'` dibutuhkan karena Next.js menyisipkan skrip
 *   inline untuk streaming/hydration, dan aplikasi ini punya skrip pendaftaran
 *   Service Worker inline. `'unsafe-eval'` HANYA dipakai saat development
 *   (dibutuhkan Turbopack/dev overlay), tidak pernah di produksi.
 * - `style-src 'unsafe-inline'` dibutuhkan Tailwind + gaya inline bawaan React.
 * - `img-src` mengizinkan `data:`/`blob:` (pratinjau unggahan), `https:` (logo
 *   desa yang mungkin ditautkan dari luar), dan `'self'` (unggahan lokal).
 * - `frame-src` khusus YouTube, karena profil desa menampilkan video embed.
 * - `connect-src` dibatasi ke origin sendiri (API internal + Server Actions),
 *   ditambah WebSocket hanya saat development untuk hot reload.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  // Cegah browser menebak tipe file (mis. HTML dianggap gambar)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Cegah halaman desa ditampilkan di dalam iframe situs lain (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Batasi informasi referrer yang dikirim ke situs luar
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Matikan fitur browser yang tidak dipakai
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // HSTS hanya di produksi: browser hanya mematuhinya lewat HTTPS, dan header
  // ini membuat semua kunjungan berikutnya dipaksa HTTPS. Tambahkan
  // `; preload` setelah domain terdaftar di hsts preload list bila diinginkan.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Jangan bocorkan versi framework ke publik
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  allowedDevOrigins: [
    "192.168.1.13",
    "judiciary-paralegal-debtor.ngrok-free.dev",
    // atau pakai wildcard supaya tidak perlu ganti tiap ngrok restart:
    "*.ngrok-free.dev",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
