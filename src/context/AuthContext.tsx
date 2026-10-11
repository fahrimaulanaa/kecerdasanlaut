"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  initFirebase,
  getActiveFirebaseConfig,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from "@/lib/firebase";

export interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginAsGuest: (name?: string) => void;
  reloadConfig: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isFirebaseConfigured: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
  loginAsGuest: () => {},
  reloadConfig: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  const initAuth = () => {
    const { auth, isConfigured } = initFirebase();
    setIsFirebaseConfigured(isConfigured);

    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Mahasiswa"),
            isDemo: false,
          });
        } else {
          // Check if guest demo session is preserved in local storage
          const guestSession = localStorage.getItem("oceanai_guest_session");
          if (guestSession) {
            try {
              setUser(JSON.parse(guestSession));
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Firebase not configured yet: check guest session or default to null
      const guestSession = localStorage.getItem("oceanai_guest_session");
      if (guestSession) {
        try {
          setUser(JSON.parse(guestSession));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    const unsub = initAuth();
    return () => unsub?.();
  }, []);

  const reloadConfig = () => {
    setLoading(true);
    initAuth();
  };

  const signIn = async (email: string, pass: string) => {
    const { auth, isConfigured } = initFirebase();
    if (!isConfigured || !auth) {
      // Demo authentication mode
      if (email && pass) {
        const demoUser: CustomUser = {
          uid: "demo-" + Date.now(),
          email,
          displayName: email.split("@")[0] || "Mahasiswa Kelautan",
          isDemo: true,
        };
        setUser(demoUser);
        localStorage.setItem("oceanai_guest_session", JSON.stringify(demoUser));
        return { success: true };
      }
      return { success: false, error: "Email dan password wajib diisi." };
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      setUser({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || (res.user.email ? res.user.email.split("@")[0] : "Mahasiswa"),
        isDemo: false,
      });
      localStorage.removeItem("oceanai_guest_session");
      return { success: true };
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let msg = error.message || "Gagal masuk. Periksa kembali email dan password Anda.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        msg = "Email atau kata sandi tidak valid.";
      } else if (error.code === "auth/user-not-found") {
        msg = "Akun dengan email ini belum terdaftar.";
      } else if (error.code === "auth/invalid-email") {
        msg = "Format email tidak valid.";
      }
      return { success: false, error: msg };
    }
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    const { auth, isConfigured } = initFirebase();
    if (!isConfigured || !auth) {
      if (email && pass) {
        const demoUser: CustomUser = {
          uid: "demo-" + Date.now(),
          email,
          displayName: name || email.split("@")[0] || "Mahasiswa Kelautan",
          isDemo: true,
        };
        setUser(demoUser);
        localStorage.setItem("oceanai_guest_session", JSON.stringify(demoUser));
        return { success: true };
      }
      return { success: false, error: "Harap lengkapi semua data formulir pendaftaran." };
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      setUser({
        uid: res.user.uid,
        email: res.user.email,
        displayName: name || (res.user.email ? res.user.email.split("@")[0] : "Mahasiswa"),
        isDemo: false,
      });
      localStorage.removeItem("oceanai_guest_session");
      return { success: true };
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let msg = error.message || "Pendaftaran gagal.";
      if (error.code === "auth/email-already-in-use") {
        msg = "Email ini sudah terdaftar. Silakan login.";
      } else if (error.code === "auth/weak-password") {
        msg = "Kata sandi terlalu lemah (minimal 6 karakter).";
      }
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    const { auth, isConfigured } = initFirebase();
    if (isConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.error("Sign out error:", e);
      }
    }
    localStorage.removeItem("oceanai_guest_session");
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { auth, isConfigured } = initFirebase();
    if (!isConfigured || !auth) {
      return {
        success: true,
        message: "Instruksi reset kata sandi dikirim (Mode Demo: Firebase belum dihubungkan).",
      };
    }

    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: `Tautan pemulihan kata sandi telah dikirim ke ${email}. Silakan cek kotak masuk atau folder spam Anda.`,
      };
    } catch (err: unknown) {
      const error = err as { message?: string };
      return { success: false, error: error.message || "Gagal mengirim email reset." };
    }
  };

  const loginAsGuest = (name = "Mahasiswa Kelautan") => {
    const guestUser: CustomUser = {
      uid: "tamu-" + Math.floor(Math.random() * 100000),
      email: "tamu@kelautan.ac.id",
      displayName: name,
      isDemo: true,
    };
    setUser(guestUser);
    localStorage.setItem("oceanai_guest_session", JSON.stringify(guestUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        loginAsGuest,
        reloadConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
