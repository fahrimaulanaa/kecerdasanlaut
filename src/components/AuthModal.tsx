"use client";

import React, { useState } from "react";
import { AlertCircle, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type VerifiedStudent = {
  nim: string;
  fullName: string;
  studyProgram: string;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { verifyNim, completeLogin } = useAuth();
  const [nim, setNim] = useState("");
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setNim("");
    setVerifiedStudent(null);
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setVerifiedStudent(null);
    setIsSubmitting(true);
    const result = await verifyNim(nim);
    if (result.success) {
      setVerifiedStudent(result.student);
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  const handleContinue = () => {
    if (!verifiedStudent) return;
    completeLogin(verifiedStudent);
    handleClose();
  };

  return (
    <div className="claude-modal-backdrop">
      <div className="claude-modal-card max-w-md">
        <div className="claude-modal-header">
          <div>
            <h3 className="text-base font-bold text-stone-900">Login Mahasiswa</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Verifikasi melalui data resmi PDDIKTI
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!verifiedStudent ? (
            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-stone-700 mb-1 text-xs font-medium">
                  NIM (Nomor Induk Mahasiswa)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  required
                  value={nim}
                  onChange={(event) => setNim(event.target.value)}
                  placeholder="Contoh: 15524032"
                  className="claude-input"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-stone-800 text-white py-2.5 text-xs font-semibold hover:bg-stone-900 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSubmitting ? "Memverifikasi..." : "Proses Login"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-3">
                  <Check className="w-4 h-4" />
                  Data mahasiswa ditemukan
                </div>
                <div className="space-y-1 text-sm text-stone-800">
                  <p><span className="text-stone-500">NIM:</span> {verifiedStudent.nim}</p>
                  <p><span className="text-stone-500">Nama:</span> {verifiedStudent.fullName}</p>
                  <p><span className="text-stone-500">Prodi:</span> {verifiedStudent.studyProgram}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#c2613a] text-white py-2.5 text-xs font-semibold hover:bg-[#b0532f]"
              >
                Lanjutkan
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setVerifiedStudent(null)}
                className="w-full text-xs text-stone-500 hover:text-stone-800"
              >
                Gunakan NIM lain
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
