import { NextResponse } from "next/server";
import { tmpdir } from "node:os";
import mammoth from "mammoth";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import { createWorker } from "tesseract.js";
import { MAX_FILE_BYTES, truncateExtractedText } from "@/lib/fileAttachments";

// OCR & native canvas (@napi-rs/canvas) butuh Node.js runtime dan waktu lebih lama.
export const maxDuration = 60;

const MIN_PDF_TEXT_CHARS = 40;
const MAX_OCR_PAGES = 20;

async function extractScannedPdfText(buffer: Buffer): Promise<string> {
  // Jangan panggil definePDFJSModule(() => import("pdfjs-dist")) di Node.js:
  // build resmi pdf.js v6 memakai API Node 22+ (mis. Uint8Array#toHex) sehingga
  // gagal di runtime Vercel dengan "hashOriginal.toHex is not a function".
  // Biarkan unpdf memakai serverless build-nya (unpdf/pdfjs) yang sudah
  // menyertakan polyfill untuk Node >= 18.
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const worker = await createWorker(["ind", "eng"], undefined, {
    cachePath: tmpdir(),
  });

  try {
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const image = await renderPageAsImage(pdf, pageNumber, {
        canvasImport: () => import("@napi-rs/canvas"),
        scale: 1.5,
      });
      const result = await worker.recognize(Buffer.from(image));
      const text = result.data.text.trim();
      if (text) {
        pageTexts.push(`--- Halaman ${pageNumber} ---\n${text}`);
      }
    }

    if (pdf.numPages > MAX_OCR_PAGES) {
      pageTexts.push(
        `[OCR dibatasi hingga ${MAX_OCR_PAGES} halaman pertama dari ${pdf.numPages} halaman.]`
      );
    }
    return pageTexts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

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
      let standardParseSucceeded = false;
      try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        extractedText = text || "";
        standardParseSucceeded = true;
      } catch (error) {
        console.warn("PDF text extraction failed; trying OCR:", error);
      }

      if (
        !standardParseSucceeded ||
        extractedText.replace(/\s+/g, "").length < MIN_PDF_TEXT_CHARS
      ) {
        console.info(`PDF ${file.name} membutuhkan OCR.`);
        try {
          extractedText = await extractScannedPdfText(buffer);
        } catch (error) {
          console.error("PDF OCR error:", error);
          return NextResponse.json(
            {
              error:
                `Gagal membaca isi PDF ${file.name}. Parser teks dan OCR tidak berhasil.`,
            },
            { status: 422 }
          );
        }
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
