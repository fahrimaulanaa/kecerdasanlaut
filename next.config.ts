import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.137.1"],
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js"],
  // Pastikan biner native Linux (@napi-rs/canvas), font data pdf.js, dan aset
  // tesseract ikut di-trace ke dalam serverless function di Vercel.
  outputFileTracingIncludes: {
    "/api/files/parse": [
      "./node_modules/@napi-rs/canvas*/**",
      "./node_modules/pdfjs-dist/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
