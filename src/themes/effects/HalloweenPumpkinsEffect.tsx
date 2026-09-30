import { useState } from "react";
import type { BoumEntry } from "./useBoum";
import { useBoum } from "./useBoum";
import { useHeaderHeight } from "./useHeaderHeight";

function JackOLantern({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 80 90"
      aria-hidden="true"
      width={size}
      height={Math.round(size * 1.12)}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Tige */}
      <rect x="37" y="2" width="6" height="12" rx="3" fill="hsl(100 40% 25%)" />
      <path d="M43 8 Q54 2 54 10 Q50 12 43 8 Z" fill="hsl(100 40% 30%)" />
      {/* Corps orange */}
      <ellipse cx="40" cy="52" rx="34" ry="30" fill="hsl(28 92% 50%)" />
      <path d="M6 52 Q-2 35 12 28 Q8 40 6 52 Z" fill="hsl(28 85% 42%)" opacity="0.7" />
      <path d="M74 52 Q82 35 68 28 Q72 40 74 52 Z" fill="hsl(28 85% 42%)" opacity="0.7" />
      <path d="M40 22 Q38 37 40 52 Q42 37 40 22 Z" fill="hsl(28 75% 38%)" opacity="0.5" />
      <path d="M24 24 Q22 38 24 53" stroke="hsl(28 75% 38%)" strokeWidth="2" opacity="0.4" fill="none" strokeLinecap="round" />
      <path d="M56 24 Q58 38 56 53" stroke="hsl(28 75% 38%)" strokeWidth="2" opacity="0.4" fill="none" strokeLinecap="round" />
      {/* Intérieur sombre */}
      <ellipse cx="40" cy="52" rx="28" ry="24" fill="hsl(0 0% 6%)" opacity="0.55" />
      {/* Yeux triangulaires */}
      <polygon points="22,40 30,28 38,40" fill="hsl(40 100% 65%)" />
      <polygon points="42,40 50,28 58,40" fill="hsl(40 100% 65%)" />
      {/* Sourire dentelé */}
      <path
        d="M18 60 Q22 68 28 62 Q32 70 36 63 Q40 71 44 63 Q48 70 52 62 Q58 68 62 60"
        fill="none"
        stroke="hsl(40 100% 65%)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="40" cy="52" rx="20" ry="16" fill="hsl(40 100% 65%)" opacity="0.12" />
      <ellipse cx="40" cy="80" rx="30" ry="6" fill="hsl(28 80% 30%)" opacity="0.4" />
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
            fontSize: "1.35rem",
            color: "hsl(28 96% 52%)",
            textShadow: "0 2px 10px rgba(255,255,255,0.6), 0 1px 4px rgba(0,0,0,0.25)",
            whiteSpace: "nowrap",
            animation: "boumFloat 2.4s ease-out forwards",
            zIndex: 12,
          }}
        >
          🎃 Happy Halloween !
        </div>
      ))}
    </>
  );
}

function ClickablePumpkin({
  size,
  style,
  className,
  onBoum,
}: {
  size: number;
  style?: React.CSSProperties;
  className?: string;
  onBoum: (e: React.MouseEvent) => void;
}) {
  const [booming, setBoom] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    onBoum(e);
    setBoom(true);
    setTimeout(() => setBoom(false), 500);
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
        filter: "drop-shadow(0 4px 16px hsl(28 90% 50% / 0.5))",
        ...style,
      }}
    >
      <JackOLantern size={size} />
    </div>
  );
}

export function HalloweenPumpkinsEffect() {
  const { boums, fire } = useBoum();
  const HEADER_H = useHeaderHeight();

  return (
    <>
      <ClickablePumpkin size={90} onBoum={fire} style={{ bottom: 12, left: 10, animation: "hwPumpkinSway 6s ease-in-out infinite" }} />
      <ClickablePumpkin size={78} onBoum={fire} style={{ bottom: 10, right: 12, animation: "hwPumpkinSway 7s ease-in-out infinite 1.5s" }} />
      <ClickablePumpkin size={52} onBoum={fire} className="hw-pumpkin--desktop" style={{ top: "52%", right: 8, opacity: 0.55, animation: "hwPumpkinSway 9s ease-in-out infinite 3s" }} />
      <ClickablePumpkin size={62} onBoum={fire} className="hw-pumpkin--desktop" style={{ top: HEADER_H + 10, right: 14, opacity: 0.50, animation: "hwPumpkinSway 8s ease-in-out infinite 0.5s" }} />

      <BoumTexts boums={boums} />
    </>
  );
}
