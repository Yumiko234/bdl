import { useHeaderHeight } from "./useHeaderHeight";
import { spawnItsTime } from "./christmasClickEffect";

function HollyCorner({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 110 86"
      width={110}
      height={86}
      aria-hidden="true"
      fill="none"
      style={{ opacity: 0.9, transform: flip ? "scaleX(-1)" : undefined }}
    >
      <path d="M 4,4 C 18,14 38,30 58,46 C 72,58 90,70 106,81"
        stroke="hsl(25 50% 26%)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 22,18 C 14,10 6,12 4,18"
        stroke="hsl(25 50% 26%)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 52,44 C 62,32 74,34 74,42"
        stroke="hsl(25 50% 26%)" strokeWidth="2" strokeLinecap="round" />

      <ellipse cx="14" cy="10" rx="12" ry="5.5" fill="hsl(var(--event-secondary))"
        transform="rotate(-45 14 10)" />
      <ellipse cx="25" cy="7" rx="11" ry="5" fill="hsl(var(--event-decoration))"
        transform="rotate(15 25 7)" />
      <ellipse cx="8" cy="21" rx="10" ry="4.5" fill="hsl(var(--event-secondary))"
        transform="rotate(-70 8 21)" />
      <circle cx="18" cy="20" r="5" fill="hsl(var(--event-primary))" />
      <circle cx="25" cy="15" r="4.5" fill="hsl(0 72% 48%)" />
      <circle cx="11" cy="16" r="4" fill="hsl(var(--event-primary))" />

      <ellipse cx="47" cy="37" rx="12" ry="5" fill="hsl(var(--event-secondary))"
        transform="rotate(-40 47 37)" />
      <ellipse cx="60" cy="32" rx="11" ry="4.5" fill="hsl(var(--event-decoration))"
        transform="rotate(20 60 32)" />
      <circle cx="54" cy="45" r="4.5" fill="hsl(var(--event-primary))" />
      <circle cx="63" cy="41" r="4" fill="hsl(0 72% 48%)" />
    </svg>
  );
}

function BellSVG({ size = 36, green = false }: { size?: number; green?: boolean }) {
  const fill = green ? "hsl(var(--event-secondary))" : "hsl(var(--event-primary))";
  const stroke = green ? "hsl(145 55% 24%)" : "hsl(0 60% 32%)";
  return (
    <svg viewBox="0 0 40 46" width={size} height={Math.round(size * 1.15)} aria-hidden="true" fill="none">
      <path d="M20,5 C20,5 28,5 33,11 C37,17 38,25 38,31 L2,31 C2,25 3,17 7,11 C12,5 20,5 20,5 Z"
        fill={fill} stroke={stroke} strokeWidth="0.8" />
      <path d="M0,31 Q20,41 40,31" fill={fill} stroke={stroke} strokeWidth="0.8" />
      <rect x="17" y="1" width="6" height="6" rx="3" fill="hsl(46 80% 55%)" stroke="hsl(36 80% 36%)" strokeWidth="0.7" />
      <circle cx="20" cy="38" r="4" fill="hsl(46 65% 40%)" stroke="hsl(36 65% 28%)" strokeWidth="0.7" />
      <ellipse cx="14" cy="16" rx="4" ry="6" fill="white" opacity="0.25" />
    </svg>
  );
}

function StarSVG({ size = 42 }: { size?: number }) {
  return (
    <svg viewBox="0 0 46 46" width={size} height={size} aria-hidden="true" fill="none">
      <polygon
        points="23,2 28,16.5 43,17 31,25.5 35.4,40 23,32 10.6,40 15,25.5 3,17 18,16.5"
        fill="hsl(46 95% 62%)"
        stroke="hsl(40 88% 40%)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <ellipse cx="19" cy="15" rx="5" ry="8" fill="white" opacity="0.22" transform="rotate(-18 19 15)" />
    </svg>
  );
}

function GiftSVG({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 38 42" width={size} height={Math.round(size * 1.1)} aria-hidden="true" fill="none">
      <rect x="2" y="16" width="34" height="24" rx="2"
        fill="hsl(var(--event-secondary))" stroke="hsl(var(--event-decoration))" strokeWidth="0.8" />
      <rect x="0" y="11" width="38" height="7" rx="2"
        fill="hsl(var(--event-decoration))" />
      <rect x="17" y="16" width="4" height="24" fill="hsl(var(--event-primary))" opacity="0.85" />
      <rect x="2" y="24" width="34" height="4" fill="hsl(var(--event-primary))" opacity="0.85" />
      <rect x="17" y="11" width="4" height="7" fill="hsl(var(--event-primary))" />
      <path d="M19,11 C16,4 8,2 10,8 C11,11 16,11 19,11 Z"
        fill="hsl(var(--event-primary))" />
      <path d="M19,11 C22,4 30,2 28,8 C27,11 22,11 19,11 Z"
        fill="hsl(var(--event-primary))" />
      <circle cx="19" cy="11" r="3" fill="hsl(0 62% 35%)" />
    </svg>
  );
}

function SnowmanSVG({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 36 52" width={size} height={Math.round(size * 1.44)} aria-hidden="true" fill="none">
      <circle cx="18" cy="39" r="12" fill="white" stroke="hsl(210 28% 72%)" strokeWidth="0.9" />
      <circle cx="18" cy="20" r="9" fill="white" stroke="hsl(210 28% 72%)" strokeWidth="0.9" />
      <rect x="9" y="11" width="18" height="3" rx="1.5" fill="hsl(var(--event-secondary))" />
      <rect x="13" y="2" width="10" height="11" rx="1" fill="hsl(var(--event-secondary))" />
      <rect x="13" y="8" width="10" height="3" fill="hsl(var(--event-particle))" opacity="0.7" />
      <circle cx="14.5" cy="18" r="1.5" fill="hsl(220 25% 20%)" />
      <circle cx="21.5" cy="18" r="1.5" fill="hsl(220 25% 20%)" />
      <path d="M18,20 L23,21.5 L18,23 Z" fill="hsl(24 90% 55%)" />
      <path d="M13.5,24 Q18,27.5 22.5,24" stroke="hsl(220 25% 20%)" strokeWidth="1.2"
        fill="none" strokeLinecap="round" />
      <path d="M9,28 Q18,32 27,28" stroke="hsl(var(--event-primary))" strokeWidth="3"
        fill="none" strokeLinecap="round" opacity="0.9" />
      <circle cx="18" cy="34" r="1.5" fill="hsl(220 25% 20%)" />
      <circle cx="18" cy="39" r="1.5" fill="hsl(220 25% 20%)" />
      <circle cx="18" cy="44" r="1.5" fill="hsl(220 25% 20%)" />
    </svg>
  );
}

export function ChristmasGlowEffect() {
  const HEADER_H = useHeaderHeight();
  return (
    <>
      {/* Lueur verte bas-gauche */}
      <div aria-hidden="true" style={{
        position: "absolute", bottom: 0, left: 0,
        width: "clamp(200px,35vw,450px)", height: "clamp(180px,28vh,350px)",
        background: "radial-gradient(ellipse at bottom left, hsl(var(--event-glow)) 0%, transparent 70%)",
        animation: "noelGlowPulse 5s ease-in-out infinite",
      }} />

      {/* Lueur rouge bas-droite */}
      <div aria-hidden="true" style={{
        position: "absolute", bottom: 0, right: 0,
        width: "clamp(150px,25vw,300px)", height: "clamp(130px,22vh,280px)",
        background: "radial-gradient(ellipse at bottom right, hsl(0 70% 50% / 0.14) 0%, transparent 70%)",
        animation: "noelGlowPulse 7s ease-in-out infinite 2s",
      }} />

      {/* Houx coin haut-gauche */}
      <div
        aria-hidden="true"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H - 6, left: 4,
          animation: "noelSway 6s ease-in-out infinite",
          transformOrigin: "top center",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <HollyCorner />
      </div>

      {/* Houx coin haut-droit */}
      <div
        aria-hidden="true"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H - 6, right: 4,
          animation: "noelSway 8s ease-in-out infinite 1.5s",
          transformOrigin: "top center",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <HollyCorner flip />
      </div>

      {/* Cloche gauche — rouge */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H + 62, left: 14,
          animation: "noelSway 5s ease-in-out infinite 0.8s",
          transformOrigin: "top center",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <BellSVG size={38} />
      </div>

      {/* Cloche droite — verte */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H + 62, right: 14,
          animation: "noelSway 5s ease-in-out infinite 2.3s",
          transformOrigin: "top center",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <BellSVG size={38} green />
      </div>

      {/* Étoile milieu gauche */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: "42%", left: 8,
          animation: "noelStarTwinkle 2.5s ease-in-out infinite",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <StarSVG size={46} />
      </div>

      {/* Étoile milieu droite */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: "62%", right: 8,
          opacity: 0.72,
          animation: "noelStarTwinkle 3.5s ease-in-out infinite 1s",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <StarSVG size={34} />
      </div>

      {/* Cadeau bas-gauche */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", bottom: "8%", left: 10,
          animation: "noelStarTwinkle 4s ease-in-out infinite 0.5s",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <GiftSVG size={38} />
      </div>

      {/* Bonhomme de neige bas-droit */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", bottom: "8%", right: 10,
          animation: "noelSway 5s ease-in-out infinite 1.5s",
          transformOrigin: "top center",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >
        <SnowmanSVG size={38} />
      </div>
    </>
  );
}
