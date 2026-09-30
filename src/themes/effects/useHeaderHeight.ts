import { useState, useLayoutEffect } from "react";

// Mesure dynamiquement la hauteur réelle du header sticky.
// Se recalcule quand le banner FAQ est fermé ou si la fenêtre est redimensionnée.
export function useHeaderHeight(fallback = 60) {
  const [h, setH] = useState(fallback);

  useLayoutEffect(() => {
    const measure = () => {
      // Le header sticky est le conteneur avec la plus grande coordonnée bottom
      // parmi les éléments positionnés en haut de viewport (top < 10).
      let maxBottom = fallback;
      const candidates = document.querySelectorAll<HTMLElement>(
        "header, nav, [class*='z-50'], [class*='sticky']"
      );
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        if (r.top <= 4 && r.height > 0 && r.height < window.innerHeight * 0.5) {
          if (r.bottom > maxBottom) maxBottom = r.bottom;
        }
      }
      setH(Math.round(maxBottom) + 6);
    };

    measure();

    // ResizeObserver sur nav + body pour détecter fermeture du banner
    const ro = new ResizeObserver(measure);
    document.querySelectorAll<HTMLElement>("header, nav").forEach(el => ro.observe(el));
    ro.observe(document.body);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return h;
}
