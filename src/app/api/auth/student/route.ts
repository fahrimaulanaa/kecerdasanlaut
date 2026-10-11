import { NextResponse } from "next/server";

interface PddiktiStudent {
  nim?: unknown;
  nama?: unknown;
  nama_prodi?: unknown;
}

export async function GET(request: Request) {
  const nim = new URL(request.url).searchParams.get("nim")?.trim() || "";

  if (!/^\d+$/.test(nim)) {
    return NextResponse.json({ error: "NIM tidak valid." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://pddikti.kemdiktisaintek.go.id/api/pencarian/enc/all/${encodeURIComponent(nim)}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
          Origin: "https://pddikti.kemdiktisaintek.go.id",
          Referer: "https://pddikti.kemdiktisaintek.go.id/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "sec-ch-ua":
            '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Data mahasiswa tidak dapat diambil dari PDDIKTI." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as {
      data?: { mahasiswa?: PddiktiStudent[] };
    };
    const students = Array.isArray(payload.data?.mahasiswa)
      ? payload.data.mahasiswa
      : [];
    const match = students.find(
      (student) =>
        student.nim === nim &&
        typeof student.nama === "string" &&
        typeof student.nama_prodi === "string" &&
        student.nama_prodi.trim().toUpperCase() === "TEKNIK KELAUTAN"
    );

    if (!match || typeof match.nama !== "string") {
      return NextResponse.json(
        { error: "NIM tidak ditemukan atau bukan mahasiswa Teknik Kelautan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      student: {
        nim,
        fullName: match.nama,
        studyProgram: "TEKNIK KELAUTAN",
      },
    });
  } catch (error) {
    console.error("PDDIKTI student verification error:", error);
    return NextResponse.json(
      { error: "Verifikasi gagal. Silakan coba lagi." },
      { status: 502 }
    );
  }
}
