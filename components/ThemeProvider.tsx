import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { C, PALETTES, type ThemeColors, type ThemeMode } from "@/lib/theme";

const STORAGE_KEY = "relaxxo_theme_mode";

type ThemeCtx = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: "light",
  colors: PALETTES.light,
  setMode: () => {},
  toggle: () => {},
});

function readInitialMode(): ThemeMode {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      // ignore
    }
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode);

  // Keep the shared `C` object synced synchronously for every render.
  const colors = PALETTES[mode];
  Object.assign(C, colors);

  useEffect(() => {
    if (Platform.OS !== "web") {
      SecureStore.getItemAsync(STORAGE_KEY)
        .then((saved) => {
          if (saved === "dark" || saved === "light") {
            Object.assign(C, PALETTES[saved]);
            setModeState(saved);
          }
        })
        .catch(() => {});
    }
  }, []);

  function setMode(next: ThemeMode) {
    Object.assign(C, PALETTES[next]);
    setModeState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
    } else {
      SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
    }
  }

  function toggle() {
    setMode(mode === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
