"use client";

import React, { useState } from "react";
import { BookOpen, X, ChevronRight, Calculator, Sparkles } from "lucide-react";
import { LatexMarkdownRenderer } from "./LatexMarkdownRenderer";

interface FormulaQuickSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAskFormula: (prompt: string) => void;
}

const FORMULAS = [
  {
    category: "Hidrodinamika Gelombang",
    title: "Persamaan Dispersi Airy",
    formula: "$$\\omega^2 = gk \\tanh(kh)$$",
    description: "Hubungan frekuensi sudut \\omega, bilangan gelombang k = 2\\pi/L, dan kedalaman h.",
    prompt: "Tolong jelaskan penurunan dan cara iterasi numerik Persamaan Dispersi Gelombang Airy: \\omega^2 = gk \\tanh(kh) lengkap dengan contoh soal.",
  },
  {
    category: "Gaya Gelombang",
    title: "Persamaan Morison (Wave Force)",
    formula: "$$dF = \\frac{1}{2}\\rho C_D D u|u| dz + \\rho C_M \\frac{\\pi D^2}{4} \\dot{u} dz$$",
    description: "Beban total gelombang pada silinder slender yang terdiri dari gaya drag dan gaya inersia.",
    prompt: "Jelaskan secara mendalam Persamaan Morison untuk gaya gelombang pada tiang struktur jacket, serta kriteria pemilihan Cd dan Cm berdasarkan standar API RP 2A.",
  },
  {
    category: "Teknik Pantai",
    title: "Rumus Hudson (Berat Armor Breakwater)",
    formula: "$$W = \\frac{\\gamma_r H^3}{K_D \\left(\\frac{\\gamma_r}{\\gamma_w} - 1\\right)^3 \\cot\\theta}$$",
    description: "Kalkulasi berat batu lindung pemecah gelombang sisi miring terhadap hantaman gelombang desain.",
    prompt: "Jelaskan dan berikan contoh perhitungan berat batu pelindung breakwater menggunakan Rumus Hudson lengkap dengan pemilihan koefisien KD untuk batu pecah vs tetrapod.",
  },
  {
    category: "Hidrodinamika Kapal",
    title: "Bilangan Froude (Froude Number)",
    formula: "$$Fn = \\frac{V}{\\sqrt{g L}}$$",
    description: "Rasio inersia terhadap gravitasi untuk keserupaan hidrodinamika tahanan gelombang kapal.",
    prompt: "Jelaskan pentingnya Bilangan Froude Fn = V / \\sqrt{gL} dalam penentuan karakteristik gelombang kapal dan hukum keserupaan model kapal di towing tank.",
  },
  {
    category: "Oseanografi Fisika",
    title: "Bilangan Formzahl (Tipe Pasang Surut)",
    formula: "$$F = \\frac{K_1 + O_1}{M_2 + S_2}$$",
    description: "Klasifikasi tipe pasang surut: harian tunggal, harian ganda, atau campuran.",
    prompt: "Jelaskan klasifikasi pasang surut berdasarkan Bilangan Formzahl F = (K1 + O1) / (M2 + S2) dan bagaimana cara interpretasi data elevasi pasut di perairan Indonesia.",
  },
  {
    category: "Arsitektur Kapal & Apung",
    title: "Tinggi Metasenter Awal (GM)",
    formula: "$$GM = KB + BM - KG$$",
    description: "Tinggi metasenter awal penentu stabilitas statis positif, netral, atau negatif.",
    prompt: "Jelaskan hubungan GM = KB + BM - KG terhadap kriteria stabilitas kapal menurut standar IMO, serta apa akibatnya jika kapal mengalami GM negatif atau excessive GM.",
  },
];

export function FormulaQuickSheet({ isOpen, onClose, onAskFormula }: FormulaQuickSheetProps) {
  const [filter, setFilter] = useState("Semua");

  if (!isOpen) return null;

  const categories = ["Semua", ...Array.from(new Set(FORMULAS.map((f) => f.category)))];
  const filtered = filter === "Semua" ? FORMULAS : FORMULAS.filter((f) => f.category === filter);

  return (
    <div className="ocean-modal-backdrop">
      <div className="ocean-modal-card max-w-2xl max-h-[85vh] flex flex-col">
        <div className="ocean-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Buku Rumus Inti Teknik Kelautan
              </h3>
              <p className="text-xs text-slate-400">
                Formula penting & terstandarisasi untuk mahasiswa Teknik Kelautan
              </p>
            </div>
          </div>
          <button onClick={onClose} className="ocean-modal-close-btn" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                filter === cat
                  ? "bg-cyan-600 text-white font-medium"
                  : "bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  {item.category}
                </span>
                <span className="text-xs text-slate-400 font-medium">{item.title}</span>
              </div>

              <div className="my-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <LatexMarkdownRenderer content={item.formula} />
              </div>

              <p className="text-xs text-slate-300 mt-2">{item.description}</p>

              <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onAskFormula(item.prompt);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Tanya & Turunkan dengan AI</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
