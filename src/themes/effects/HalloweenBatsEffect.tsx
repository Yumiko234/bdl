// Chauves-souris Halloween — traversent l'écran en battant des ailes.
import { useHeaderHeight } from "./useHeaderHeight";

function BatSVG({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 60 32"
      aria-hidden="true"
      width={size}
      height={Math.round(size * 0.53)}
      fill="hsl(var(--event-decoration))"
      style={{ overflow: "visible" }}
    >
      {/* Corps */}
      <ellipse cx="30" cy="19" rx="6" ry="5" />
      {/* Oreilles */}
      <path d="M26 14 L24 8 L30 14 Z" />
      <path d="M34 14 L36 8 L30 14 Z" />
      {/* Aile gauche */}
      <path d="M24 19 Q16 10 4 14 Q10 20 18 21 Z" />
      <path d="M24 19 Q14 22 6 28 Q12 24 20 22 Z" opacity="0.7" />
      {/* Aile droite */}
      <path d="M36 19 Q44 10 56 14 Q50 20 42 21 Z" />
      <path d="M36 19 Q46 22 54 28 Q48 24 40 22 Z" opacity="0.7" />
      {/* Yeux rouges */}
      <circle cx="27" cy="18" r="2" fill="hsl(0 80% 55%)" />
      <circle cx="33" cy="18" r="2" fill="hsl(0 80% 55%)" />
    </svg>
  );
}

export function HalloweenBatsEffect() {
  const HEADER_H = useHeaderHeight();
  return (
    <>
      {/* Chauve-souris 1 — grande, traverse de gauche à droite */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: HEADER_H + 20,
          left: "-70px",
          opacity: 0.55,
          animationName: "hwBatFly1",
          animationDuration: "22s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDelay: "3s",
        }}
      >
        <div style={{
          animationName: "hwBatFlap",
          animationDuration: "0.38s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        }}>
          <BatSVG size={32} />
        </div>
      </div>

      {/* Chauve-souris 2 — petite, desktop */}
      <div
        aria-hidden="true"
        className="hw-bat--desktop"
        style={{
          position: "absolute",
          top: HEADER_H + 55,
          left: "-50px",
          opacity: 0.40,
          animationName: "hwBatFly2",
          animationDuration: "30s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDelay: "12s",
        }}
      >
        <div style={{
          animationName: "hwBatFlap",
          animationDuration: "0.50s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        }}>
          <BatSVG size={22} />
        </div>
      </div>

      {/* Chauve-souris 3 — desktop, décalée */}
      <div
        aria-hidden="true"
        className="hw-bat--desktop"
        style={{
          position: "absolute",
          top: HEADER_H + 85,
          left: "-60px",
          opacity: 0.32,
          animationName: "hwBatFly1",
          animationDuration: "26s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDelay: "8s",
        }}
      >
        <div style={{
          animationName: "hwBatFlap",
          animationDuration: "0.42s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        }}>
          <BatSVG size={18} />
        </div>
      </div>
    </>
  );
}
