import { NextResponse } from "next/server";

interface ItbStudentSearchResult {
  id?: unknown;
  text?: unknown;
}

const ITB_STUDENT_SEARCH_URL =
  "https://six.itb.ac.id/apx/entitysearch";

export async function GET(request: Request) {
  const nim = new URL(request.url).searchParams.get("nim")?.trim() || "";

  if (!/^\d+$/.test(nim)) {
    return NextResponse.json({ error: "NIM tidak valid." }, { status: 400 });
  }

  try {
    const sessionCookie = process.env.ITB_SESSION_COOKIE?.trim();
    if (!sessionCookie) {
      console.error("ITB_SESSION_COOKIE is not configured.");
      return NextResponse.json(
        { error: "Verifikasi mahasiswa belum dikonfigurasi di server." },
        { status: 503 }
      );
    }

    const searchUrl = new URL(ITB_STUDENT_SEARCH_URL);
    searchUrl.searchParams.set("entity", "mahasiswa");
    searchUrl.searchParams.set("page_limit", "10");
    searchUrl.searchParams.set("q", nim);
    searchUrl.searchParams.set("field_name", "tambah_penulis_mahasiswa");

    const response = await fetch(searchUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Cookie: sessionCookie,
        Referer: "https://six.itb.ac.id/",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Data mahasiswa tidak dapat diambil dari SIX ITB." },
        { status: 502 }
      );
    }

    const students = (await response.json()) as unknown;
    if (!Array.isArray(students)) {
      console.error("Unexpected SIX ITB student response.");
      return NextResponse.json(
        { error: "Format data mahasiswa dari SIX ITB tidak valid." },
        { status: 502 }
      );
    }

    const match = students.find(
      (student): student is ItbStudentSearchResult =>
        typeof student === "object" &&
        student !== null &&
        typeof (student as ItbStudentSearchResult).text === "string" &&
        new RegExp(`^${nim}\\s*-\\s*.+$`).test(
          (student as ItbStudentSearchResult).text as string
        )
    );
    const fullName =
      typeof match?.text === "string"
        ? match.text.replace(new RegExp(`^${nim}\\s*-\\s*`), "").trim()
        : "";

    if (!match || !fullName) {
      return NextResponse.json(
        { error: "NIM tidak ditemukan atau bukan mahasiswa Teknik Kelautan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      student: {
        nim,
        fullName,
        studyProgram: "TEKNIK KELAUTAN",
      },
    });
  } catch (error) {
    console.error("SIX ITB student verification error:", error);
    return NextResponse.json(
      { error: "Verifikasi gagal. Silakan coba lagi." },
      { status: 502 }
    );
  }
}
