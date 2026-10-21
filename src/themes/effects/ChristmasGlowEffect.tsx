import { useHeaderHeight } from "./useHeaderHeight";
import { spawnItsTime } from "./christmasClickEffect";

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
          position: "absolute", top: HEADER_H + 8, left: 10,
          fontSize: "42px", lineHeight: 1,
          animation: "noelSway 6s ease-in-out infinite",
          transformOrigin: "top center",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >🌿</div>

      {/* Houx coin haut-droit */}
      <div
        aria-hidden="true"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H + 8, right: 10,
          fontSize: "42px", lineHeight: 1,
          animation: "noelSway 8s ease-in-out infinite 1.5s",
          transformOrigin: "top center",
          transform: "scaleX(-1)",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >🌿</div>

      {/* Cloche gauche — desktop */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H + 60, left: 14,
          fontSize: "28px", lineHeight: 1,
          animation: "noelSway 5s ease-in-out infinite 0.8s",
          transformOrigin: "top center",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >🔔</div>

      {/* Cloche droite — desktop */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: HEADER_H + 60, right: 14,
          fontSize: "28px", lineHeight: 1,
          animation: "noelSway 5s ease-in-out infinite 2.3s",
          transformOrigin: "top center",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >🔔</div>

      {/* Étoile milieu gauche — desktop */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: "42%", left: 8,
          fontSize: "36px", lineHeight: 1,
          animation: "noelStarTwinkle 2.5s ease-in-out infinite",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >⭐</div>

      {/* Étoile milieu droite — desktop */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", top: "62%", right: 10,
          fontSize: "26px", lineHeight: 1, opacity: 0.7,
          animation: "noelStarTwinkle 3.5s ease-in-out infinite 1s",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >✨</div>

      {/* Cadeau bas-gauche — desktop */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", bottom: "8%", left: 12,
          fontSize: "30px", lineHeight: 1,
          animation: "noelStarTwinkle 4s ease-in-out infinite 0.5s",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >🎁</div>

      {/* Bonhomme de neige bas-droit — desktop */}
      <div
        aria-hidden="true"
        className="noel--desktop"
        onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
        style={{
          position: "absolute", bottom: "8%", right: 12,
          fontSize: "30px", lineHeight: 1,
          animation: "noelStarTwinkle 4.5s ease-in-out infinite 1.5s",
          userSelect: "none",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      >⛄</div>
    </>
  );
}
