"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
export interface CustomUser {
  uid: string;
  nim: string;
  fullName: string;
  studyProgram: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  verifyNim: (nim: string) => Promise<
    | { success: true; student: Omit<CustomUser, "uid"> }
    | { success: false; error: string }
  >;
  completeLogin: (student: Omit<CustomUser, "uid">) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  verifyNim: async () => ({ success: false, error: "Verifikasi belum siap." }),
  completeLogin: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("oceanai_student_session");
      if (saved) {
        try {
          setUser(JSON.parse(saved) as CustomUser);
        } catch {
          localStorage.removeItem("oceanai_student_session");
        }
      }
      setLoading(false);
    });
  }, []);

  const verifyNim = async (nim: string) => {
    const normalizedNim = nim.trim();
    if (!/^\d+$/.test(normalizedNim)) {
      return { success: false as const, error: "NIM hanya boleh berisi angka." };
    }

    try {
      const response = await fetch(`/api/auth/student?nim=${encodeURIComponent(normalizedNim)}`);
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.student) {
        return {
          success: false as const,
          error: result?.error || "Data mahasiswa tidak ditemukan.",
        };
      }

      return {
        success: true as const,
        student: {
          nim: result.student.nim,
          fullName: result.student.fullName,
          studyProgram: result.student.studyProgram,
        },
      };
    } catch {
      return {
        success: false as const,
        error: "Verifikasi gagal. Periksa koneksi internet dan coba lagi.",
      }
    }
  };

  const completeLogin = (student: Omit<CustomUser, "uid">) => {
    const loggedInUser: CustomUser = {
      uid: `nim-${student.nim}`,
      ...student,
    };
    setUser(loggedInUser);
    localStorage.setItem("oceanai_student_session", JSON.stringify(loggedInUser));
  };

  const signOut = async () => {
    localStorage.removeItem("oceanai_student_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        verifyNim,
        completeLogin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
