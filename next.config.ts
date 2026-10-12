import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.137.1"],
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js"],
  // Ensure native Linux binaries, pdf.js worker, and tesseract assets are
  // traced into the serverless function bundle on Vercel.
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
