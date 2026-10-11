import {
  getDb,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  onSnapshot,
} from "./firebase";
import {
  stripAttachmentBinaries,
  type ChatAttachment,
} from "./fileAttachments";

export type { ChatAttachment };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  model?: string;
  timestamp: number;
  attachments?: ChatAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  messages: ChatMessage[];
}

const COLLECTION_NAME = "riwayat-chat";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeAttachments(raw: unknown): ChatAttachment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const attachments: ChatAttachment[] = raw
    .filter((item) => item && typeof item === "object")
    .map((rawItem, idx: number) => {
      const item = asRecord(rawItem);
      return {
      id: typeof item.id === "string" ? item.id : `att-${idx}`,
      name: typeof item.name === "string" ? item.name : "berkas",
      mimeType: typeof item.mimeType === "string" ? item.mimeType : "application/octet-stream",
      size: typeof item.size === "number" ? item.size : 0,
      kind: item.kind === "image" ? "image" : "document",
      extractedText:
        typeof item.extractedText === "string" ? item.extractedText : undefined,
      };
    });
  return attachments.length ? attachments : undefined;
}

/**
 * Menyimpan atau memperbarui sesi percakapan ke Cloud Firestore
 */
export async function saveSessionToFirestore(
  session: ChatSession,
  userId?: string | null
): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) {
      console.warn("Firestore belum siap untuk menyimpan sesi.");
      return false;
    }

    const docRef = doc(db, COLLECTION_NAME, session.id);
    const payload = {
      id: session.id,
      title: session.title || "Percakapan Kelautan",
      model: session.model || "qwen3.8-max",
      createdAt: session.createdAt || Date.now(),
      updatedAt: session.updatedAt || Date.now(),
      timestamp: new Date().toISOString(),
      userId: userId || "guest",
      messages: (session.messages || []).map((m) => ({
        id: m.id || `msg-${Date.now()}`,
        role: m.role || "user",
        content: m.content || "",
        reasoning: m.reasoning || "",
        model: m.model || "",
        timestamp: m.timestamp || Date.now(),
        attachments: stripAttachmentBinaries(m.attachments) || [],
      })),
    };

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error("Gagal menyimpan ke Firestore:", error);
    return false;
  }
}

/**
 * Menghapus sesi percakapan dari Cloud Firestore
 */
export async function deleteSessionFromFirestore(sessionId: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;

    const docRef = doc(db, COLLECTION_NAME, sessionId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Gagal menghapus sesi dari Firestore:", error);
    return false;
  }
}

/**
 * Memuat semua sesi percakapan dari Cloud Firestore
 */
export async function loadSessionsFromFirestore(): Promise<ChatSession[]> {
  try {
    const db = getDb();
    if (!db) return [];

    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const sessions: ChatSession[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawMessages = Array.isArray(data.messages) ? data.messages : [];
      const messages: ChatMessage[] = rawMessages.map((rawMessage, idx: number) => {
        const message = asRecord(rawMessage);
        return {
          id: typeof message.id === "string" ? message.id : `msg-${idx}`,
          role:
            message.role === "assistant" || message.role === "system"
              ? message.role
              : "user",
          content: typeof message.content === "string" ? message.content : "",
          reasoning: typeof message.reasoning === "string" ? message.reasoning : "",
          model: typeof message.model === "string" ? message.model : "",
          timestamp:
            typeof message.timestamp === "number" ? message.timestamp : Date.now(),
          attachments: normalizeAttachments(message.attachments),
        };
      });

      // Lewati dokumen dummy jika kosong tanpa id/title/messages
      if (!data.title && messages.length === 0 && !data.createdAt) {
        return;
      }

      sessions.push({
        id: data.id || docSnap.id,
        title: data.title || "Percakapan Tersimpan",
        createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
        model: data.model || "qwen3.8-max",
        messages,
      });
    });

    // Urutkan dari percakapan terbaru
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return sessions;
  } catch (error) {
    console.error("Gagal memuat sesi dari Firestore:", error);
    return [];
  }
}

/**
 * Mendengarkan perubahan real-time dari koleksi riwayat-chat
 */
export function subscribeSessionsFromFirestore(
  onUpdate: (sessions: ChatSession[]) => void
): (() => void) | null {
  try {
    const db = getDb();
    if (!db) return null;

    const colRef = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const sessions: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const rawMessages = Array.isArray(data.messages) ? data.messages : [];
          const messages: ChatMessage[] = rawMessages.map((rawMessage, idx: number) => {
            const message = asRecord(rawMessage);
            return {
              id: typeof message.id === "string" ? message.id : `msg-${idx}`,
              role:
                message.role === "assistant" || message.role === "system"
                  ? message.role
                  : "user",
              content: typeof message.content === "string" ? message.content : "",
              reasoning: typeof message.reasoning === "string" ? message.reasoning : "",
              model: typeof message.model === "string" ? message.model : "",
              timestamp:
                typeof message.timestamp === "number" ? message.timestamp : Date.now(),
              attachments: normalizeAttachments(message.attachments),
            };
          });

          if (!data.title && messages.length === 0 && !data.createdAt) {
            return;
          }

          sessions.push({
            id: data.id || docSnap.id,
            title: data.title || "Percakapan Tersimpan",
            createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
            updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
            model: data.model || "qwen3.8-max",
            messages,
          });
        });

        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        if (sessions.length > 0) {
          onUpdate(sessions);
        }
      },
      (error) => {
        console.warn("Firestore snapshot listener notice:", error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn("Gagal inisialisasi Firestore listener:", error);
    return null;
  }
}
