import { NextResponse } from "next/server";
import { MAX_FILE_BYTES } from "@/lib/fileAttachments";
import { uploadFileToSupabase } from "@/lib/supabaseStorage";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const userId = String(form.get("userId") || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} melebihi batas 8 MB.` }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Hanya PDF dan gambar yang dapat disimpan." }, { status: 415 });
    }

    const extension = file.name.toLowerCase().split(".").pop() || "bin";
    const path = `uploads/${userId}/${crypto.randomUUID()}.${extension}`;
    await uploadFileToSupabase(path, await file.arrayBuffer(), file.type);

    return NextResponse.json({
      storagePath: path,
      downloadUrl: `/api/files/download?path=${encodeURIComponent(path)}`,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan berkas." },
      { status: 500 }
    );
  }
}
