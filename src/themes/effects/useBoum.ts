import { useState, useCallback } from "react";

export interface BoumEntry { id: number; x: number; y: number; }

export function useBoum() {
  const [boums, setBoums] = useState<BoumEntry[]>([]);

  const fire = useCallback((e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now() + Math.random();
    setBoums(p => [...p, { id, x: r.left + r.width / 2, y: r.top + r.height / 2 }]);
    setTimeout(() => setBoums(p => p.filter(b => b.id !== id)), 2400);
  }, []);

  return { boums, fire };
}
