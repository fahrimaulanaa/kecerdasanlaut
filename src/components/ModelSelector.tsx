"use client";

import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, Check, Sparkles } from "lucide-react";

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
    description: "Optimal untuk persamaan matematika, penurunan gelombang, & kalkulasi fluida.",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    category: "Reasoning",
    description: "Penalaran bertahap mendalam untuk masalah struktur offshore kompleks.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    category: "Analisis",
    description: "Sintesis konseptual terbaik untuk penjelasan terstruktur dan laporan teknis.",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    category: "Multiguna",
    description: "Model serbaguna untuk problem solving dan konsep kelautan umum.",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT 5.6 Sol",
    category: "Koding",
    description: "Khusus untuk skrip komputasi numerik Python, NumPy, dan MATLAB.",
  },
  {
    id: "qwen3.8-flash",
    name: "Qwen 3.8 Flash",
    category: "Cepat",
    description: "Respons kilat untuk tanya jawab definisi dan formula ringkas.",
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    category: "Konteks Panjang",
    description: "Dapat menelaah dokumen regulasi DNV/API yang panjang.",
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
  direction = "down",
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
    category: "Model",
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="claude-model-trigger"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-[13px]">{currentModel.name}</span>
        {currentModel.category && (
          <span className="text-[11px] text-stone-500 font-normal">
            · {currentModel.category}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-150 ${
            isOpen ? (direction === "up" ? "rotate-0" : "rotate-180") : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`claude-model-popover ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-1.5"
          }`}
        >
          <div className="px-3.5 py-2.5 border-b border-stone-200/70 bg-stone-50/50">
            <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
              Pilih Model Kecerdasan Buatan
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {models.map((m) => {
              const isSelected = m.id === selectedModel;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsOpen(false);
                  }}
                  className={`claude-model-item ${isSelected ? "selected" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-stone-800">
                          {m.name}
                        </span>
                        {m.category && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200/80 text-stone-600 font-medium">
                            {m.category}
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                          {m.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
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
