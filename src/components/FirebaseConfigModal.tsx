"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, Copy, ExternalLink, HelpCircle } from "lucide-react";
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
      let cleaned = rawJson.trim();
      if (cleaned.startsWith("const firebaseConfig =")) {
        cleaned = cleaned.replace("const firebaseConfig =", "").replace(/;$/, "").trim();
      }

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
        text: "Gagal memproses JSON. Harap masukkan nilai secara manual di kolom.",
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
      text: "Konfigurasi Firebase berhasil disimpan!",
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
      text: "Kembali ke Mode Demo (Firebase dinonaktifkan).",
    });
  };

  return (
    <div className="claude-modal-backdrop">
      <div className="claude-modal-card max-w-lg">
        <div className="claude-modal-header">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              Konfigurasi Firebase Auth
              {isFirebaseConfigured && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Aktif
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Hubungkan akun Firebase Console untuk otentikasi email dan kata sandi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border border-rose-200 text-rose-700"
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

          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-stone-700 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Tempel dari Firebase Console
              </span>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-amber-800 hover:text-amber-900 flex items-center gap-1 text-[11px]"
              >
                Buka Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <textarea
              className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-amber-700"
              rows={3}
              placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "proyek-id",\n  ...\n};'}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
            <button
              type="button"
              onClick={handleJsonPaste}
              className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-xs font-medium transition-colors"
            >
              Ekstrak ke Formulir
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 mb-1 font-medium">API Key *</label>
                <input
                  type="text"
                  required
                  placeholder="AIzaSy..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="claude-input"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-medium">Auth Domain</label>
                <input
                  type="text"
                  placeholder="proyek.firebaseapp.com"
                  value={config.authDomain}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                  className="claude-input"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-medium">Project ID *</label>
                <input
                  type="text"
                  required
                  placeholder="kelautan-jaya"
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                  className="claude-input"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-medium">Storage Bucket</label>
                <input
                  type="text"
                  placeholder="proyek.appspot.com"
                  value={config.storageBucket}
                  onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                  className="claude-input"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-medium">Messaging Sender ID</label>
                <input
                  type="text"
                  placeholder="1029384756"
                  value={config.messagingSenderId}
                  onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                  className="claude-input"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1 font-medium">App ID</label>
                <input
                  type="text"
                  placeholder="1:1029384:web:ab987c"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  className="claude-input"
                />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-stone-500 flex items-start gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                Pengaturan disimpan di browser. Anda juga bisa menaruhnya secara permanen di file{" "}
                <code>.env.local</code>.
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 rounded-md transition-colors text-xs"
              >
                Reset ke Demo
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="claude-btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="claude-btn-primary text-xs"
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
