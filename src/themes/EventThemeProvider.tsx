import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  EventThemeContextValue,
  EventThemeId,
  EventThemeStore,
  GlobalMode,
  ThemeSettings,
} from "./types";
import { resolveActiveTheme } from "./resolver";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "bdl-event-theme-store";

const DEFAULT_STORE: EventThemeStore = {
  mode: "auto",
  themes: {},
};

function readStore(): EventThemeStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<EventThemeStore>;
    return {
      mode: parsed.mode ?? "auto",
      themes: parsed.themes ?? {},
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function writeStore(store: EventThemeStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<EventThemeContextValue | null>(null);

export function useEventTheme(): EventThemeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEventTheme must be used inside EventThemeProvider");
  return ctx;
}

// ─── DOM side-effect: set data-event-theme on <html> ─────────────────────────
// This is what the CSS selectors target (e.g. html[data-event-theme="halloween"]).
// It is completely independent of the .dark class managed by useDarkMode.

function applyThemeAttribute(id: EventThemeId | null) {
  const root = document.documentElement;
  if (id) {
    root.setAttribute("data-event-theme", id);
  } else {
    root.removeAttribute("data-event-theme");
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
}

export function EventThemeProvider({ children }: Props) {
  const [store, setStore] = useState<EventThemeStore>(readStore);

  // Re-resolve every minute so date changes are picked up (e.g. midnight transition)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const resolved = useMemo(() => resolveActiveTheme(store, now), [store, now]);

  // Apply data-event-theme to <html> whenever resolved theme changes
  useEffect(() => {
    applyThemeAttribute(resolved.id);
  }, [resolved.id]);

  // Persist store to localStorage on every change
  useEffect(() => {
    writeStore(store);
  }, [store]);

  const setMode = useCallback((mode: GlobalMode) => {
    setStore((prev) => ({ ...prev, mode }));
  }, []);

  const updateTheme = useCallback(
    (id: EventThemeId, patch: Partial<ThemeSettings>) => {
      setStore((prev) => ({
        ...prev,
        themes: {
          ...prev.themes,
          [id]: { ...(prev.themes[id] ?? {}), ...patch },
        },
      }));
    },
    []
  );

  const resetTheme = useCallback((id: EventThemeId) => {
    setStore((prev) => {
      const themes = { ...prev.themes };
      delete themes[id];
      return { ...prev, themes };
    });
  }, []);

  const value = useMemo<EventThemeContextValue>(
    () => ({ store, resolved, setMode, updateTheme, resetTheme }),
    [store, resolved, setMode, updateTheme, resetTheme]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
