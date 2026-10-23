import type { CatalogueEntry, EventThemeId } from "./types";

export const CATALOGUE: Record<EventThemeId, CatalogueEntry> = {
  "pink-october": {
    id: "pink-october",
    name: "Octobre Rose",
    icon: "🎀",
    description: "Sensibilisation au cancer du sein - octobre",
    defaultDateRange: { startMonth: 10, startDay: 1, endMonth: 10, endDay: 31 },
    defaultPriority: 80,
    defaultEffects: {
      ribbon: true,
      pinkParticles: true,
    },
    availableEffects: ["ribbon", "pinkParticles"],
    effectLabels: {
      ribbon: "Ruban rose",
      pinkParticles: "Particules légères",
    },
  },

  halloween: {
    id: "halloween",
    name: "Halloween",
    icon: "🎃",
    description: "Ambiance Halloween - fin octobre",
    defaultDateRange: { startMonth: 10, startDay: 23, endMonth: 11, endDay: 2 },
    defaultPriority: 90,
    defaultEffects: {
      glow: true,
      halloweenParticles: true,
      bats: true,
      pumpkins: true,
    },
    availableEffects: ["glow", "halloweenParticles", "bats", "pumpkins"],
    effectLabels: {
      glow: "Lueur orange",
      halloweenParticles: "Particules",
      bats: "Chauves-souris",
      pumpkins: "Citrouilles",
    },
  },

  noel: {
    id: "noel",
    name: "Noël",
    icon: "🎄",
    description: "Ambiance Noël - décembre / début janvier",
    defaultDateRange: { startMonth: 12, startDay: 1, endMonth: 1, endDay: 6 },
    defaultPriority: 95,
    defaultEffects: {
      snowflakes: true,
      christmasGlow: true,
    },
    availableEffects: ["snowflakes", "christmasGlow"],
    effectLabels: {
      snowflakes: "Flocons de neige",
      christmasGlow: "Lueurs & décorations",
    },
  },
};

// Ordered list used as tiebreaker in priority resolution
export const CATALOGUE_ORDER: EventThemeId[] = ["pink-october", "halloween", "noel"];
