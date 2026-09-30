export type EventThemeId = "pink-october" | "halloween";

export type GlobalMode = "auto" | "normal" | `force:${EventThemeId}`;

export interface DateRange {
  startDay: number;   // 1–31
  startMonth: number; // 1–12
  endDay: number;
  endMonth: number;
}

// All possible effect keys across all themes
export interface ThemeEffectConfig {
  // Octobre Rose
  ribbon?: boolean;
  pinkParticles?: boolean;
  // Halloween
  glow?: boolean;
  halloweenParticles?: boolean;
  bats?: boolean;
  pumpkins?: boolean;
}

export type EffectKey = keyof ThemeEffectConfig;

export interface ThemeSettings {
  enabled: boolean;
  dateRange: DateRange;
  priority: number;
  effects: ThemeEffectConfig;
}

export interface CatalogueEntry {
  id: EventThemeId;
  name: string;
  icon: string;
  description: string;
  defaultDateRange: DateRange;
  defaultPriority: number;
  defaultEffects: ThemeEffectConfig;
  availableEffects: EffectKey[];
  effectLabels: Partial<Record<EffectKey, string>>;
}

export interface ResolvedTheme {
  id: EventThemeId | null;
  settings: ThemeSettings | null;
}

// Shape persisted in localStorage
export interface EventThemeStore {
  mode: GlobalMode;
  themes: Partial<Record<EventThemeId, Partial<ThemeSettings>>>;
}

export interface EventThemeContextValue {
  store: EventThemeStore;
  resolved: ResolvedTheme;
  setMode: (mode: GlobalMode) => void;
  updateTheme: (id: EventThemeId, patch: Partial<ThemeSettings>) => void;
  resetTheme: (id: EventThemeId) => void;
}
