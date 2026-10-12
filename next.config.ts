import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.137.1"],
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js"],
  // Pastikan biner native Linux (@napi-rs/canvas), font data pdf.js, dan aset
  // tesseract (termasuk dependensi runtime worker-nya) ikut di-trace ke dalam
  // serverless function di Vercel.
  outputFileTracingIncludes: {
    "/api/files/parse": [
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/@napi-rs/canvas-linux-x64-musl/**",
      "./node_modules/pdfjs-dist/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      // Dependensi runtime tesseract.js yang di-require dinamis oleh worker-script.
      "./node_modules/bmp-js/**",
      "./node_modules/zlibjs/**",
      "./node_modules/is-url/**",
      "./node_modules/idb-keyval/**",
      "./node_modules/wasm-feature-detect/**",
      "./node_modules/node-fetch/**",
      "./node_modules/regenerator-runtime/**",
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
