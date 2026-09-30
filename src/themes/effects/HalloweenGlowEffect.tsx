// Ambiance Halloween — toile d'araignée, lueurs et décors bien visibles.
import { useHeaderHeight } from "./useHeaderHeight";

function SpiderWeb() {
  // Toile d'araignée dans le coin haut-gauche
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      width={120}
      height={120}
      fill="none"
      stroke="hsl(var(--event-decoration))"
      strokeWidth="1.2"
      strokeLinecap="round"
      style={{ opacity: 0.55 }}
    >
      {/* Fils radiaux */}
      {[0, 30, 60, 90, 120, 150, 180].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1="0" y1="0"
            x2={Math.cos(rad) * 115}
            y2={Math.sin(rad) * 115}
          />
        );
      })}
      {/* Anneaux concentriques */}
      {[20, 40, 65, 95].map((r, i) => (
        <path
          key={i}
          d={[
            `M ${r} 0`,
            `L ${r * Math.cos((30 * Math.PI) / 180)} ${r * Math.sin((30 * Math.PI) / 180)}`,
            `L ${r * Math.cos((60 * Math.PI) / 180)} ${r * Math.sin((60 * Math.PI) / 180)}`,
            `L 0 ${r}`,
            `L ${r * Math.cos((120 * Math.PI) / 180)} ${r * Math.sin((120 * Math.PI) / 180)}`,
            `L ${r * Math.cos((150 * Math.PI) / 180)} ${r * Math.sin((150 * Math.PI) / 180)}`,
            `L ${-r} 0`,
          ].join(" ")}
          fill="none"
        />
      ))}
      {/* Araignée */}
      <ellipse cx="65" cy="38" rx="5" ry="4" fill="hsl(var(--event-decoration))" stroke="none" opacity="0.7" />
      <ellipse cx="65" cy="42" rx="7" ry="6" fill="hsl(0 0% 8%)" stroke="none" opacity="0.8" />
      {[-10,-5,5,10].map((dx, i) => (
        <line key={i} x1={65 + dx} y1={i < 2 ? 38 : 42} x2={65 + dx * 2.5} y2={i < 2 ? 32 : 48} strokeWidth="1" opacity="0.6" />
      ))}
    </svg>
  );
}

function SkullSVG({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 54" aria-hidden="true" width={size} height={Math.round(size * 1.12)} fill="hsl(var(--event-primary))" opacity="0.7">
      {/* Crâne */}
      <ellipse cx="24" cy="22" rx="18" ry="18" />
      {/* Mâchoire */}
      <rect x="10" y="34" width="28" height="14" rx="4" />
      {/* Dents */}
      <rect x="13" y="38" width="5" height="8" rx="1" fill="hsl(0 0% 10%)" />
      <rect x="21" y="38" width="5" height="8" rx="1" fill="hsl(0 0% 10%)" />
      <rect x="29" y="38" width="5" height="8" rx="1" fill="hsl(0 0% 10%)" />
      {/* Yeux */}
      <ellipse cx="17" cy="20" rx="6" ry="7" fill="hsl(0 0% 8%)" />
      <ellipse cx="31" cy="20" rx="6" ry="7" fill="hsl(0 0% 8%)" />
      {/* Nez */}
      <path d="M22 28 L24 25 L26 28 Z" fill="hsl(0 0% 8%)" />
    </svg>
  );
}

export function HalloweenGlowEffect() {
  const HEADER_H = useHeaderHeight();
  return (
    <>
      {/* Lueur orange bas-gauche */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "clamp(200px, 35vw, 450px)",
          height: "clamp(180px, 28vh, 350px)",
          background: "radial-gradient(ellipse at bottom left, hsl(var(--event-glow)) 0%, transparent 70%)",
          animation: "halloweenGlowPulse 5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {/* Lueur violette bas-droit */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "clamp(150px, 25vw, 300px)",
          height: "clamp(130px, 22vh, 280px)",
          background: "radial-gradient(ellipse at bottom right, hsl(270 50% 40% / 0.18) 0%, transparent 70%)",
          animation: "halloweenGlowPulse 7s ease-in-out infinite 2s",
          pointerEvents: "none",
        }}
      />
      {/* Lueur haut-droit */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: HEADER_H,
          right: 0,
          width: "clamp(120px, 20vw, 250px)",
          height: "clamp(100px, 16vh, 200px)",
          background: "radial-gradient(ellipse at top right, hsl(var(--event-glow)) 0%, transparent 70%)",
          animation: "halloweenGlowPulse 6s ease-in-out infinite 1s",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      />

      {/* Toile d'araignée — coin haut-gauche sous le header */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: HEADER_H - 20,
          left: 0,
        }}
      >
        <SpiderWeb />
      </div>

      {/* Crâne — milieu gauche, desktop */}
      <div
        aria-hidden="true"
        className="hw-bat--desktop"
        style={{
          position: "absolute",
          top: "42%",
          left: 8,
          animation: "hwPumpkinSway 7s ease-in-out infinite 2s",
        }}
      >
        <SkullSVG size={42} />
      </div>

      {/* Crâne petit — milieu droit, desktop */}
      <div
        aria-hidden="true"
        className="hw-bat--desktop"
        style={{
          position: "absolute",
          top: "58%",
          right: 10,
          opacity: 0.5,
          animation: "hwPumpkinSway 9s ease-in-out infinite",
        }}
      >
        <SkullSVG size={30} />
      </div>
    </>
  );
}
