import { spawnItsTime } from "./christmasClickEffect";

const FLAKES = [
  { left: "3%",  dur: 8,  delay: 0   },
  { left: "9%",  dur: 10, delay: 1.5 },
  { left: "16%", dur: 11, delay: 2.5 },
  { left: "24%", dur: 9,  delay: 1.2 },
  { left: "31%", dur: 13, delay: 4.0 },
  { left: "38%", dur: 10, delay: 0.8 },
  { left: "45%", dur: 12, delay: 3.2 },
  { left: "52%", dur: 8,  delay: 6.5 },
  { left: "59%", dur: 9,  delay: 1.8 },
  { left: "66%", dur: 11, delay: 0.5 },
  { left: "73%", dur: 12, delay: 3.8 },
  { left: "80%", dur: 9,  delay: 2.2 },
  { left: "86%", dur: 11, delay: 5.0 },
  { left: "91%", dur: 8,  delay: 4.5 },
  { left: "97%", dur: 14, delay: 3.0 },
];

const SYMBOLS = ["❄", "❅", "❆", "✼", "❋"];

export function ChristmasSnowflakesEffect() {
  return (
    <>
      {FLAKES.map((f, i) => (
        <div
          key={i}
          aria-hidden="true"
          onClick={(e) => spawnItsTime(e.clientX, e.clientY)}
          style={{
            position: "absolute",
            top: "-40px",
            left: f.left,
            fontSize: i % 4 === 0 ? "24px" : i % 4 === 1 ? "14px" : i % 4 === 2 ? "18px" : "20px",
            color: "hsl(var(--event-particle))",
            opacity: 0.75,
            animationName: i % 2 === 0 ? "noelSnowFall" : "noelSnowFallB",
            animationDuration: `${f.dur}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationDelay: `${f.delay}s`,
            userSelect: "none",
            pointerEvents: "auto",
            cursor: "pointer",
          }}
        >
          {SYMBOLS[i % SYMBOLS.length]}
        </div>
      ))}
    </>
  );
}
