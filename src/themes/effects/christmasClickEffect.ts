export function spawnItsTime(x: number, y: number) {
  const el = document.createElement("div");
  el.textContent = "It's Tiiiiiiiiiiiiiiimme";
  // Clamp so the text stays visible: estimate ~280px wide
  const half = 140;
  const clampedX = Math.max(half + 8, Math.min(window.innerWidth - half - 8, x));
  Object.assign(el.style, {
    position: "fixed",
    left: `${clampedX}px`,
    top: `${y}px`,
    transform: "translateX(-50%)",
    color: "#dc2626",
    fontWeight: "900",
    fontSize: "1.15rem",
    fontFamily: "Montserrat, Inter, sans-serif",
    textShadow: "0 0 10px #16a34a, 0 0 22px #16a34a, 0 2px 4px rgba(0,0,0,0.6)",
    pointerEvents: "none",
    zIndex: "99999",
    animation: "noelItsTime 2s ease-out forwards",
    whiteSpace: "nowrap",
    letterSpacing: "0.03em",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
