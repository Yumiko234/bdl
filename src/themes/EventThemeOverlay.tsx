import { useEventTheme } from "./EventThemeProvider";
import { PinkRibbonEffect } from "./effects/PinkRibbonEffect";
import { PinkParticlesEffect } from "./effects/PinkParticlesEffect";
import { HalloweenGlowEffect } from "./effects/HalloweenGlowEffect";
import { HalloweenParticlesEffect } from "./effects/HalloweenParticlesEffect";
import { HalloweenBatsEffect } from "./effects/HalloweenBatsEffect";
import { HalloweenPumpkinsEffect } from "./effects/HalloweenPumpkinsEffect";

// Rendered once at the app root. Fixed, pointer-events:none, z-index below nav (z-50).
// overflow:hidden on the container prevents any effect from causing horizontal scroll.
export function EventThemeOverlay() {
  const { resolved } = useEventTheme();
  const { id, settings } = resolved;

  if (!id || !settings) return null;

  const fx = settings.effects;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {id === "pink-october" && (
        <>
          {fx.ribbon && <PinkRibbonEffect />}
          {fx.pinkParticles && <PinkParticlesEffect />}
        </>
      )}

      {id === "halloween" && (
        <>
          {fx.glow && <HalloweenGlowEffect />}
          {fx.halloweenParticles && <HalloweenParticlesEffect />}
          {fx.bats && <HalloweenBatsEffect />}
          {fx.pumpkins && <HalloweenPumpkinsEffect />}
        </>
      )}
    </div>
  );
}
