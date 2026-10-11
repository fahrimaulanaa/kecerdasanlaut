"use client";

import React, { useState, useEffect } from "react";
import { X, Flame, Check, AlertCircle, Copy, ExternalLink, HelpCircle } from "lucide-react";
import {
  getActiveFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  type FirebaseConfig,
} from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirebaseConfigModal({ isOpen, onClose }: FirebaseConfigModalProps) {
  const { reloadConfig, isFirebaseConfigured } = useAuth();
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  });
  const [rawJson, setRawJson] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveFirebaseConfig();
      if (active) {
        setConfig(active);
      }
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleJsonPaste = () => {
    try {
      // Try cleaning JS object notation or JSON
      let cleaned = rawJson.trim();
      if (cleaned.startsWith("const firebaseConfig =")) {
        cleaned = cleaned.replace("const firebaseConfig =", "").replace(/;$/, "").trim();
      }
      // If object keys lack double quotes:
      // Simple regex to parse standard Firebase console format
      const extract = (key: string) => {
        const match = cleaned.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
        return match ? match[1] : "";
      };

      const parsed: FirebaseConfig = {
        apiKey: extract("apiKey"),
        authDomain: extract("authDomain"),
        projectId: extract("projectId"),
        storageBucket: extract("storageBucket"),
        messagingSenderId: extract("messagingSenderId"),
        appId: extract("appId"),
      };

      if (!parsed.apiKey && cleaned.startsWith("{")) {
        const obj = JSON.parse(cleaned);
        setConfig({
          apiKey: obj.apiKey || "",
          authDomain: obj.authDomain || "",
          projectId: obj.projectId || "",
          storageBucket: obj.storageBucket || "",
          messagingSenderId: obj.messagingSenderId || "",
          appId: obj.appId || "",
        });
      } else {
        setConfig(parsed);
      }

      setStatusMsg({ type: "success", text: "Berhasil membaca format konfigurasi Firebase!" });
    } catch {
      setStatusMsg({
        type: "error",
        text: "Gagal memproses JSON. Harap masukkan nilai secara manual di kolom bawah.",
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiKey || !config.projectId) {
      setStatusMsg({
        type: "error",
        text: "API Key dan Project ID wajib diisi.",
      });
      return;
    }

    saveFirebaseConfig(config);
    reloadConfig();
    setStatusMsg({
      type: "success",
      text: "Konfigurasi Firebase berhasil disimpan! Autentikasi Firebase sekarang aktif.",
    });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    clearFirebaseConfig();
    setConfig({
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
    });
    reloadConfig();
    setStatusMsg({
      type: "success",
      text: "Konfigurasi Firebase telah dihapus (kembali ke Mode Demo).",
    });
  };

  return (
    <div className="ocean-modal-backdrop">
      <div className="ocean-modal-card max-w-xl">
        <div className="ocean-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Konfigurasi Firebase Auth
                {isFirebaseConfigured && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Aktif
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Hubungkan proyek Firebase Anda untuk login email & password mahasiswa.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="ocean-modal-close-btn" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Quick Paste dari Firebase Console
              </span>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
              >
                Buka Firebase Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <textarea
              className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              rows={3}
              placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "proyek.firebaseapp.com",\n  projectId: "proyek-id",\n  ...\n};'}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
            <button
              type="button"
              onClick={handleJsonPaste}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Terapkan Kode Di Atas ke Formulir
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">API Key *</label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="ocean-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Auth Domain</label>
                <input
                  type="text"
                  placeholder="proyek.firebaseapp.com"
                  value={config.authDomain}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                  className="ocean-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Project ID *</label>
                <input
                  type="text"
                  required
                  placeholder="kelautan-jaya-ai"
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                  className="ocean-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Storage Bucket</label>
                <input
                  type="text"
                  placeholder="proyek.appspot.com"
                  value={config.storageBucket}
                  onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                  className="ocean-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Messaging Sender ID</label>
                <input
                  type="text"
                  placeholder="1029384756"
                  value={config.messagingSenderId}
                  onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                  className="ocean-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">App ID</label>
                <input
                  type="text"
                  placeholder="1:1029384:web:ab987c"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  className="ocean-input"
                />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-start gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Pengaturan ini disimpan di peramban Anda. Anda juga bisa menaruhnya secara permanen di file{" "}
                <code className="text-cyan-300">.env.local</code> atau Environment Variables Vercel/Netlify.
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                Reset ke Demo
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="ocean-btn-primary px-5 py-2"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
