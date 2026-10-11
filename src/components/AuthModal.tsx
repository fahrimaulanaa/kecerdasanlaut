"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User, AlertCircle, Waves, Check, ArrowRight, Flame } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFirebaseConfig: () => void;
}

export function AuthModal({ isOpen, onClose, onOpenFirebaseConfig }: AuthModalProps) {
  const { signIn, signUp, resetPassword, loginAsGuest, isFirebaseConfigured } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const res = await signIn(email, password);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || "Gagal masuk. Periksa email dan sandi Anda.");
        }
      } else if (mode === "register") {
        if (password.length < 6) {
          setError("Kata sandi minimal 6 karakter.");
          setIsSubmitting(false);
          return;
        }
        const res = await signUp(email, password, displayName);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || "Pendaftaran gagal. Silakan coba lagi.");
        }
      } else if (mode === "forgot") {
        const res = await resetPassword(email);
        if (res.success) {
          setSuccessMsg(res.message || "Tautan pemulihan kata sandi telah dikirim!");
        } else {
          setError(res.error || "Gagal mengirim link reset.");
        }
      }
    } catch {
      setError("Terjadi kesalahan jaringan atau sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    onClose();
  };

  return (
    <div className="ocean-modal-backdrop">
      <div className="ocean-modal-card max-w-md">
        <div className="ocean-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {mode === "login" && "Masuk ke OceanAI"}
                {mode === "register" && "Registrasi Akun Mahasiswa"}
                {mode === "forgot" && "Reset Kata Sandi"}
              </h3>
              <p className="text-xs text-slate-400">
                Portal Belajar & Riset Teknik Kelautan
              </p>
            </div>
          </div>
          <button onClick={onClose} className="ocean-modal-close-btn" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Firebase Connection Status Notice */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <Flame
                className={`w-4 h-4 ${
                  isFirebaseConfigured ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span className="text-slate-300">
                {isFirebaseConfigured
                  ? "Firebase Auth Aktif"
                  : "Mode Demo / Belum Terhubung Firebase"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFirebaseConfig();
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium underline text-[11px]"
            >
              Pengaturan Firebase
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== "forgot" && (
            <div className="flex rounded-xl bg-slate-900/60 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  mode === "login"
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  mode === "register"
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Daftar Baru
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === "register" && (
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="ocean-input pl-9"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Email Mahasiswa</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="nama@kelautan.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ocean-input pl-9"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">Kata Sandi</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px]"
                    >
                      Lupa sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ocean-input pl-9"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full ocean-btn-primary py-2.5 mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>
                    {mode === "login" && "Masuk ke Akun"}
                    {mode === "register" && "Buat Akun Sekarang"}
                    {mode === "forgot" && "Kirim Email Reset"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === "forgot" && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs text-slate-400 hover:text-cyan-300"
              >
                ← Kembali ke halaman Masuk
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-slate-400 hover:text-cyan-300 underline"
            >
              Masuk Cepat Sebagai Tamu Mahasiswa (Tanpa Akun)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
