import { useHeaderHeight } from "./useHeaderHeight";
import { useBoum, type BoumEntry } from "./useBoum";

function TreeSVG({ size = 80 }: { size?: number }) {
  const h = Math.round(size * 1.25);
  return (
    <svg viewBox="0 0 64 80" width={size} height={h} aria-hidden="true" fill="none">
      {/* Trunk */}
      <rect x="26" y="66" width="12" height="13" rx="2" fill="hsl(25 55% 28%)" />

      {/* Bottom tier */}
      <path d="M2,66 L32,34 L62,66 Z" fill="hsl(var(--event-decoration))" />
      {/* Bottom tier snow tips */}
      <path d="M2,66 L10,58 L32,34 L54,58 L62,66 L52,62 L32,40 L12,62 Z"
        fill="hsl(var(--event-secondary))" />

      {/* Middle tier */}
      <path d="M8,52 L32,22 L56,52 Z" fill="hsl(var(--event-decoration))" />
      <path d="M8,52 L16,45 L32,22 L48,45 L56,52 L46,48 L32,28 L18,48 Z"
        fill="hsl(var(--event-secondary))" />

      {/* Top tier */}
      <path d="M16,38 L32,12 L48,38 Z" fill="hsl(var(--event-decoration))" />
      <path d="M16,38 L22,32 L32,12 L42,32 L48,38 L40,35 L32,18 L24,35 Z"
        fill="hsl(var(--event-secondary))" />

      {/* Star */}
      <polygon
        points="32,4 33.8,9.6 39.7,9.6 35,13 36.8,18.6 32,15.2 27.2,18.6 29,13 24.3,9.6 30.2,9.6"
        fill="hsl(46 95% 62%)"
        stroke="hsl(40 88% 40%)"
        strokeWidth="0.8"
      />

      {/* Ornaments — rouge et vert uniquement */}
      <circle cx="32" cy="44" r="3.5" fill="hsl(var(--event-primary))" />
      <circle cx="22" cy="52" r="3" fill="hsl(var(--event-secondary))" />
      <circle cx="43" cy="50" r="3" fill="hsl(var(--event-primary))" />
      <circle cx="28" cy="58" r="2.8" fill="hsl(var(--event-secondary))" />
      <circle cx="42" cy="60" r="2.5" fill="hsl(var(--event-primary))" />
      <circle cx="32" cy="30" r="2.5" fill="hsl(var(--event-secondary))" />
      <circle cx="24" cy="36" r="2.2" fill="hsl(var(--event-primary))" />
      <circle cx="40" cy="34" r="2.2" fill="hsl(var(--event-secondary))" />

      {/* Guirlande rouge */}
      <path d="M20,50 Q26,48 32,50 Q38,52 44,50"
        stroke="hsl(var(--event-primary))" strokeWidth="1.2" fill="none" opacity="0.55" />
      <path d="M14,60 Q23,58 32,60 Q41,62 50,60"
        stroke="hsl(var(--event-secondary))" strokeWidth="1.2" fill="none" opacity="0.5" />
    </svg>
  );
}

function NoelBoum({ boums }: { boums: BoumEntry[] }) {
  return (
    <>
      {boums.map((b) => (
        <div
          key={b.id}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: b.x,
            top: b.y,
            pointerEvents: "none",
            fontSize: "clamp(13px, 1.8vw, 18px)",
            fontWeight: 800,
            color: "hsl(var(--event-primary))",
            textShadow: "0 1px 4px hsl(var(--event-secondary))",
            whiteSpace: "nowrap",
            animation: "boumFloat 1.3s ease-out forwards",
            zIndex: 9999,
          }}
        >
          🎄 Joyeux Noël !
        </div>
      ))}
    </>
  );
}

function ClickableTree({
  size,
  style,
  className,
}: {
  size: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { boums, fire } = useBoum();
  return (
    <>
      <div
        aria-hidden="true"
        className={className}
        onClick={fire}
        style={{
          cursor: "pointer",
          pointerEvents: "auto",
          animation: "noelSway 7s ease-in-out infinite",
          transformOrigin: "bottom center",
          ...style,
        }}
      >
        <TreeSVG size={size} />
      </div>
      <NoelBoum boums={boums} />
    </>
  );
}

export function ChristmasTreeEffect() {
  const HEADER_H = useHeaderHeight();
  return (
    <>
      {/* Sapin bas-gauche */}
      <ClickableTree
        size={90}
        style={{ position: "absolute", bottom: 0, left: 14 }}
      />

      {/* Sapin bas-droit */}
      <ClickableTree
        size={78}
        style={{ position: "absolute", bottom: 0, right: 14 }}
      />

      {/* Sapin milieu droite - desktop uniquement */}
      <ClickableTree
        size={58}
        className="noel--desktop"
        style={{
          position: "absolute",
          top: HEADER_H + 130,
          right: 10,
          opacity: 0.58,
        }}
      />
    </>
  );
}
