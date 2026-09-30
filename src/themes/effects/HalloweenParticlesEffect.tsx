// Particules braises/étincelles Halloween le long des bords bas.

const EMBERS = [
  { left: "4%",  bottom: "2%",  size: 5,  opacity: 0.55, anim: 0   },
  { left: "12%", bottom: "1%",  size: 4,  opacity: 0.45, anim: 1.2 },
  { left: "22%", bottom: "3%",  size: 6,  opacity: 0.50, anim: 2.4 },
  { left: "34%", bottom: "1%",  size: 4,  opacity: 0.40, anim: 0.8 },
  { left: "48%", bottom: "2%",  size: 5,  opacity: 0.50, anim: 3.0 },
  { left: "60%", bottom: "1%",  size: 4,  opacity: 0.42, anim: 1.6 },
  { left: "74%", bottom: "2%",  size: 6,  opacity: 0.48, anim: 0.4 },
  { left: "88%", bottom: "1%",  size: 5,  opacity: 0.44, anim: 2.0 },
];

export function HalloweenParticlesEffect() {
  return (
    <>
      {EMBERS.map((e, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: e.left,
            bottom: e.bottom,
            width: e.size,
            height: e.size,
            borderRadius: "50%",
            background: `hsl(var(--event-particle))`,
            opacity: e.opacity,
            boxShadow: `0 0 ${e.size * 2}px ${e.size}px hsl(var(--event-particle) / 0.4)`,
            animationName: "hwParticleFloat",
            animationDuration: `${5 + i * 0.5}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDelay: `${e.anim}s`,
          }}
        />
      ))}
    </>
  );
}
