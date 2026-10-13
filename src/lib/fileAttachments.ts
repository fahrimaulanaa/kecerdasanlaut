import {
  extractPdfTextInBrowser,
  shouldParsePdfInBrowser,
} from "./clientPdfParser";

export type ChatAttachmentKind = "image" | "document";

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: ChatAttachmentKind;
  extractedText?: string;
  storagePath?: string;
  downloadUrl?: string;
  /** Hanya di memori UI; tidak disimpan ke localStorage/Firestore. */
  dataUrl?: string;
}

export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 80_000;

/**
 * Batas aman payload untuk fungsi serverless Vercel (limit keras 4.5 MB).
 * Berkas di atas batas ini tidak boleh dikirim ke /api/files/parse karena
 * akan ditolak platform dengan 413 FUNCTION_PAYLOAD_TOO_LARGE sebelum handler
 * dijalankan.
 */
export const MAX_SERVER_PARSE_BYTES = 4 * 1024 * 1024;


export const ACCEPT_FILE_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".log",
  ".py",
  ".m",
  ".js",
  ".ts",
  ".tex",
  ".html",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
].join(",");

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/xml",
  "application/json",
  "application/xml",
  "application/javascript",
  "text/javascript",
  "text/x-python",
  "text/x-matlab",
  "application/x-tex",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "log",
  "py",
  "m",
  "js",
  "ts",
  "tsx",
  "jsx",
  "tex",
  "html",
  "css",
  "yml",
  "yaml",
]);

export function fileExtension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type) || ["png", "jpg", "jpeg", "webp", "gif"].includes(fileExtension(file.name));
}

export function isTextFile(file: File): boolean {
  if (TEXT_TYPES.has(file.type)) return true;
  return TEXT_EXTENSIONS.has(fileExtension(file.name));
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || fileExtension(file.name) === "pdf";
}

export function isPptxFile(file: File): boolean {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileExtension(file.name) === "pptx"
  );
}

export function needsServerParse(file: File): boolean {
  const ext = fileExtension(file.name);
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx" ||
    file.type === "application/msword" ||
    ext === "doc" ||
    isPdfFile(file) ||
    isPptxFile(file) ||
    ext === "ppt"
  );
}

export function truncateExtractedText(text: string, limit = MAX_EXTRACTED_CHARS): string {
  const trimmed = text.replace(/\u0000/g, "").trim();
  if (trimmed.length <= limit) return trimmed;
  return (
    trimmed.slice(0, limit) +
    `\n\n[Isi file dipotong. Ditampilkan ${limit.toLocaleString("id-ID")} karakter pertama.]`
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function stripAttachmentBinaries(attachments?: ChatAttachment[]): ChatAttachment[] | undefined {
  if (!attachments?.length) return undefined;
  return attachments.map((attachment) => {
    const { dataUrl, ...rest } = attachment;
    void dataUrl;
    return rest;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
    reader.readAsText(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = dataUrl;
  });
}

async function compressImage(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  const original = await readAsDataUrl(file);
  try {
    const img = await loadImage(original);
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { dataUrl: original, mimeType: file.type || "image/jpeg" };
    ctx.drawImage(img, 0, 0, width, height);
    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.82);
    return { dataUrl, mimeType };
  } catch {
    return { dataUrl: original, mimeType: file.type || "image/jpeg" };
  }
}

async function parseOnServer(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_SERVER_PARSE_BYTES) {
    throw new Error(
      `${file.name} berukuran ${formatFileSize(file.size)}. Unggahan ke server dibatasi ${formatFileSize(
        MAX_SERVER_PARSE_BYTES
      )} per berkas. Kompres atau pisahkan berkas menjadi beberapa bagian.`
    );
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/files/parse", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Gagal membaca ${file.name}`);
  }
  return {
    id: "att-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    name: data.name || file.name,
    mimeType: data.mimeType || file.type,
    size: typeof data.size === "number" ? data.size : file.size,
    kind: "document",
    extractedText: truncateExtractedText(String(data.extractedText || "")),
  };
}

async function uploadToStorage(file: File, userId: string): Promise<Pick<ChatAttachment, "storagePath" | "downloadUrl">> {
  const form = new FormData();
  form.append("file", file);
  form.append("userId", userId);
  const res = await fetch("/api/files/upload", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.storagePath !== "string") {
    throw new Error(data.error || `Gagal menyimpan ${file.name} ke penyimpanan.`);
  }
  return {
    storagePath: data.storagePath,
    downloadUrl:
      typeof data.downloadUrl === "string" ? data.downloadUrl : undefined,
  };
}

export async function readLocalFile(
  file: File,
  userId = "guest"
): Promise<ChatAttachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} melebihi batas 50 MB.`);
  }

  if (isImageFile(file)) {
    const compressed = await compressImage(file);
    const stored = await uploadToStorage(file, userId);
    return {
      id: "att-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name: file.name,
      mimeType: compressed.mimeType,
      size: file.size,
      kind: "image",
      ...stored,
      dataUrl: compressed.dataUrl,
    };
  }

  if (isPdfFile(file) && shouldParsePdfInBrowser(file.size)) {
    // PDF besar (textbook ratusan/ribuan halaman) diproses di browser agar
    // tidak melewati batas payload serverless Vercel (error 413).
    const { totalPages, text } = await extractPdfTextInBrowser(file);
    const extracted = truncateExtractedText(text);
    if (!extracted) {
      throw new Error(
        `Tidak ada teks yang dapat dibaca dari ${file.name}. PDF kemungkinan berupa hasil pindai; unggah versi dengan teks atau berkas yang lebih kecil.`
      );
    }
    const note = `[Diproses di browser: ${totalPages.toLocaleString("id-ID")} halaman]`;
    return {
      id: "att-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name: file.name,
      mimeType: file.type || "application/pdf",
      size: file.size,
      kind: "document",
      extractedText: `${note}\n${extracted}`,
    };
  }

  if (needsServerParse(file)) {
    const parsed = await parseOnServer(file);
    if (isPdfFile(file)) {
      return { ...parsed, ...(await uploadToStorage(file, userId)) };
    }
    return parsed;
  }

  if (isTextFile(file)) {
    const text = await readAsText(file);
    return {
      id: "att-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name: file.name,
      mimeType: file.type || "text/plain",
      size: file.size,
      kind: "document",
      extractedText: truncateExtractedText(text),
    };
  }

  throw new Error(
    `${file.name} tidak didukung. Unggah PDF, DOCX, gambar, atau berkas teks.`
  );
}

export function buildUserVisibleContent(
  prompt: string,
  attachments: ChatAttachment[]
): string {
  if (!attachments.length) return prompt;
  const names = attachments.map((a) => a.name).join(", ");
  if (!prompt.trim()) {
    return `Tolong baca dan analisis file terlampir: ${names}`;
  }
  return prompt;
}

export function buildDocumentContext(attachments: ChatAttachment[]): string {
  const docs = attachments.filter((a) => a.kind === "document" && a.extractedText);
  if (!docs.length) return "";
  return docs
    .map(
      (a) =>
        `--- Isi file: ${a.name} ---\n${a.extractedText}\n--- Akhir file: ${a.name} ---`
    )
    .join("\n\n");
}

export type ApiMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export function toApiMessageContent(
  visibleText: string,
  attachments?: ChatAttachment[]
): ApiMessageContent {
  const files = attachments || [];
  const documentContext = buildDocumentContext(files);
  const imageParts = files
    .filter((a) => a.kind === "image" && a.dataUrl)
    .map((a) => ({
      type: "image_url" as const,
      image_url: { url: a.dataUrl as string },
    }));

  const textParts: string[] = [];
  if (visibleText.trim()) textParts.push(visibleText.trim());
  if (files.length) {
    const labels = files
      .map((a) => `- ${a.name} (${a.kind === "image" ? "gambar" : "dokumen"})`)
      .join("\n");
    textParts.push(`Lampiran:\n${labels}`);
  }
  if (documentContext) textParts.push(documentContext);

  const text = textParts.join("\n\n");
  if (!imageParts.length) return text;

  return [{ type: "text", text: text || "Analisis gambar terlampir." }, ...imageParts];
}
