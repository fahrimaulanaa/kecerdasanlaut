import { cookies } from "next/headers";
import type { CustomUser } from "@/context/AuthContext";

export const SESSION_COOKIE_NAME = "oceanai_session";

function isCustomUser(value: unknown): value is CustomUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.uid === "string" &&
    typeof candidate.nim === "string" &&
    candidate.nim.trim().length > 0 &&
    typeof candidate.fullName === "string" &&
    typeof candidate.studyProgram === "string"
  );
}

/**
 * Membaca sesi mahasiswa yang sedang login dari cookie httpOnly.
 * Mengembalikan `null` ketika pengguna belum login (guest mode) atau
 * cookie tidak valid, sehingga backend dapat menolak akses data pribadi.
 */
export async function getSessionUser(): Promise<CustomUser | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isCustomUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type SessionUser = CustomUser;
