"use client";

import React from "react";
import { Waves, Anchor, Ship, Shell, Flame, Code, Calculator } from "lucide-react";

export interface TopicPrompt {
  id: string;
  category: string;
  icon: React.ReactNode;
  title: string;
  formulaPreview?: string;
  prompt: string;
}

const TOPICS: TopicPrompt[] = [
  {
    id: "airy-dispersion",
    category: "Teori Gelombang",
    icon: <Waves className="w-4 h-4 text-cyan-400" />,
    title: "Persamaan Dispersi Airy",
    formulaPreview: "\\omega^2 = gk \\tanh(kh)",
    prompt:
      "Tolong jelaskan secara mendalam Persamaan Dispersi Gelombang Laut Airy: \\omega^2 = gk \\tanh(kh). Jelaskan penyederhanaannya untuk laut dalam (h > L/2) dan laut dangkal (h < L/20), serta berikan langkah-langkah menghitung panjang gelombang L jika diketahui periode T = 10 s dan kedalaman h = 40 m.",
  },
  {
    id: "morison-equation",
    category: "Offshore Structure",
    icon: <Anchor className="w-4 h-4 text-amber-400" />,
    title: "Gaya Morison pada Tiang Jacket",
    formulaPreview: "F = \\frac{1}{2}\\rho C_D D u|u| + \\rho C_M \\frac{\\pi D^2}{4} \\dot{u}",
    prompt:
      "Jelaskan Persamaan Morison untuk menghitung beban hidrodinamika gelombang pada kolom struktur lepas pantai: F = F_D + F_I. Kapan komponen Drag dominan dan kapan Inersia dominan berdasarkan Bilangan Keulegan-Carpenter (KC)?",
  },
  {
    id: "hudson-formula",
    category: "Teknik Pantai",
    icon: <Shell className="w-4 h-4 text-emerald-400" />,
    title: "Rumus Hudson Pemecah Gelombang",
    formulaPreview: "W = \\frac{\\gamma_r H^3}{K_D (S_r - 1)^3 \\cot\\theta}",
    prompt:
      "Bagaimana cara menentukan berat batu pelindung (armor unit) pemecah gelombang (breakwater) dengan Rumus Hudson: W = (\\gamma_r H^3) / (K_D (S_r - 1)^3 \\cot\\theta)? Berikan penjelasan setiap parameter dan contoh perhitungan untuk gelombang rencana H = 3.5 m.",
  },
  {
    id: "ship-stability",
    category: "Hidrodinamika & Kapal",
    icon: <Ship className="w-4 h-4 text-indigo-400" />,
    title: "Stabilitas Kapal & Lengan GZ",
    formulaPreview: "GZ = GM \\sin\\theta",
    prompt:
      "Jelaskan konsep kurva stabilitas statis kapal dan penentuan lengan penegak GZ. Definisikan posisi titik metasenter M, titik berat G, dan titik apung B (KM, KG, KB), serta apa pengaruh nilai GM negatif terhadap stabilitas kapal.",
  },
  {
    id: "subsea-pipeline",
    category: "Pipa Bawah Laut",
    icon: <Calculator className="w-4 h-4 text-purple-400" />,
    title: "Kalkulasi Tebal Pipa Laut (DNV)",
    formulaPreview: "t = \\frac{P_i D}{2 (\\text{SMYS}) f_d} + t_{corr}",
    prompt:
      "Bagaimana tahapan menentukan ketebalan dinding pipa bawah laut (subsea pipeline wall thickness) berdasarkan kriteria burst pressure menurut standar DNV-ST-F101 dan API 1111? Sertakan faktor korosi dan safety factor.",
  },
  {
    id: "python-wave-code",
    category: "Komputasi Kelautan",
    icon: <Code className="w-4 h-4 text-rose-400" />,
    title: "Simulasi Python: Permukaan Gelombang",
    formulaPreview: "\\eta(x,t) = \\frac{H}{2} \\cos(kx - \\omega t)",
    prompt:
      "Buatkan skrip Python lengkap menggunakan NumPy dan Matplotlib untuk memplot profil elevasi muka air gelombang laut linier: \\eta(x,t) = (H/2) \\cos(kx - \\omega t), lengkap dengan grafik kecepatan partikel horizontal u dan vertikal w di berbagai kedalaman z.",
  },
];

interface OceanTopicCardsProps {
  onSelectPrompt: (promptText: string) => void;
}

export function OceanTopicCards({ onSelectPrompt }: OceanTopicCardsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
          <Waves className="w-4 h-4" /> Topik Belajar Populer Teknik Kelautan
        </h4>
        <span className="text-[11px] text-slate-400">Klik untuk langsung bertanya</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectPrompt(topic.prompt)}
            className="ocean-topic-card text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-cyan-400 flex items-center gap-1.5">
                {topic.icon}
                {topic.category}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
              {topic.title}
            </div>
            {topic.formulaPreview && (
              <div className="mt-2 py-1 px-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-cyan-200/90 truncate">
                ${topic.formulaPreview}$
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
