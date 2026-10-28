import { useHeaderHeight } from "./useHeaderHeight";

function SleighSVG({ size = 220 }: { size?: number }) {
  const h = Math.round(size * 0.3);
  const c = "hsl(145 48% 24%)";           // rennes : vert sapin foncé
  const cd = "hsl(145 42% 18%)";          // accents sombres
  const cr = "hsl(var(--event-primary))"; // traîneau : rouge Noël
  return (
    <svg viewBox="0 0 220 66" width={size} height={h} aria-hidden="true" fill="none">
      {/* ── Reindeer 1 (front) ── */}
      <g>
        <ellipse cx="28" cy="40" rx="20" ry="9" fill={c} />
        <path d="M11,33 Q8,26 5,24" stroke={c} strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="5" cy="20" r="7" fill={c} />
        {/* Antlers */}
        <path d="M2,14 L-2,4 M-2,4 L-6,0 M-2,4 L1,1 M8,12 L6,4 M6,4 L3,0 M6,4 L9,1"
          stroke={cd} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Legs */}
        <line x1="15" y1="48" x2="13" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="22" y1="49" x2="20" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="32" y1="49" x2="32" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="39" y1="48" x2="42" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        {/* Rudolph nose */}
        <circle cx="1" cy="21" r="4" fill="hsl(0 72% 50%)" />
        <circle cx="1" cy="21" r="2" fill="hsl(0 72% 68%)" opacity="0.5" />
      </g>

      {/* ── Reindeer 2 (behind) ── */}
      <g transform="translate(50,5)">
        <ellipse cx="28" cy="40" rx="20" ry="9" fill={c} />
        <path d="M11,33 Q8,26 5,24" stroke={c} strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="5" cy="20" r="7" fill={c} />
        <path d="M2,14 L-2,4 M-2,4 L-6,0 M-2,4 L1,1 M8,12 L6,4 M6,4 L3,0 M6,4 L9,1"
          stroke={cd} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <line x1="15" y1="48" x2="13" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="22" y1="49" x2="20" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="32" y1="49" x2="32" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="39" y1="48" x2="42" y2="60" stroke={c} strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* ── Harness ── */}
      <path d="M46,38 L140,38 M96,40 L140,40"
        stroke={cd} strokeWidth="1.5" strokeLinecap="round" />

      {/* ── Sleigh runner ── */}
      <path d="M136,52 C142,60 162,62 190,58 C206,55 216,52 220,50"
        stroke={cd} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M133,52 C138,62 160,64 192,60 C208,57 218,54 222,52"
        stroke={cd} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* ── Sleigh body — rouge ── */}
      <path d="M145,28 C140,36 137,44 136,52 L185,52 C185,44 184,36 178,30 Z"
        fill={cr} />
      {/* Seat back */}
      <path d="M178,30 C183,20 186,12 188,10 C192,12 190,22 186,30 Z"
        fill={cr} />

      {/* ── Santa hat ── */}
      <ellipse cx="187" cy="10" rx="9" ry="3" fill="white" opacity="0.9" />
      <path d="M184,10 L188,10 L192,-4 Z" fill={cr} />
      <circle cx="193" cy="-5" r="3.5" fill="white" opacity="0.95" />

      {/* ── Sack hint in sleigh ── */}
      <ellipse cx="158" cy="42" rx="13" ry="9" fill="hsl(var(--event-secondary))" opacity="0.7" />
    </svg>
  );
}

export function ChristmasSantaEffect() {
  const HEADER_H = useHeaderHeight();
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: HEADER_H + 10,
          left: 0,
          animation: "noelSleighFly 22s linear infinite",
          willChange: "transform",
          opacity: 0.82,
        }}
      >
        <SleighSVG size={220} />
      </div>

      <div
        aria-hidden="true"
        className="noel--desktop"
        style={{
          position: "absolute",
          top: HEADER_H + 60,
          left: 0,
          animation: "noelSleighFly2 28s linear infinite 12s",
          willChange: "transform",
          opacity: 0.62,
        }}
      >
        <SleighSVG size={170} />
      </div>
    </>
  );
}
