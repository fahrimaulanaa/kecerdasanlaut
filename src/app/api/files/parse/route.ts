import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { MAX_FILE_BYTES, truncateExtractedText } from "@/lib/fileAttachments";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Berkas tidak ditemukan pada permintaan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} melebihi batas 8 MB.` },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase().split(".").pop() || "";
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (ext === "pdf" || file.type === "application/pdf") {
      try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        extractedText = text || "";
      } catch (error) {
        console.error("PDF parse error:", error);
        return NextResponse.json(
          { error: `Gagal membaca isi PDF ${file.name}. Pastikan file valid.` },
          { status: 422 }
        );
      }
    } else if (ext === "doc") {
      return NextResponse.json(
        {
          error:
            "Format .doc lama tidak didukung. Simpan ulang sebagai .docx lalu unggah kembali.",
        },
        { status: 400 }
      );
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } else {
      extractedText = buffer.toString("utf8");
    }

    extractedText = truncateExtractedText(extractedText);
    if (!extractedText) {
      return NextResponse.json(
        {
          error: `Tidak ada teks yang dapat dibaca dari ${file.name}.`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      extractedText,
    });
  } catch (error) {
    console.error("File parse error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca isi berkas.",
      },
      { status: 500 }
    );
  }
}
