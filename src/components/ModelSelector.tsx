"use client";

import React, { useEffect, useState, useRef } from "react";
import { Cpu, ChevronDown, Check, Sparkles, Zap, Brain, Shield } from "lucide-react";

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
    category: "Rekomendasi",
    description: "Sangat unggul dalam formula matematika, penurunan rumus gelombang, & fisika fluida.",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    category: "Reasoning",
    description: "Penalaran logika tingkat tinggi untuk analisis struktural offshore & komputasi.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    category: "Analisis",
    description: "Sintesis teks komprehensif untuk laporan perancangan & regulasi maritim.",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    category: "Multiguna",
    description: "Model canggih seimbang untuk teori kelautan, penulisan, dan problem solving.",
  },
  {
    id: "qwen3.8-flash",
    name: "Qwen 3.8 Flash",
    category: "Cepat",
    description: "Kecepatan inferensi tinggi untuk tanya jawab kilat & tanya definisi istilah kelautan.",
  },
  {
    id: "deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    category: "Cepat",
    description: "Cepat & hemat waktu untuk tanya konsep dasar hidrodinamika.",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT 5.6 Sol",
    category: "Koding",
    description: "Optimal untuk penulisan skrip simulasi Python, NumPy, dan MATLAB.",
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    category: "Panjang",
    description: "Kapasitas konteks panjang untuk menelaah dokumen regulasi DNV/API.",
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>(DEFAULT_MODELS);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models) && data.models.length > 0) {
            // Merge with local descriptions if available
            const enriched: AIModel[] = data.models.map((m: { id: string; name?: string; category?: string }) => {
              const found = DEFAULT_MODELS.find((dm) => dm.id === m.id);
              return {
                id: m.id,
                name: found?.name || m.name || m.id,
                category: found?.category || m.category || "General",
                description: found?.description || "Model AI untuk penyelesaian tugas teknik kelautan.",
              };
            });
            setModels(enriched);
          }
        }
      } catch (e) {
        console.warn("Using default models fallback:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, []);

  // Close dropdown on outside click
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
    category: "Active",
    description: "Model aktif",
  };

  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case "Rekomendasi":
        return "badge-recommended";
      case "Reasoning":
        return "badge-reasoning";
      case "Cepat":
        return "badge-fast";
      case "Koding":
        return "badge-code";
      default:
        return "badge-general";
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "Rekomendasi":
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case "Reasoning":
        return <Brain className="w-3.5 h-3.5 text-indigo-400" />;
      case "Cepat":
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
      case "Koding":
        return <Cpu className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="model-selector-trigger"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <div className="model-icon-bubble">
            <Cpu className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="text-left">
            <div className="text-xs text-cyan-200/70 font-mono tracking-wider uppercase">Model Aktif</div>
            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span>{currentModel.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${getCategoryBadgeClass(currentModel.category)}`}>
                {currentModel.category}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-cyan-300/80 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="model-dropdown-menu">
          <div className="model-dropdown-header">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Pilih Model Kecerdasan Buatan
              </span>
              <span className="text-[11px] text-cyan-200/60 font-mono">
                {models.length} Model Tersedia
              </span>
            </div>
            <p className="text-[11px] text-slate-300/80 mt-1">
              Setiap model terhubung langsung ke API endpoint Mecutinai.com.
            </p>
          </div>

          <div className="model-dropdown-list">
            {models.map((m) => {
              const isSelected = m.id === selectedModel;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsOpen(false);
                  }}
                  className={`model-option-btn ${isSelected ? "selected" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getCategoryIcon(m.category)}</div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{m.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getCategoryBadgeClass(
                              m.category
                            )}`}
                          >
                            {m.id}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
