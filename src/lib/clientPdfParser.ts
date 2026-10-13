/**
 * Ekstraksi teks PDF di sisi klien (browser) untuk berkas besar (textbook
 * ratusan/ribuan halaman). Ini menghindari batas payload serverless Vercel
 * (4.5 MB) yang memicu error 413 FUNCTION_PAYLOAD_TOO_LARGE ketika berkas
 * diunggah ke /api/files/parse.
 */

/** Ambang ukuran berkas yang wajib diproses di klien (aman di bawah limit Vercel). */
export const CLIENT_SIDE_PARSE_THRESHOLD_BYTES = 4 * 1024 * 1024;

export function shouldParsePdfInBrowser(sizeInBytes: number): boolean {
  return sizeInBytes > CLIENT_SIDE_PARSE_THRESHOLD_BYTES;
}

interface UnpdfTextModule {
  extractText: (
    data: ArrayBuffer | Uint8Array,
    options: { mergePages: true }
  ) => Promise<{ totalPages: number; text: string }>;
  getDocumentProxy: (
    data: ArrayBuffer | Uint8Array
  ) => Promise<{ numPages: number; destroy: () => Promise<void> }>;
}

/**
 * Mengekstrak teks dari PDF langsung di browser menggunakan unpdf (mock DOM
 * canvas). Mengembalikan total halaman dan teks gabungan.
 */
export async function extractPdfTextInBrowser(
  file: File
): Promise<{ totalPages: number; text: string }> {
  let pdf: { numPages: number; destroy: () => Promise<void> } | null = null;
  try {
    const unpdf = (await import("unpdf")) as unknown as UnpdfTextModule;
    const buffer = new Uint8Array(await file.arrayBuffer());
    pdf = await unpdf.getDocumentProxy(buffer);
    const { text } = await unpdf.extractText(buffer, { mergePages: true });
    return { totalPages: pdf.numPages, text: text || "" };
  } finally {
    if (pdf) {
      try {
        await pdf.destroy();
      } catch {
        // Abaikan kegagalan pembersihan dokumen.
      }
    }
  }
}
