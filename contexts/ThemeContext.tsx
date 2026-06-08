"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark-navy" | "dark-gray" | "deep-black" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark-navy",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark-navy");

  useEffect(() => {
    const saved = localStorage.getItem("crm-theme") as Theme | null;
    if (saved) applyTheme(saved);
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    root.classList.remove("dark-navy", "dark-gray", "deep-black", "light", "dark");
    root.classList.add(t);
    if (t !== "light") root.classList.add("dark");
    localStorage.setItem("crm-theme", t);
    setThemeState(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
