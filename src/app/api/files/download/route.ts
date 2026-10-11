import { NextResponse } from "next/server";
import { createSupabaseSignedUrl } from "@/lib/supabaseStorage";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !path.startsWith("uploads/") || path.includes("..")) {
    return NextResponse.json({ error: "Lokasi berkas tidak valid." }, { status: 400 });
  }

  try {
    const signedUrl = await createSupabaseSignedUrl(path);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      { error: "Berkas tidak dapat diunduh saat ini." },
      { status: 502 }
    );
  }
}
