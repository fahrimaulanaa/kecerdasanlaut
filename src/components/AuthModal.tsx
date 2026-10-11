"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User, AlertCircle, Check, ArrowRight } from "lucide-react";
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
    <div className="claude-modal-backdrop">
      <div className="claude-modal-card max-w-md">
        <div className="claude-modal-header">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {mode === "login" && "Masuk ke OceanAI"}
              {mode === "register" && "Daftar Akun Mahasiswa"}
              {mode === "forgot" && "Reset Kata Sandi"}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Portal Pembelajaran Mahasiswa Teknik Kelautan
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

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-xs">
            <span className="text-stone-600">
              {isFirebaseConfigured
                ? "● Firebase Auth Aktif"
                : "○ Mode Pengembang / Demo Aktif"}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFirebaseConfig();
              }}
              className="text-amber-800 hover:text-amber-900 font-medium underline text-[11px]"
            >
              Pengaturan Firebase
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== "forgot" && (
            <div className="flex rounded-lg bg-stone-100 p-1 border border-stone-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === "login"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-900"
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  mode === "register"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Daftar Baru
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {mode === "register" && (
              <div>
                <label className="block text-stone-700 mb-1 font-medium">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="claude-input pl-9"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-stone-700 mb-1 font-medium">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="nama@kelautan.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="claude-input pl-9"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-700 font-medium">Kata Sandi</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-amber-800 hover:text-amber-900 text-[11px]"
                    >
                      Lupa sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="claude-input pl-9"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full claude-btn-primary py-2.5 mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>
                    {mode === "login" && "Masuk"}
                    {mode === "register" && "Buat Akun"}
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
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                ← Kembali ke halaman Masuk
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-stone-200/80 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-stone-500 hover:text-stone-800 underline"
            >
              Lanjut Sebagai Tamu Mahasiswa (Tanpa Akun)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
