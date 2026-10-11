"use client";

import React from "react";
import { ArrowUpRight, Compass, Waves, Anchor, Ship, Shell, Code } from "lucide-react";

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
    icon: <Waves className="w-4 h-4 text-stone-500" />,
    title: "Persamaan Dispersi Airy",
    formulaPreview: "\\omega^2 = gk \\tanh(kh)",
    prompt:
      "Jelaskan penurunan dan penerapan Persamaan Dispersi Gelombang Airy \\omega^2 = gk \\tanh(kh) untuk laut dalam dan dangkal, serta berikan contoh perhitungan panjang gelombang L jika T = 10 s dan kedalaman h = 40 m.",
  },
  {
    id: "morison-equation",
    category: "Offshore Structure",
    icon: <Anchor className="w-4 h-4 text-stone-500" />,
    title: "Gaya Morison Kolom Jacket",
    formulaPreview: "F = F_D + F_I",
    prompt:
      "Jelaskan Persamaan Morison untuk gaya hidrodinamika gelombang pada kolom struktur jacket lepas pantai. Kapan gaya Drag dominan dan kapan gaya Inersia dominan berdasarkan Bilangan Keulegan-Carpenter (KC)?",
  },
  {
    id: "hudson-formula",
    category: "Teknik Pantai",
    icon: <Shell className="w-4 h-4 text-stone-500" />,
    title: "Rumus Hudson Breakwater",
    formulaPreview: "W = \\frac{\\gamma_r H^3}{K_D (S_r - 1)^3 \\cot\\theta}",
    prompt:
      "Bagaimana cara menentukan berat batu pelindung (armor unit) pemecah gelombang dengan Rumus Hudson? Berikan contoh perhitungan untuk tinggi gelombang rencana H = 3.5 m.",
  },
  {
    id: "ship-stability",
    category: "Hidrodinamika & Kapal",
    icon: <Ship className="w-4 h-4 text-stone-500" />,
    title: "Stabilitas Kapal & Lengan GZ",
    formulaPreview: "GZ = GM \\sin\\theta",
    prompt:
      "Jelaskan konsep kurva stabilitas statis kapal dan penentuan lengan penegak GZ. Definisikan hubungan titik metasenter M, titik berat G, dan titik apung B (KM, KG, KB).",
  },
  {
    id: "python-wave-code",
    category: "Komputasi Kelautan",
    icon: <Code className="w-4 h-4 text-stone-500" />,
    title: "Simulasi Python: Elevasi Gelombang",
    formulaPreview: "\\eta(x,t) = \\frac{H}{2} \\cos(kx - \\omega t)",
    prompt:
      "Buatkan skrip Python menggunakan NumPy dan Matplotlib untuk memplot profil elevasi muka air gelombang linier \\eta(x,t) = (H/2) \\cos(kx - \\omega t) beserta medan kecepatan partikel air.",
  },
  {
    id: "incompressible-fluid",
    category: "Mekanika Fluida",
    icon: <Compass className="w-4 h-4 text-stone-500" />,
    title: "Fluida Incompressible & Kontinuitas",
    formulaPreview: "\\nabla \\cdot \\mathbf{u} = 0",
    prompt:
      "Jelaskan konsep fluida inkompresibel dan penurunan persamaan kontinuitas \\nabla \\cdot \\mathbf{u} = 0 dari hukum kekekalan massa, serta perannya dalam hidrodinamika kelautan.",
  },
];

interface OceanTopicCardsProps {
  onSelectPrompt: (promptText: string) => void;
}

export function OceanTopicCards({ onSelectPrompt }: OceanTopicCardsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto my-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectPrompt(topic.prompt)}
            className="claude-topic-card group"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-800 transition-colors">
                {topic.title}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors shrink-0" />
            </div>
            <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">
              {topic.category} {topic.formulaPreview ? `· $${topic.formulaPreview}$` : ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
