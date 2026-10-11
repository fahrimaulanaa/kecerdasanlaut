import { NextResponse } from "next/server";

const DEFAULT_MODELS = [
  { id: "qwen3.8-max", name: "Qwen 3.8 Max (Rekomendasi Fisika & Formula)", category: "Premium" },
  { id: "qwen3.8-flash", name: "Qwen 3.8 Flash (Respons Cepat)", category: "Fast" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro (Penalaran Rumus Kompleks)", category: "Reasoning" },
  { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", category: "Fast" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5 (Analisis & Laporan)", category: "Premium" },
  { id: "gpt-5.6-luna", name: "GPT 5.6 Luna (Multiguna)", category: "Advanced" },
  { id: "gpt-5.6-sol", name: "GPT 5.6 Sol (Koding & Simulasi)", category: "Advanced" },
  { id: "glm-5.3", name: "GLM 5.3", category: "Standard" },
  { id: "kimi-k3", name: "Kimi K3 (Analisis Dokumen Panjang)", category: "Advanced" },
  { id: "minimax-m3", name: "MiniMax M3", category: "Standard" },
];

export async function GET() {
  try {
    const apiKey =
      process.env.MECUTINAI_API_KEY ||
      "sk_ip70YP5ZHmBf6CIamksvU62KVSaClmm8EZ4H49mTLSzGBWCP";
    const baseUrl = process.env.MECUTINAI_BASE_URL || "https://mecutinai.com/api/v1";

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache 5 menit
    });

    if (!response.ok) {
      console.warn("Failed to fetch models from mecutinai, using fallback list:", response.statusText);
      return NextResponse.json({ models: DEFAULT_MODELS });
    }

    const data = await response.json();
    const remoteModels = (data.data || []).map((m: { id: string }) => {
      const match = DEFAULT_MODELS.find((dm) => dm.id === m.id);
      return {
        id: m.id,
        name: match ? match.name : m.id,
        category: match ? match.category : "General",
      };
    });

    return NextResponse.json({
      models: remoteModels.length > 0 ? remoteModels : DEFAULT_MODELS,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json({ models: DEFAULT_MODELS });
  }
}
