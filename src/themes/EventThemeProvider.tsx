import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import logoBdlNoel from "@/assets/logo-bdl-noel.png";
import type {
  EventThemeContextValue,
  EventThemeId,
  EventThemeStore,
  GlobalMode,
  ThemeSettings,
} from "./types";
import { resolveActiveTheme } from "./resolver";
import { supabase } from "@/integrations/supabase/client";

// ─── Storage helpers (localStorage = fallback uniquement) ─────────────────────

const STORAGE_KEY = "bdl-event-theme-store";
const SUPABASE_KEY = "event_theme_store";

const DEFAULT_STORE: EventThemeStore = {
  mode: "auto",
  themes: {},
};

function readLocalStore(): EventThemeStore {
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

function writeLocalStore(store: EventThemeStore): void {
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
  // Start with localStorage as instant fallback while Supabase loads
  const [store, setStore] = useState<EventThemeStore>(readLocalStore);

  // Prevent write-back loops and premature writes before initial Supabase fetch
  const isFromRemote = useRef(false);
  const isInitialLoad = useRef(true);

  // ── Fetch initial store from Supabase + realtime subscription ──────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase
      .from("site_settings" as any)
      .select("value")
      .eq("key", SUPABASE_KEY)
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        isInitialLoad.current = false;
        if (!error && data?.value) {
          isFromRemote.current = true;
          const remote = data.value as Partial<EventThemeStore>;
          setStore({
            mode: remote.mode ?? "auto",
            themes: remote.themes ?? {},
          });
        }
      });

    channel = supabase
      .channel("site-settings-theme")
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "site_settings",
          filter: `key=eq.${SUPABASE_KEY}`,
        },
        (payload: any) => {
          const remote = payload.new?.value as Partial<EventThemeStore> | undefined;
          if (remote) {
            isFromRemote.current = true;
            setStore({
              mode: remote.mode ?? "auto",
              themes: remote.themes ?? {},
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ── Write store to Supabase (admin) + localStorage (fallback) on change ────
  useEffect(() => {
    // Skip during initial load or when change came from remote
    if (isInitialLoad.current || isFromRemote.current) {
      isFromRemote.current = false;
      return;
    }
    writeLocalStore(store);
    supabase
      .from("site_settings" as any)
      .upsert(
        { key: SUPABASE_KEY, value: store as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .then(() => {});
  }, [store]);

  // ── Re-resolve every minute so midnight transitions are picked up ───────────
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const resolved = useMemo(() => resolveActiveTheme(store, now), [store, now]);

  // Apply data-event-theme to <html>
  useEffect(() => {
    applyThemeAttribute(resolved.id);
  }, [resolved.id]);

  // Swap favicon for Noël theme
  useEffect(() => {
    const DEFAULT_FAVICON = "https://storage.googleapis.com/gpt-engineer-file-uploads/PFH58AOHWBX3P9oafmX078UDBlx2/uploads/1760107895218-IMG_2736.jpeg";
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = resolved.id === "noel" ? logoBdlNoel : DEFAULT_FAVICON;
  }, [resolved.id]);

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
