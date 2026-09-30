import type {
  EventThemeId,
  EventThemeStore,
  ResolvedTheme,
  ThemeSettings,
  DateRange,
} from "./types";
import { CATALOGUE, CATALOGUE_ORDER } from "./catalogue";

// Returns true if date falls within the range.
// Handles year-boundary wrap (e.g. Dec 27 → Jan 2).
export function isInRange(date: Date, range: DateRange): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const cur = m * 100 + d;
  const start = range.startMonth * 100 + range.startDay;
  const end = range.endMonth * 100 + range.endDay;

  if (start <= end) {
    return cur >= start && cur <= end;
  }
  // Wraps over year boundary
  return cur >= start || cur <= end;
}

// Merge stored partial settings with catalogue defaults
export function getEffectiveSettings(
  store: EventThemeStore,
  id: EventThemeId
): ThemeSettings {
  const cat = CATALOGUE[id];
  const stored = store.themes[id] ?? {};

  return {
    enabled: stored.enabled ?? true,
    dateRange: stored.dateRange ?? cat.defaultDateRange,
    priority: stored.priority ?? cat.defaultPriority,
    effects: { ...cat.defaultEffects, ...stored.effects },
  };
}

export function resolveActiveTheme(
  store: EventThemeStore,
  date: Date = new Date()
): ResolvedTheme {
  try {
    // Force mode
    if (store.mode.startsWith("force:")) {
      const forcedId = store.mode.slice(6) as EventThemeId;
      if (CATALOGUE[forcedId]) {
        return { id: forcedId, settings: getEffectiveSettings(store, forcedId) };
      }
    }

    // Normal mode — no event theme
    if (store.mode === "normal") {
      return { id: null, settings: null };
    }

    // Auto mode — find active themes by date, pick highest priority
    const candidates: Array<{ id: EventThemeId; settings: ThemeSettings }> = [];

    for (const id of CATALOGUE_ORDER) {
      const settings = getEffectiveSettings(store, id);
      if (!settings.enabled) continue;
      if (isInRange(date, settings.dateRange)) {
        candidates.push({ id, settings });
      }
    }

    if (candidates.length === 0) return { id: null, settings: null };

    // Sort: higher priority wins; same priority → catalogue order (first wins)
    candidates.sort((a, b) => {
      const diff = b.settings.priority - a.settings.priority;
      if (diff !== 0) return diff;
      return CATALOGUE_ORDER.indexOf(a.id) - CATALOGUE_ORDER.indexOf(b.id);
    });

    const winner = candidates[0];
    return { id: winner.id, settings: winner.settings };
  } catch {
    return { id: null, settings: null };
  }
}
