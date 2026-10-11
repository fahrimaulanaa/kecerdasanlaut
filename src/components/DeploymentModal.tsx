"use client";

import React, { useState } from "react";
import { X, Globe, GitBranch, Check, Copy, ExternalLink, Terminal, Cloud } from "lucide-react";

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentModal({ isOpen, onClose }: DeploymentModalProps) {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="ocean-modal-backdrop">
      <div className="ocean-modal-card max-w-2xl max-h-[85vh] flex flex-col">
        <div className="ocean-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Panduan Deploy ke Vercel & Netlify
              </h3>
              <p className="text-xs text-slate-400">
                Cara mengunggah ke GitHub dan menjalankan aplikasi secara online
              </p>
            </div>
          </div>
          <button onClick={onClose} className="ocean-modal-close-btn" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Step 1: GitHub */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <GitBranch className="w-4 h-4" />
              <span>Langkah 1: Unggah Proyek ke GitHub</span>
            </div>
            <p className="text-slate-400">
              Buka terminal di direktori proyek ini (<code className="text-cyan-300">d:\kelautan-jaya</code>) dan jalankan:
            </p>
            <div className="ocean-code-container">
              <div className="ocean-code-header">
                <span className="ocean-code-lang">bash</span>
                <button
                  onClick={() =>
                    copyCode(
                      "git",
                      `git add .\ngit commit -m "feat: inisialisasi Narwhal Intelligence"\ngit branch -M main\ngit remote add origin https://github.com/USERNAME-ANDA/kelautan-jaya.git\ngit push -u origin main`
                    )
                  }
                  className="ocean-code-copy-btn"
                >
                  {copiedStep === "git" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStep === "git" ? "Tersalin" : "Salin"}</span>
                </button>
              </div>
              <pre className="ocean-code-pre">
{`git add .
git commit -m "feat: inisialisasi Narwhal Intelligence"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/kelautan-jaya.git
git push -u origin main`}
              </pre>
            </div>
          </div>

          {/* Step 2: Deploy ke Vercel */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <Globe className="w-4 h-4" />
              <span>Langkah 2: Hubungkan & Deploy ke Vercel (Rekomendasi Utama)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
              <li>
                Buka <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">vercel.com</a> dan masuk menggunakan akun GitHub Anda.
              </li>
              <li>Klik tombol <strong>&quot;Add New...&quot; &rarr; &quot;Project&quot;</strong>.</li>
              <li>Pilih repositori <strong>kelautan-jaya</strong> dari daftar GitHub Anda.</li>
              <li>
                Pada bagian <strong>Environment Variables</strong>, tambahkan variabel berikut:
              </li>
            </ol>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="text-cyan-300">MECUTINAI_API_KEY = sk_ip70YP5ZHmBf6CIamksvU62KVSaClmm8EZ4H49mTLSzGBWCP</div>
              <div className="text-slate-400">NEXT_PUBLIC_FIREBASE_API_KEY = (kunci dari Firebase Console Anda)</div>
              <div className="text-slate-400">NEXT_PUBLIC_FIREBASE_PROJECT_ID = (project ID Firebase Anda)</div>
            </div>
            <p className="text-slate-400">
              5. Klik tombol <strong>&quot;Deploy&quot;</strong>. Dalam hitungan detik website Anda langsung online dengan HTTPS gratis!
            </p>
          </div>

          {/* Step 3: Deploy ke Netlify */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <Globe className="w-4 h-4" />
              <span>Langkah 3: Opsi Alternatif: Deploy ke Netlify</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
              <li>
                Buka <a href="https://netlify.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">netlify.com</a> &rarr; <strong>&quot;Add new site&quot; &rarr; &quot;Import an existing project&quot;</strong>.
              </li>
              <li>Pilih GitHub &rarr; pilih repositori <strong>kelautan-jaya</strong>.</li>
              <li>Netlify secara otomatis mendeteksi konfigurasi Next.js (Build command: <code>npm run build</code>).</li>
              <li>Tambahkan Environment Variables yang sama seperti di atas, lalu klik <strong>&quot;Deploy site&quot;</strong>.</li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="ocean-btn-primary px-5 py-2 text-xs"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
