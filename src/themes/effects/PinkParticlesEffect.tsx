import { useState } from "react";
import { useBoum } from "./useBoum";
import type { BoumEntry } from "./useBoum";

function HeartSVG({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 24 22" width={size} height={Math.round(size * 0.92)} aria-hidden="true">
      <path
        d="M12 20 C12 20 2 13 2 6.5 C2 3 4.5 1 7 1 C9 1 11 2.5 12 4 C13 2.5 15 1 17 1 C19.5 1 22 3 22 6.5 C22 13 12 20 12 20 Z"
        fill={color}
      />
    </svg>
  );
}

function BoumTexts({ boums }: { boums: BoumEntry[] }) {
  return (
    <>
      {boums.map(b => (
        <div
          key={b.id}
          aria-live="polite"
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            fontWeight: 800,
            fontSize: "1.25rem",
            color: "hsl(335 80% 48%)",
            textShadow: "0 2px 10px rgba(255,255,255,0.7), 0 1px 4px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
            animation: "boumFloat 2.4s ease-out forwards",
            zIndex: 12,
          }}
        >
          🎀 Joyeux Octobre Rose !
        </div>
      ))}
    </>
  );
}

const HEARTS = [
  { right: "3%",   bottom: "12%", size: 18, opacity: 0.65, anim: 0,   color: "hsl(335 82% 52%)" },  // rose vif
  { right: "5%",   bottom: "28%", size: 14, opacity: 0.55, anim: 1.5, color: "hsl(318 85% 58%)" },  // fuchsia
  { right: "2%",   bottom: "45%", size: 20, opacity: 0.58, anim: 3.2, color: "hsl(350 72% 60%)" },  // rose corail
  { right: "7%",   bottom: "62%", size: 13, opacity: 0.46, anim: 2.0, color: "hsl(328 78% 44%)" },  // framboise
  { left:  "2%",   bottom: "18%", size: 16, opacity: 0.58, anim: 0.8, color: "hsl(342 65% 68%)" },  // rose blush
  { left:  "5%",   bottom: "35%", size: 12, opacity: 0.46, anim: 2.5, color: "hsl(312 80% 55%)" },  // magenta-rose
  { left:  "1%",   bottom: "55%", size: 18, opacity: 0.52, anim: 4.0, color: "hsl(338 90% 56%)" },  // rose chaud
  { left:  "6%",   bottom: "72%", size: 11, opacity: 0.40, anim: 1.2, color: "hsl(355 68% 64%)" },  // rose poudré
];

export function PinkParticlesEffect() {
  const { boums, fire } = useBoum();
  const [boomingIdx, setBoomingIdx] = useState<number | null>(null);

  const handleClick = (e: React.MouseEvent, i: number) => {
    fire(e);
    setBoomingIdx(i);
    setTimeout(() => setBoomingIdx(null), 500);
  };

  return (
    <>
      {HEARTS.map((h, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={i > 3 ? "pink-particle--desktop" : undefined}
          onClick={(e) => handleClick(e, i)}
          style={{
            position: "absolute",
            right: "right" in h ? (h as { right: string }).right : undefined,
            left:  "left"  in h ? (h as { left: string }).left   : undefined,
            bottom: h.bottom,
            opacity: h.opacity,
            animationName: boomingIdx === i ? "boumScale" : "pinkRibbonPulse",
            animationDuration: boomingIdx === i ? "0.45s" : `${4.5 + i * 0.6}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: boomingIdx === i ? "1" : "infinite",
            animationDelay: boomingIdx === i ? "0s" : `${h.anim}s`,
            pointerEvents: "auto",
            cursor: "pointer",
            filter: "drop-shadow(0 1px 4px hsl(var(--event-primary) / 0.3))",
          }}
        >
          <HeartSVG size={h.size} color={h.color} />
        </div>
      ))}
      <BoumTexts boums={boums} />
    </>
  );
}
