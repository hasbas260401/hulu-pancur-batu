import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  allowedDevOrigins: [
  "192.168.100.4",
  "judiciary-paralegal-debtor.ngrok-free.dev",
  // atau pakai wildcard supaya tidak perlu ganti tiap ngrok restart:
  "*.ngrok-free.dev",
],
};

export default nextConfig;