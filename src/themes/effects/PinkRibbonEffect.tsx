import { useState, useCallback } from "react";
import type { BoumEntry } from "./useBoum";
import { useBoum } from "./useBoum";
import { useHeaderHeight } from "./useHeaderHeight";

// Le ruban exact fourni par l'utilisateur — à placer dans public/ribbon-rose.png
const RIBBON_SRC = "/ribbon-rose.png";

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
            fontSize: "1.35rem",
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

function ClickableRibbon({
  size,
  style,
  className,
  onBoum,
  shadow = "hsl(335 72% 40% / 0.45)",
}: {
  size: number;
  style?: React.CSSProperties;
  className?: string;
  onBoum: (e: React.MouseEvent) => void;
  shadow?: string;
}) {
  const [booming, setBooming] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    onBoum(e);
    setBooming(true);
    setTimeout(() => setBooming(false), 500);
  };

  return (
    <div
      className={className}
      onClick={handleClick}
      style={{
        position: "absolute",
        pointerEvents: "auto",
        cursor: "pointer",
        animation: booming ? "boumScale 0.45s ease-out" : undefined,
        filter: `drop-shadow(0 4px 14px ${shadow})`,
        ...style,
      }}
    >
      <img
        src={RIBBON_SRC}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{ display: "block", objectFit: "contain" }}
        draggable={false}
      />
    </div>
  );
}

export function PinkRibbonEffect() {
  const { boums, fire } = useBoum();
  const HEADER_H = useHeaderHeight();

  return (
    <>
      {/* ── Halos roses variés ────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "12vh",
        background: "radial-gradient(ellipse 80% 100% at 50% 100%, hsl(335 75% 60% / 0.20) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", top: HEADER_H, right: 0, width: "30vw", height: "18vh",
        background: "radial-gradient(ellipse at top right, hsl(318 82% 62% / 0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", top: HEADER_H, left: 0, width: "22vw", height: "14vh",
        background: "radial-gradient(ellipse at top left, hsl(350 70% 65% / 0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Rubans cliquables (drop-shadow varié) ─────────── */}
      <ClickableRibbon size={96} onBoum={fire} shadow="hsl(335 72% 40% / 0.50)" style={{ top: HEADER_H + 6, right: 12, animation: "pinkRibbonPulse 5s ease-in-out infinite" }} />
      <ClickableRibbon size={80} onBoum={fire} shadow="hsl(318 80% 38% / 0.50)" style={{ bottom: 18, left: 12, animation: "pinkRibbonPulse 6.5s ease-in-out infinite 1.5s" }} />
      <ClickableRibbon size={62} onBoum={fire} shadow="hsl(350 68% 50% / 0.42)" className="pink-particle--desktop" style={{ top: "40%", right: 10, opacity: 0.80, animation: "pinkRibbonPulse 7s ease-in-out infinite 3s" }} />
      <ClickableRibbon size={68} onBoum={fire} shadow="hsl(328 76% 40% / 0.46)" className="pink-particle--desktop" style={{ bottom: 22, right: 14, opacity: 0.74, animation: "pinkRibbonPulse 5.5s ease-in-out infinite 0.8s" }} />
      <ClickableRibbon size={54} onBoum={fire} shadow="hsl(342 65% 55% / 0.40)" className="pink-particle--desktop" style={{ top: "56%", left: 10, opacity: 0.68, animation: "pinkRibbonPulse 8s ease-in-out infinite 2s" }} />

      {/* ── Textes boom ───────────────────────────────────── */}
      <BoumTexts boums={boums} />
    </>
  );
}
