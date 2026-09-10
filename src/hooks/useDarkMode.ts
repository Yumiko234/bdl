import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light" || stored === "system") return stored as Theme;
    } catch {}
    return "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = (isDark: boolean) => root.classList.toggle("dark", isDark);

    try { localStorage.setItem("theme", theme); } catch {}

    if (theme === "dark") { apply(true); return; }
    if (theme === "light") { apply(false); return; }

    // system: follow prefers-color-scheme
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, setTheme };
}
