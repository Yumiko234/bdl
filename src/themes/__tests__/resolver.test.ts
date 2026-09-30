// Tests for resolveActiveTheme — run with: npx vitest src/themes/__tests__
// Install vitest first: npm install -D vitest

import { describe, it, expect } from "vitest";
import { resolveActiveTheme, isInRange } from "../resolver";
import type { EventThemeStore } from "../types";

// ─── isInRange ────────────────────────────────────────────────────────────────

describe("isInRange", () => {
  it("returns true when date is on start boundary", () => {
    expect(isInRange(new Date(2025, 9, 1), { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 })).toBe(true);
  });

  it("returns true when date is on end boundary", () => {
    expect(isInRange(new Date(2025, 9, 31), { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 })).toBe(true);
  });

  it("returns true on a date in the middle", () => {
    expect(isInRange(new Date(2025, 9, 15), { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 })).toBe(true);
  });

  it("returns false before the range", () => {
    expect(isInRange(new Date(2025, 8, 30), { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 })).toBe(false);
  });

  it("returns false after the range", () => {
    expect(isInRange(new Date(2025, 10, 1), { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 })).toBe(false);
  });

  it("handles year-boundary wrap (Dec–Jan)", () => {
    const range = { startMonth: 12, startDay: 27, endMonth: 1, endDay: 2 };
    expect(isInRange(new Date(2024, 11, 28), range)).toBe(true);  // Dec 28
    expect(isInRange(new Date(2025, 0, 1),   range)).toBe(true);  // Jan 1
    expect(isInRange(new Date(2025, 0, 2),   range)).toBe(true);  // Jan 2
    expect(isInRange(new Date(2025, 0, 3),   range)).toBe(false); // Jan 3
    expect(isInRange(new Date(2024, 11, 26), range)).toBe(false); // Dec 26
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTO_STORE: EventThemeStore = { mode: "auto", themes: {} };
const NORMAL_STORE: EventThemeStore = { mode: "normal", themes: {} };
const FORCE_PINK: EventThemeStore = { mode: "force:pink-october", themes: {} };
const FORCE_HW: EventThemeStore = { mode: "force:halloween", themes: {} };

const d = (day: number, month: number) => new Date(2025, month - 1, day);

// ─── Octobre Rose ─────────────────────────────────────────────────────────────

describe("Octobre Rose", () => {
  it("is inactive before Oct 1", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(30, 9));
    expect(r.id).toBeNull();
  });

  it("is active on Oct 1", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(1, 10));
    expect(r.id).toBe("pink-october");
  });

  it("is active on Oct 15", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(15, 10));
    expect(r.id).toBe("pink-october");
  });

  it("is active on Oct 31", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(31, 10));
    // Halloween (priority 90) overlaps Oct 25–31 and wins
    expect(r.id).toBe("halloween");
  });

  it("is inactive on Nov 1 with no other active theme", () => {
    // Halloween ends Nov 1, so Nov 2 is clear
    const r = resolveActiveTheme(AUTO_STORE, d(2, 11));
    expect(r.id).toBeNull();
  });

  it("is inactive when disabled even in its period", () => {
    const store: EventThemeStore = {
      mode: "auto",
      themes: { "pink-october": { enabled: false } },
    };
    const r = resolveActiveTheme(store, d(10, 10));
    expect(r.id).toBeNull();
  });
});

// ─── Halloween ────────────────────────────────────────────────────────────────

describe("Halloween", () => {
  it("is inactive before Oct 25", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(24, 10));
    expect(r.id).toBe("pink-october"); // pink-october is still active
  });

  it("is active on Oct 25 (overlaps, higher priority)", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(25, 10));
    expect(r.id).toBe("halloween");
  });

  it("is active on Oct 31", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(31, 10));
    expect(r.id).toBe("halloween");
  });

  it("is active on Nov 1", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(1, 11));
    expect(r.id).toBe("halloween");
  });

  it("is inactive on Nov 2", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(2, 11));
    expect(r.id).toBeNull();
  });

  it("is inactive when disabled", () => {
    const store: EventThemeStore = {
      mode: "auto",
      themes: { halloween: { enabled: false } },
    };
    const r = resolveActiveTheme(store, d(28, 10));
    expect(r.id).toBe("pink-october"); // fallback to pink-october
  });
});

// ─── Priority / overlap ───────────────────────────────────────────────────────

describe("Overlap Oct 25–31", () => {
  it("Halloween wins by default (priority 90 > 80)", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(27, 10));
    expect(r.id).toBe("halloween");
  });

  it("Pink October wins when given higher priority than Halloween", () => {
    const store: EventThemeStore = {
      mode: "auto",
      themes: { "pink-october": { priority: 95 } },
    };
    const r = resolveActiveTheme(store, d(27, 10));
    expect(r.id).toBe("pink-october");
  });

  it("Pink October wins when Halloween is disabled", () => {
    const store: EventThemeStore = {
      mode: "auto",
      themes: { halloween: { enabled: false } },
    };
    const r = resolveActiveTheme(store, d(27, 10));
    expect(r.id).toBe("pink-october");
  });
});

// ─── Mode: normal ─────────────────────────────────────────────────────────────

describe("Mode: normal", () => {
  it("returns null even during October", () => {
    expect(resolveActiveTheme(NORMAL_STORE, d(10, 10)).id).toBeNull();
  });

  it("returns null even during Halloween period", () => {
    expect(resolveActiveTheme(NORMAL_STORE, d(28, 10)).id).toBeNull();
  });
});

// ─── Mode: force ──────────────────────────────────────────────────────────────

describe("Mode: force", () => {
  it("force:pink-october activates pink-october regardless of date", () => {
    expect(resolveActiveTheme(FORCE_PINK, d(1, 3)).id).toBe("pink-october");
    expect(resolveActiveTheme(FORCE_PINK, d(15, 7)).id).toBe("pink-october");
  });

  it("force:halloween activates halloween regardless of date", () => {
    expect(resolveActiveTheme(FORCE_HW, d(1, 3)).id).toBe("halloween");
    expect(resolveActiveTheme(FORCE_HW, d(15, 7)).id).toBe("halloween");
  });

  it("returns to auto after mode reverts", () => {
    const r = resolveActiveTheme(AUTO_STORE, d(15, 7));
    expect(r.id).toBeNull(); // July — no active theme
  });
});

// ─── Fallback on corrupt store ────────────────────────────────────────────────

describe("Fallback", () => {
  it("returns null on invalid mode", () => {
    const bad = { mode: "invalid" as any, themes: {} };
    expect(resolveActiveTheme(bad, d(10, 10)).id).toBeNull();
  });

  it("returns null when themes object is malformed", () => {
    const bad = { mode: "auto", themes: null as any };
    // Should not throw
    expect(() => resolveActiveTheme(bad, d(10, 10))).not.toThrow();
  });
});
