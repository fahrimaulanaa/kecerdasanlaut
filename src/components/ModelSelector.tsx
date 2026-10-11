"use client";

import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ModelBrandLogo } from "./ModelLogos";

export interface AIModel {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

const DEFAULT_MODELS: AIModel[] = [
  {
    id: "qwen3.8-max",
    name: "Qwen 3.8 Max",
    category: "Fisika & Rumus",
    description: "Sangat unggul untuk persamaan diferensial gelombang, hidrodinamika, & kalkulasi numerik.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    category: "Analisis & Laporan",
    description: "Pemahaman konseptual terbaik untuk sintesis materi dan regulasi maritim.",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    category: "Penalaran Rumit",
    description: "Penalaran matematika logis tingkat lanjut untuk beban struktur offshore.",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    category: "Multiguna",
    description: "Model canggih serbaguna untuk konsep teknik kelautan dan problem-solving.",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT 5.6 Sol",
    category: "Koding & Script",
    description: "Optimal untuk skrip simulasi Python, NumPy, dan MATLAB.",
  },
  {
    id: "qwen3.8-flash",
    name: "Qwen 3.8 Flash",
    category: "Respons Kilat",
    description: "Inferensi sangat cepat untuk tanya jawab konsep ringkas.",
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    category: "Konteks Panjang",
    description: "Menganalisis dokumen panjang standar kelautan (DNV, API, dll.).",
  },
  {
    id: "glm-5.3",
    name: "GLM 5.3",
    category: "General",
    description: "Model bahasa umum untuk bantuan belajar harian mahasiswa.",
  },
  {
    id: "minimax-m3",
    name: "MiniMax M3",
    category: "General",
    description: "Model penalaran umum dan tanya jawab teori dasar.",
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  direction?: "up" | "down";
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
  direction = "up",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>(DEFAULT_MODELS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models) && data.models.length > 0) {
            const enriched: AIModel[] = data.models.map(
              (m: { id: string; name?: string; category?: string }) => {
                const found = DEFAULT_MODELS.find((dm) => dm.id === m.id);
                return {
                  id: m.id,
                  name: found?.name || m.name || m.id,
                  category: found?.category || m.category || "General",
                  description:
                    found?.description || "Model AI untuk analisis tugas teknik kelautan.",
                };
              }
            );
            setModels(enriched);
          }
        }
      } catch (e) {
        console.warn("Using default models fallback:", e);
      }
    }

    fetchModels();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentModel = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    category: "Aktif",
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button - Minimal Claude Style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors text-xs cursor-pointer select-none border border-transparent hover:border-stone-200"
        aria-expanded={isOpen}
      >
        <ModelBrandLogo modelId={currentModel.id} className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-stone-800 truncate max-w-[140px]">
          {currentModel.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 ${
            isOpen ? (direction === "up" ? "rotate-0" : "rotate-180") : ""
          }`}
        />
      </button>

      {/* Popover Menu - Clean Single-Column List with Logos */}
      {isOpen && (
        <div
          className={`absolute ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } right-0 w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col`}
          style={{ maxHeight: "380px" }}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              Pilihan Model AI
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {models.length} model aktif
            </span>
          </div>

          {/* Model Options List */}
          <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-stone-50">
            {models.map((m) => {
              const isSelected = m.id === selectedModel;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-50/70 border border-amber-200/60"
                      : "hover:bg-stone-50 border border-transparent"
                  }`}
                >
                  {/* Brand Logo */}
                  <div className="mt-0.5 shrink-0">
                    <ModelBrandLogo modelId={m.id} className="w-5 h-5" />
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-stone-900 truncate">
                        {m.name}
                      </span>
                      {m.category && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium shrink-0">
                          {m.category}
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="mt-0.5 text-amber-700 shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
