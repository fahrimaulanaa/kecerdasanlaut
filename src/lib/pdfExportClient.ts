"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ChatMessage } from "@/lib/chatStorage";

export interface ExportPdfOptions {
  title: string;
  model?: string;
  includeReasoning?: boolean;
  includeUserMessages?: boolean;
}

/**
 * Strip markdown/LaTeX down to readable plain text for the fallback PDF
 * renderer (used when no server-side LaTeX engine is available).
 */
export function toPlainText(markdown: string): string {
  let text = markdown;

  // Drop code fences, keep the body.
  text = text.replace(/```[\w-]*\n?/g, "");

  // Remove display math delimiters, keep inner math.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, math) => `\n${String(math).trim()}\n`);

  // Inline math -> readable content.
  text = text.replace(/\$([^$\n]+?)\$/g, (_m, math) => String(math).trim());

  // LaTeX-ish command cleanup.
  text = text.replace(/\\text(bf|it|tt)\{([^}]*)\}/g, "$2");
  text = text.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1");
  text = text.replace(/\\[a-zA-Z]+/g, "");
  text = text.replace(/[{}]/g, "");

  // Markdown emphasis / headings / lists.
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1$2");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s*[-*+]\s+/gm, "\u2022  ");
  text = text.replace(/^\s*>\s?/gm, "");

  return text.trim();
}

/**
 * Render a session/solution into a PDF using pdf-lib (fully client side).
 * This is the fallback when the server has no LaTeX engine.
 */
export async function renderSolutionPdf(
  messages: ChatMessage[],
  options: ExportPdfOptions
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 15;

  const ocean = rgb(0.06, 0.35, 0.43);
  const grey = rgb(0.4, 0.4, 0.4);
  const ink = rgb(0.16, 0.16, 0.16);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPageIfNeeded = (needed = lineHeight) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const wrap = (text: string, f = font, size = 11): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const write = (
    text: string,
    f = font,
    size = 11,
    color = ink
  ) => {
    const paragraphs = String(text).split("\n");
    for (const para of paragraphs) {
      const wrapped = para.trim() ? wrap(para, f, size) : [""];
      for (const line of wrapped) {
        newPageIfNeeded(size);
        page.drawText(line, {
          x: margin,
          y: y - size,
          size,
          font: f,
          color,
        });
        y -= lineHeight;
      }
    }
  };

  // Header
  write(options.title, bold, 18, ocean);
  write(
    `${options.model || "OceanAI"} \u00b7 ${new Date().toLocaleString("id-ID")}`,
    font,
    10,
    grey
  );
  y -= 8;

  for (const m of messages) {
    if (!options.includeUserMessages && m.role === "user") continue;
    newPageIfNeeded(30);
    write(
      m.role === "user" ? "Pertanyaan Mahasiswa" : "Solusi OceanAI",
      bold,
      13,
      ocean
    );
    if (options.includeReasoning && m.reasoning) {
      write("Proses penalaran: " + m.reasoning, font, 9, grey);
    }
    write(toPlainText(m.content), font, 11, ink);
    y -= 10;
  }

  const bytes = await doc.save();
  // Copy into a fresh ArrayBuffer-backed view so the BlobPart type is satisfied.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download plain text (e.g. the .tex source). */
export function downloadText(
  text: string,
  fileName: string,
  mime = "application/x-tex"
) {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), fileName);
}