import { NextResponse } from "next/server";


const SYSTEM_PROMPT = `Anda adalah "OceanAI", Asisten Kecerdasan Buatan Pakar Teknik Kelautan (Ocean & Marine Engineering) yang dirancang khusus untuk mendampingi mahasiswa Teknik Kelautan.

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

## FOKUS BIDANG TEKNIK KELAUTAN

Jawab pertanyaan seputar:
- Teori Gelombang (Airy, Stokes, dispersi, JONSWAP, Pierson-Moskowitz)
- Hidrodinamika & Gaya Gelombang (Persamaan Morison $F = F_D + F_I$, bilangan $KC$, $Re$)
- Bangunan Lepas Pantai (Jacket, TLP, SPAR, FPSO, mooring catenary)
- Teknik Pantai & Pelabuhan (refraksi, difraksi, shoaling, breakwater Hudson, transpor sedimen)
- Pipa Bawah Laut (DNV-ST-F101, wall thickness, stabilitas dasar laut, buckling)
- Arsitektur Perkapalan & Stabilitas Apung (GZ, metasenter $GM$, bilangan Froude $Fn$)
- Korosi & Material Laut (SACP, coating, DNV-RP-B401)
- Komputasi Numerik: Python (NumPy, SciPy, Matplotlib) atau MATLAB

## LAMPIRAN FILE
Pengguna dapat mengirim gambar, DOCX, atau berkas teks. Baca isi lampiran secara cermat, kutip bagian relevan, dan analisis sesuai konteks Teknik Kelautan. Jika lampiran berupa gambar rumus, tabel, atau sketsa, transkripsikan lalu jelaskan.

## GAYA BAHASA
Komunikatif dan terstruktur dengan heading (#, ##) yang rapi, mudah dipahami mahasiswa S1/S2 Teknik Kelautan, akurat berdasarkan standar industri (API RP 2A, DNV, ABS).`;

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
    const { messages = [], model = "qwen3.8-max", stream = true, temperature = 0.7 } = body;

    // Check if system message already exists; if not, prepend our ocean engineering system prompt
    const hasSystemMessage = messages.some((m: { role: string }) => m.role === "system");
    const finalMessages = hasSystemMessage
      ? messages
      : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    const payload = {
      model,
      messages: finalMessages,
      stream,
      temperature,
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
      return new Response(mecutinaiResponse.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
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
