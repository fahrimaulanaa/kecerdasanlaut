"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  Database,
  FileText,
  History,
  Loader2,
  Presentation,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  deleteTrainingEntry,
  loadTrainingEntries,
  saveTrainingEntry,
  sanitizeTrainingContent,
  subscribeTrainingEntries,
  TRAINING_SOURCE_LABELS,
  type TrainingEntry,
  type TrainingSourceType,
} from "@/lib/trainingStorage";
import {
  readLocalFile,
  type ChatAttachment,
} from "@/lib/fileAttachments";

type TrainingMethod = TrainingSourceType;

interface MethodOption {
  id: TrainingMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
  accept: string;
  multiple: boolean;
  hint: string;
}

const METHOD_OPTIONS: MethodOption[] = [
  {
    id: "chat-history",
    title: "Riwayat Chat Tersimpan",
    description:
      "Jadikan percakapan yang sudah tersimpan sebagai bahan pencerdasan AI.",
    icon: <History className="w-5 h-5" />,
    accept: ".txt,.md,.json,text/plain,text/markdown,application/json",
    multiple: true,
    hint: "Unggah ekspor riwayat chat (.txt, .md, atau .json).",
  },
  {
    id: "textbook",
    title: "Upload Textbook",
    description:
      "Tambahkan buku teks Teknik Kelautan sebagai rujukan utama jawaban AI.",
    icon: <BookOpen className="w-5 h-5" />,
    accept: ".pdf,.docx,.txt,.md",
    multiple: true,
    hint: "Mendukung PDF dan DOCX (maks. 8 MB per berkas).",
  },
  {
    id: "teaching-material",
    title: "Upload Bahan Ajar (PPT/PDF)",
    description:
      "Materi kuliah dari dosen dapat dipakai AI untuk menyesuaikan jawaban.",
    icon: <Presentation className="w-5 h-5" />,
    accept: ".pptx,.pdf,.docx",
    multiple: true,
    hint: "Mendukung PPTX dan PDF (maks. 8 MB per berkas).",
  },
];

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "-";
  }
}

export default function TrainingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [activeMethod, setActiveMethod] = useState<TrainingMethod>("chat-history");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pendingEntry, setPendingEntry] = useState<TrainingEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOption = useMemo(
    () =>
      METHOD_OPTIONS.find((option) => option.id === activeMethod) ??
      METHOD_OPTIONS[0],
    [activeMethod]
  );

  // Muat + sinkronkan entri training milik user.
  useEffect(() => {
    if (authLoading) return;
    const nim = user?.nim;
    if (!nim) {
      queueMicrotask(() => setEntries([]));
      return;
    }

    let isMounted = true;
    loadTrainingEntries(nim).then((loaded) => {
      if (isMounted) setEntries(loaded);
    });

    const unsubscribe = subscribeTrainingEntries(nim, (updated) => {
      if (isMounted) setEntries(updated);
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [authLoading, user?.nim]);

  const resetFiles = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildEntryFromAttachment = (
    attachment: ChatAttachment,
    method: TrainingMethod,
    index: number
  ): TrainingEntry | null => {
    const content = sanitizeTrainingContent(attachment.extractedText || "");
    if (!content) return null;
    return {
      id: `train-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      sourceType: method,
      title: attachment.name.replace(/\.[^.]+$/, "") || attachment.name,
      fileName: attachment.name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  };

  const handleSelectFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    setError(null);
    setStatus("");
    setPendingEntry(null);
    setIsProcessing(true);

    try {
      const files = Array.from(fileList);
      const attachments = await Promise.all(
        files.map((file) => readLocalFile(file, user?.uid || "guest"))
      );
      const parsedEntries = attachments
        .map((attachment, index) =>
          buildEntryFromAttachment(attachment, activeMethod, index)
        )
        .filter((entry): entry is TrainingEntry => entry !== null);

      if (!parsedEntries.length) {
        setError(
          "Tidak ada teks yang terbaca dari berkas. Pastikan berkas berisi teks yang dapat diekstrak."
        );
        return;
      }

      setPendingEntry(parsedEntries[0]);
      setStatus(
        parsedEntries.length > 1
          ? `${parsedEntries.length} berkas terbaca. Menyimpan satu per satu, mulai dari berkas pertama.`
          : "Berkas siap disimpan sebagai materi pencerdasan AI."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal membaca berkas yang diunggah."
      );
    } finally {
      setIsProcessing(false);
      resetFiles();
    }
  };

  const handleSavePending = async () => {
    if (!pendingEntry) return;
    if (!user?.nim) {
      setError("Masuk dengan NIM untuk menyimpan materi training.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const saved = await saveTrainingEntry(user.nim, pendingEntry);
    setIsSaving(false);

    if (!saved) {
      setError("Gagal menyimpan materi training. Periksa koneksi lalu coba lagi.");
      return;
    }

    setEntries((prev) => [pendingEntry, ...prev]);
    setPendingEntry(null);
    setStatus("Materi pencerdasan AI berhasil disimpan.");
  };

  const handleDelete = async (entry: TrainingEntry) => {
    if (!user?.nim) return;
    setError(null);
    const removed = await deleteTrainingEntry(entry.id, user.nim);
    if (!removed) {
      setError("Gagal menghapus materi training.");
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    setStatus("Materi training dihapus.");
  };

  const hasAccess = Boolean(user?.nim);

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#2d2b28]">
      <header className="sticky top-0 z-20 border-b border-[#e8e6df] bg-[#faf9f5]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-stone-600 hover:bg-[#eae8e1] hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c2613a]/10 text-[#c2613a]">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900">Train AI</h1>
              <p className="text-[11px] text-stone-500">
                Pencerdasan AI dari riwayat chat, textbook, dan bahan ajar
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {!authLoading && !hasAccess && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Masuk dengan NIM terlebih dahulu agar materi training dapat disimpan
            dan dipakai AI pada percakapan Anda.
          </div>
        )}

        {/* Pilihan metode pencerdasan */}
        <section className="grid gap-3 sm:grid-cols-3">
          {METHOD_OPTIONS.map((option) => {
            const isActive = option.id === activeMethod;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setActiveMethod(option.id);
                  setPendingEntry(null);
                  setError(null);
                  setStatus("");
                }}
                className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-[#c2613a] bg-white shadow-sm"
                    : "border-[#e8e6df] bg-white/60 hover:border-[#d8d5cc] hover:bg-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-[#c2613a]/10 text-[#c2613a]"
                      : "bg-[#f2f0ea] text-stone-500"
                  }`}
                >
                  {option.icon}
                </span>
                <span className="text-sm font-semibold text-stone-900">
                  {option.title}
                </span>
                <span className="text-[11px] leading-relaxed text-stone-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </section>

        {/* Area unggah metode terpilih */}
        <section className="rounded-2xl border border-[#e8e6df] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                {activeOption.title}
              </h2>
              <p className="text-[11px] text-stone-500">{activeOption.hint}</p>
            </div>
            <button
              type="button"
              disabled={isProcessing || !hasAccess}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-[#c2613a] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#b0532f] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{isProcessing ? "Memproses..." : "Pilih Berkas"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple={activeOption.multiple}
              accept={activeOption.accept}
              className="hidden"
              onChange={(event) => void handleSelectFiles(event.target.files)}
            />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              <X className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {status && !error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
              <Check className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              <span>{status}</span>
            </div>
          )}

          {pendingEntry && (
            <div className="mt-4 rounded-xl border border-[#e8e6df] bg-[#faf9f5] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                <FileText className="w-4 h-4 text-stone-500" />
                <span className="truncate">{pendingEntry.title}</span>
              </div>
              <p className="mt-1 text-[10px] text-stone-500">
                {TRAINING_SOURCE_LABELS[pendingEntry.sourceType]} ·{" "}
                {pendingEntry.content.length.toLocaleString("id-ID")} karakter
              </p>
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-[#eeece6] bg-white p-3 text-[11px] leading-relaxed text-stone-600">
                {pendingEntry.content.slice(0, 1200)}
                {pendingEntry.content.length > 1200 ? "\n..." : ""}
              </pre>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSavePending()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#c2613a] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#b0532f] disabled:opacity-40 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan ke Training</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingEntry(null);
                    setStatus("");
                  }}
                  className="rounded-lg border border-[#e8e6df] px-3 py-1.5 text-[11px] text-stone-600 hover:bg-[#f2f0ea] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Daftar materi training */}
        <section className="rounded-2xl border border-[#e8e6df] bg-white p-5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900">
              Materi Pencerdasan Aktif
            </h2>
            <span className="ml-auto text-[11px] text-stone-500">
              {entries.length} materi
            </span>
          </div>

          {entries.length === 0 ? (
            <p className="mt-4 text-[11px] text-stone-500">
              Belum ada materi training. Unggah riwayat chat, textbook, atau bahan
              ajar untuk mulai mencerdaskan AI.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-[#eeece6] bg-[#faf9f5] px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-stone-500">
                    {entry.sourceType === "textbook" ? (
                      <BookOpen className="w-4 h-4" />
                    ) : entry.sourceType === "teaching-material" ? (
                      <Presentation className="w-4 h-4" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-stone-800">
                      {entry.title}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      {TRAINING_SOURCE_LABELS[entry.sourceType]} ·{" "}
                      {entry.content.length.toLocaleString("id-ID")} karakter ·{" "}
                      {formatDate(entry.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(entry)}
                    className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    title="Hapus materi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
