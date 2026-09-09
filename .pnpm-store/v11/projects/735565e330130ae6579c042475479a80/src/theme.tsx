import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolved: "light",
  setMode: () => {},
});

const STORAGE_KEY = "dv-monitor-theme";

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const apply = (effective: "light" | "dark") => {
      const root = document.documentElement;
      if (effective === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
      setResolved(effective);
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (mode === "system") apply(media.matches ? "dark" : "light");
      else apply(mode);
    };

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
