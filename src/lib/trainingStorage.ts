import {
  getDb,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  where,
} from "./firebase";

export type TrainingSourceType = "chat-history" | "textbook" | "teaching-material";

export interface TrainingEntry {
  id: string;
  /** Jenis sumber pencerdasan AI. */
  sourceType: TrainingSourceType;
  /** Judul ringkas yang tampil di daftar training. */
  title: string;
  /** Nama berkas sumber, jika berasal dari unggahan. */
  fileName?: string;
  /** Teks hasil ekstraksi yang dipakai sebagai konteks AI. */
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const TRAINING_COLLECTION_NAME = "ai-training";

/** Batas total karakter konteks training yang disuntikkan ke prompt sistem. */
export const MAX_TRAINING_CONTEXT_CHARS = 100_000;

/** Batas per entri training agar satu berkas tidak mendominasi konteks. */
export const MAX_TRAINING_ENTRY_CHARS = 60_000;

export const TRAINING_SOURCE_LABELS: Record<TrainingSourceType, string> = {
  "chat-history": "Riwayat Chat",
  textbook: "Textbook",
  "teaching-material": "Bahan Ajar",
};

function safeSlice(text: string, limit: number): string {
  const trimmed = text.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

/**
 * Menyimpan atau memperbarui satu entri pencerdasan AI ke Cloud Firestore.
 */
export async function saveTrainingEntry(
  nim: string | null | undefined,
  entry: TrainingEntry
): Promise<boolean> {
  try {
    const normalizedNim = nim?.trim();
    if (!normalizedNim) return false;

    const db = getDb();
    if (!db) return false;

    const content = safeSlice(entry.content, MAX_TRAINING_ENTRY_CHARS);
    if (!content) return false;

    await setDoc(
      doc(db, TRAINING_COLLECTION_NAME, entry.id),
      {
        id: entry.id,
        nim: normalizedNim,
        sourceType: entry.sourceType,
        title: safeSlice(entry.title, 200) || "Materi Training",
        fileName: entry.fileName ? safeSlice(entry.fileName, 200) : "",
        content,
        createdAt: entry.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error("Gagal menyimpan entri training:", error);
    return false;
  }
}

/**
 * Menghapus satu entri training dari Cloud Firestore.
 */
export async function deleteTrainingEntry(
  entryId: string,
  nim: string | null | undefined
): Promise<boolean> {
  try {
    const normalizedNim = nim?.trim();
    if (!normalizedNim || !entryId) return false;

    const db = getDb();
    if (!db) return false;

    await deleteDoc(doc(db, TRAINING_COLLECTION_NAME, entryId));
    return true;
  } catch (error) {
    console.error("Gagal menghapus entri training:", error);
    return false;
  }
}

function mapTrainingDoc(
  docId: string,
  data: Record<string, unknown>
): TrainingEntry | null {
  const sourceType = data.sourceType;
  if (
    sourceType !== "chat-history" &&
    sourceType !== "textbook" &&
    sourceType !== "teaching-material"
  ) {
    return null;
  }

  const content = typeof data.content === "string" ? data.content : "";
  if (!content.trim()) return null;

  return {
    id: typeof data.id === "string" ? data.id : docId,
    sourceType,
    title: typeof data.title === "string" ? data.title : "Materi Training",
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    content,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

/**
 * Memuat semua entri training milik satu mahasiswa dari Cloud Firestore.
 */
export async function loadTrainingEntries(
  nim: string | null | undefined
): Promise<TrainingEntry[]> {
  try {
    const normalizedNim = nim?.trim();
    if (!normalizedNim) return [];

    const db = getDb();
    if (!db) return [];

    const colRef = query(
      collection(db, TRAINING_COLLECTION_NAME),
      where("nim", "==", normalizedNim)
    );
    const snap = await getDocs(colRef);
    const entries: TrainingEntry[] = [];

    snap.forEach((docSnap) => {
      const mapped = mapTrainingDoc(
        docSnap.id,
        docSnap.data() as Record<string, unknown>
      );
      if (mapped) entries.push(mapped);
    });

    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Gagal memuat entri training:", error);
    return [];
  }
}

/**
 * Mendengarkan perubahan real-time koleksi ai-training milik satu mahasiswa.
 */
export function subscribeTrainingEntries(
  nim: string | null | undefined,
  onUpdate: (entries: TrainingEntry[]) => void
): (() => void) | null {
  try {
    const normalizedNim = nim?.trim();
    if (!normalizedNim) return null;

    const db = getDb();
    if (!db) return null;

    const colRef = query(
      collection(db, TRAINING_COLLECTION_NAME),
      where("nim", "==", normalizedNim)
    );

    return onSnapshot(
      colRef,
      (snapshot) => {
        const entries: TrainingEntry[] = [];
        snapshot.forEach((docSnap) => {
          const mapped = mapTrainingDoc(
            docSnap.id,
            docSnap.data() as Record<string, unknown>
          );
          if (mapped) entries.push(mapped);
        });
        onUpdate(entries.sort((a, b) => b.updatedAt - a.updatedAt));
      },
      (error) => {
        console.warn("Firestore training listener notice:", error);
      }
    );
  } catch (error) {
    console.warn("Gagal inisialisasi listener training:", error);
    return null;
  }
}

/**
 * Membentuk blok konteks training untuk disuntikkan ke prompt sistem.
 * Entri terbaru diprioritaskan dan total dibatasi agar tidak melampaui budget.
 */
export function buildTrainingContext(entries: TrainingEntry[]): string {
  if (!entries.length) return "";

  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const blocks: string[] = [];
  let budget = MAX_TRAINING_CONTEXT_CHARS;

  for (const entry of sorted) {
    if (budget <= 0) break;
    const label = TRAINING_SOURCE_LABELS[entry.sourceType];
    const header = `--- ${label}: ${entry.title} ---`;
    const body = safeSlice(entry.content, Math.min(MAX_TRAINING_ENTRY_CHARS, budget));
    if (!body) continue;

    const block = `${header}\n${body}`;
    blocks.push(block);
    budget -= block.length;
  }

  return blocks.join("\n\n");
}

/** Membersihkan jejak binari/format berat dari entri sebelum disimpan. */
export function sanitizeTrainingContent(raw: string): string {
  return raw.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}
