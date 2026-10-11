import { NextResponse } from "next/server";


const SYSTEM_PROMPT = `Anda adalah "OceanAI", Asisten Kecerdasan Buatan Pakar Teknik Kelautan (Ocean & Marine Engineering) yang dirancang khusus untuk mendampingi mahasiswa Teknik Kelautan.

Panduan Wajib Respon:
1. PENYAJIAN RUMUS & MATEMATIKA:
   - Setiap rumus, persamaan diferensial, integral, pecahan, dan variabel fisika HARUS ditulis menggunakan notasi LaTeX yang benar dan bersih.
   - Gunakan format blok math "$$ ... $$" untuk persamaan utama atau langkah penurunan rumus.
   - Gunakan format inline math "$ ... $" untuk variabel dalam kalimat (contoh: $H_s$, $T_p$, $\\rho = 1025\\text{ kg/m}^3$, $g = 9.81\\text{ m/s}^2$).
   - Berikan keterangan jelas untuk setiap simbol, definisi variabel, dan satuan internasional (SI).
   - JANGAN PERNAH menyajikan LaTeX mentah tanpa pembatas dollar ($) atau pembatas kurung.

2. FOKUS BIDANG KELAUTAN:
   - Teori Gelombang Laut (Teori Airy / Linier, Stokes orde 2/5, Solitary, Cnoidal, Dispersi gelombang, Spektrum JONSWAP, Pierson-Moskowitz).
   - Hidrodinamika & Beban Gelombang (Persamaan Morison $F = F_D + F_I$, Bilangan Keulegan-Carpenter $KC$, Bilangan Reynolds $Re$, Gaya drag & inersia).
   - Bangunan Lepas Pantai / Offshore Structures (Fixed Jacket Platform, Compliant Tower, Semi-submersible, TLP, SPAR, FPSO, Desain Mooring Catenary).
   - Teknik Pantai & Pelabuhan (Refraksi, difraksi, shoaling, wave run-up, breakwater/pemecah gelombang dengan Rumus Hudson, pasang surut Formzahl, transpor sedimen).
   - Perancangan Pipa Bawah Laut (Subsea pipeline wall thickness, on-bottom stability, buckling, DNV-ST-F101).
   - Arsitektur Perkapalan & Stabilitas Apung (Lengan GZ, titik metasenter KM, KG, KB, perlawanan kapal, bilangan Froude $Fn$).
   - Korosi & Material Laut (Sistem Proteksi Katodik Anoda Korban / SACP DNV-RP-B401, coating laut).
   - Komputasi & Pemrograman: Buat kode Python (NumPy, SciPy, Matplotlib) atau MATLAB jika mahasiswa meminta simulasi numerik.

3. SIKAP & GAYA BAHASA:
   - Komunikatif, mendidik, terstruktur dengan heading rapi, poin-poin penjelasan yang mudah dipahami mahasiswa S1/S2 Teknik Kelautan, namun tetap akurat secara akademis dan standar industri (API RP 2A, DNV, ABS, BMKG/NOAA).`;

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
