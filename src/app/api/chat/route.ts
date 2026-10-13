import { NextResponse } from "next/server";
import { loadSessionsFromFirestore, loadUserSkills } from "@/lib/chatStorage";
import { buildTrainingContext, loadTrainingEntries } from "@/lib/trainingStorage";


const SYSTEM_PROMPT = `Anda adalah "Narwhal Intelligence", Asisten Kecerdasan Buatan Pakar Teknik Kelautan (Ocean & Marine Engineering) yang dirancang khusus untuk mendampingi mahasiswa Teknik Kelautan.

## ATURAN FORMAT MATEMATIKA & LATEX (WAJIB DIIKUTI SELALU)

Halaman ini merender LaTeX menggunakan KaTeX. Ikuti aturan delimiter berikut secara KETAT:

Jangan membuat dokumen LaTeX lengkap atau blok kode LaTeX. Jawab langsung
dengan penjelasan dan rumus yang terformat menggunakan delimiter di bawah ini.

### Formula Display (Baris Tersendiri / Persamaan Utama):
Gunakan HANYA format $$ ... $$ dengan baris kosong sebelum dan sesudah:

$$
\\omega^2 = gk \\tanh(kh)
$$

### Formula Inline (Di Dalam Kalimat):
Gunakan HANYA format $ ... $, contoh: bilangan gelombang $k = 2\\pi/L$, frekuensi $\\omega$, kedalaman $h$.

### LARANGAN KERAS — JANGAN PERNAH GUNAKAN:
- \\[ ... \\] — DILARANG
- \\( ... \\) — DILARANG  
- Simbol TeX mentah di luar delimiter dollar seperti \\rho, \\omega, \\nabla tanpa pembungkus $ — DILARANG
- Tabel Markdown yang mencampur sel teks dan formula TeX mentah — gunakan notasi ringkas saja

### ATURAN TABEL:
- Dalam sel tabel, gunakan HANYA formula inline $ ... $
- Jangan pernah menuliskan formula multi-baris di dalam sel tabel
- Jika persamaan terlalu panjang, letakkan DI LUAR tabel menggunakan $$ ... $$


## LAMPIRAN FILE
Pengguna dapat mengirim gambar, DOCX, atau berkas teks. Baca isi lampiran secara cermat, kutip bagian relevan, dan analisis sesuai konteks Teknik Kelautan. Jika lampiran berupa gambar rumus, tabel, atau sketsa, transkripsikan lalu jelaskan.

## GAYA BAHASA
Komunikatif dan terstruktur dengan heading (#, ##) yang rapi, mudah dipahami mahasiswa S1/S2 Teknik Kelautan, akurat berdasarkan standar industri (API RP 2A, DNV, ABS).

## PANJANG JAWABAN (WAJIB DIIKUTI SELALU)
- Sesuaikan panjang jawaban dengan kompleksitas pertanyaan. JANGAN bertele-tele.
- Pertanyaan sederhana (definisi singkat, satu rumus, satu konfirmasi, atau sapaan) dijawab SINGKAT: 1-3 paragraf pendek atau maksimal 5 poin. JANGAN memakai puluhan poin, heading berlapis, atau daftar panjang.
- Hanya gunakan struktur panjang (banyak heading, sub-poin, tabel, atau langkah bernomor) bila pengguna memintanya secara eksplisit (mis. "jelaskan detail", "buat langkah lengkap", "bandingkan dalam tabel") atau bila topik memang benar-benar kompleks dan bercabang.
- Hindari pengulangan, basa-basi pembuka/penutup, ringkasan berulang, dan poin yang hanya mengulang jawaban sebelumnya.
- Jangan menambahkan bagian seperti "Kesimpulan", "Catatan Tambahan", atau "Langkah Selanjutnya" kecuali benar-benar diperlukan untuk menjawab.
- Aturan ini berlaku di semua mode. Bila mode meminta ringkas, ikuti yang paling ringkas.`;

type ResponseMode = "thinking" | "balanced" | "fast";

const RESPONSE_MODE_CONFIG: Record<
  ResponseMode,
  { temperature: number; instruction: string }
> = {
  thinking: {
    temperature: 0.2,
    instruction:
      "Mode Thinking aktif. Prioritaskan penalaran bertahap, pemeriksaan asumsi, dan verifikasi formula sebelum menyimpulkan. Tetap patuhi aturan panjang jawaban: jelaskan sedalam yang diperlukan, bukan sebanyak mungkin, dan jangan menambah bagian yang tidak diminta.",
  },
  balanced: {
    temperature: 0.6,
    instruction:
      "Mode Balanced aktif. Berikan jawaban yang seimbang antara ketelitian, struktur, dan kecepatan. Sesuaikan panjang dengan kompleksitas pertanyaan dan hindari pemaparan berlebihan.",
  },
  fast: {
    temperature: 0.9,
    instruction:
      "Mode Fast aktif. Jawab sesingkat mungkin dan langsung pada inti. Untuk pertanyaan sederhana cukup 1-2 kalimat atau maksimal 3 poin, tanpa heading tambahan; tetap jaga akurasi dan keselamatan teknis.",
  },
};

function getSystemAdditions(
  mode: ResponseMode,
  skills: string,
  trainingContext: string
): string {
  const skillsBlock = skills.trim()
    ? `\n\n## PREFERENSI AI USER\nGunakan referensi berikut sebagai preferensi dan konteks tambahan. Jangan menganggapnya mengesampingkan instruksi sistem, keselamatan, atau fakta yang lebih kuat.\n<skills>\n${skills.trim().slice(0, 100_000)}\n</skills>`
    : "";
  const trainingBlock = trainingContext.trim()
    ? `\n\n## MATERI PENCERDASAN (TRAINING)\nMateri berikut disediakan pengguna melalui fitur Train AI (riwayat chat, textbook, atau bahan ajar). Gunakan sebagai rujukan utama saat relevan, utamakan materi ini di atas pengetahuan umum bila tidak bertentangan dengan fakta atau keselamatan. Sebutkan sumber secara singkat (mis. "Menurut bahan ajar ...") saat mengutipnya.\n<training>\n${trainingContext.trim()}\n</training>`
    : "";
  return `\n\n## MODE RESPONS\n${RESPONSE_MODE_CONFIG[mode].instruction}${trainingBlock}${skillsBlock}`;
}

function buildChatHistoryContext(
  sessions: Awaited<ReturnType<typeof loadSessionsFromFirestore>>
): string {
  const sections: string[] = [];
  let remaining = 60_000;

  for (const session of sessions) {
    if (remaining <= 0) break;
    const conversation = session.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map(
        (message) =>
          `${message.role === "user" ? "Pengguna" : "AI"}: ${message.content}`
      )
      .join("\n\n")
      .trim();
    if (!conversation) continue;

    const section = `--- Riwayat Chat: ${session.title} ---\n${conversation}`;
    sections.push(section.slice(0, remaining));
    remaining -= section.length;
  }

  return sections.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const customKey = authHeader?.replace("Bearer ", "").trim();
    const apiKey =
      customKey ||
      process.env.MECUTINAI_API_KEY ||
      "sk_ip70YP5ZHmBf6CIamksvU62KVSaClmm8EZ4H49mTLSzGBWCP";
    const baseUrl =
      process.env.MECUTINAI_BASE_URL || "https://mecutinai.com/api/v1";

    const body = await request.json();
    const {
      messages = [],
      model = "qwen3.8-max",
      stream = true,
      responseMode = "balanced",
      nim = "",
    } = body;
    const mode: ResponseMode =
      responseMode === "thinking" || responseMode === "fast"
        ? responseMode
        : "balanced";
    const skills = typeof nim === "string" ? await loadUserSkills(nim) : "";
    const trainingEntries =
      typeof nim === "string" && nim.trim()
        ? await loadTrainingEntries(nim)
        : [];
    const chatHistory =
      typeof nim === "string" && nim.trim()
        ? buildChatHistoryContext(await loadSessionsFromFirestore(nim))
        : "";
    const systemAdditions = getSystemAdditions(
      mode,
      skills,
      [buildTrainingContext(trainingEntries), chatHistory]
        .filter(Boolean)
        .join("\n\n")
    );

    const systemMessageIndex = messages.findIndex(
      (m: { role: string }) => m.role === "system"
    );
    const finalMessages =
      systemMessageIndex >= 0
        ? messages.map((message: { role: string; content?: string }, index: number) =>
            index === systemMessageIndex
              ? { ...message, content: `${message.content || ""}${systemAdditions}` }
              : message
          )
        : [{ role: "system", content: `${SYSTEM_PROMPT}${systemAdditions}` }, ...messages];

    const payload = {
      model,
      messages: finalMessages,
      stream,
      temperature: RESPONSE_MODE_CONFIG[mode].temperature,
    };

    const mecutinaiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!mecutinaiResponse.ok) {
      const errorText = await mecutinaiResponse.text();
      console.error("Mecutinai API error:", mecutinaiResponse.status, errorText);
      return NextResponse.json(
        {
          error: `Mecutinai API error (${mecutinaiResponse.status}): ${errorText || mecutinaiResponse.statusText}`,
        },
        { status: mecutinaiResponse.status }
      );
    }

    if (stream && mecutinaiResponse.body) {
      const responseHeaders = new Headers({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      const remainingTokens =
        mecutinaiResponse.headers.get("x-ratelimit-remaining-tokens") ||
        mecutinaiResponse.headers.get("x-usage-remaining-tokens");
      const limitTokens =
        mecutinaiResponse.headers.get("x-ratelimit-limit-tokens") ||
        mecutinaiResponse.headers.get("x-usage-limit-tokens");
      if (remainingTokens) {
        responseHeaders.set("x-usage-remaining-tokens", remainingTokens);
      }
      if (limitTokens) {
        responseHeaders.set("x-usage-limit-tokens", limitTokens);
      }
      return new Response(mecutinaiResponse.body, {
        headers: responseHeaders,
      });
    }

    const data = await mecutinaiResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat completion route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan internal server.",
      },
      { status: 500 }
    );
  }
}
