import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Narwhal Intelligence - Asisten AI Mahasiswa Teknik Kelautan",
  description:
    "Platform AI interaktif terdedikasi untuk mahasiswa Teknik Kelautan (Ocean & Marine Engineering). Penurunan rumus LaTeX, hidrodinamika, bangunan lepas pantai, dan simulasi numerik.",
  keywords: [
    "Teknik Kelautan",
    "Ocean Engineering",
    "Airy Wave Theory",
    "Morison Equation",
    "Offshore Platform",
    "AI Kelautan",
    "Subsea Pipeline",
    "Naval Architecture",
    "KaTeX AI",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf9f5] text-[#2d2b28] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
