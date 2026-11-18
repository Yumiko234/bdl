import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrackingLockState {
  locked: boolean;
  reason: string | null;
  lockedAt: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

// La table n'est pas (encore) dans types.ts : régénérer les types après la migration.
const db = supabase as any;

/**
 * État du verrou d'écriture du suivi des actions.
 * Le blocage réel est appliqué par la base (triggers) ; ce hook ne sert qu'à
 * adapter l'interface. En cas d'échec de lecture, l'UI reste déverrouillée et
 * la base refusera toute écriture si le verrou est actif.
 */
export const useTrackingLock = (): TrackingLockState => {
  const [state, setState] = useState({ locked: false, reason: null as string | null, lockedAt: null as string | null });
  const [loading, setLoading] = useState(true);
  const channelId = useRef(`tracking-lock-${Math.random().toString(36).slice(2)}`);

  const refresh = useCallback(async () => {
    const { data, error } = await db
      .from("bdl_tracking_lock")
      .select("is_locked, reason, locked_at")
      .maybeSingle();
    if (!error && data) {
      setState({ locked: !!data.is_locked, reason: data.reason ?? null, lockedAt: data.locked_at ?? null });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = db
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "bdl_tracking_lock" }, () => refresh())
      .subscribe();
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      db.removeChannel(channel);
    };
  }, [refresh]);

  return { ...state, loading, refresh };
};
