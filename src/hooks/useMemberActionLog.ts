import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActionLogType =
  | "action_created"
  | "action_updated"
  | "action_deleted"
  | "note_added"
  | "note_deleted"
  | "attendance_set"
  | "absence_requested";

export interface ActionLogEntry {
  id: string;
  actor_id: string | null;
  target_id: string;
  action_type: ActionLogType;
  entity_table: string;
  entity_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string | null;
}

interface UseMemberActionLogResult {
  entries: ActionLogEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Charge le journal d'activité (qui a fait quoi) pour un membre donné.
 * @param memberId  user_id du membre visé (target_id dans bdl_action_log)
 * @param filterType filtre optionnel par type d'action ("all" = pas de filtre)
 */
export function useMemberActionLog(
  memberId: string | null,
  filterType: ActionLogType | "all" = "all"
): UseMemberActionLogResult {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!memberId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase
      .from("bdl_action_log")
      .select(
        `
        id, actor_id, target_id, action_type, entity_table, entity_id,
        old_data, new_data, created_at,
        actor:profiles!bdl_action_log_actor_id_fkey(full_name, avatar_url)
      `
      )
      .eq("target_id", memberId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterType !== "all") {
      query = query.eq("action_type", filterType);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      setEntries([]);
    } else {
      const mapped = (data as any[]).map((row) => ({
        ...row,
        actor_name: row.actor?.full_name ?? "Système",
        actor_avatar: row.actor?.avatar_url ?? null,
      }));
      setEntries(mapped);
    }
    setLoading(false);
  }, [memberId, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, loading, error, refresh: load };
}