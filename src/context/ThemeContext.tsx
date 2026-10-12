"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "oceanai_theme_preference";

interface ThemeContextType {
  /** Pilihan pengguna: light, dark, atau ikuti sistem. */
  preference: ThemePreference;
  /** Tema yang benar-benar aktif setelah resolusi sistem. */
  resolvedTheme: ResolvedTheme;
  /** Ubah preferensi tema dan simpan ke localStorage. */
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  preference: "system",
  resolvedTheme: "light",
  setPreference: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system"
      ? saved
      : "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(preference)
  );

  // Terapkan tema ke <html data-theme> setiap kali preferensi/sistem berubah.
  useEffect(() => {
    const applyTheme = () => {
      const resolved = resolveTheme(preference);
      setResolvedTheme(resolved);
      document.documentElement.dataset.theme = resolved;
    };

    applyTheme();

    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage bisa gagal di mode privat; abaikan.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
