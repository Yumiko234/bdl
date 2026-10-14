import { supabase } from "@/integrations/supabase/client";

/** Appelle l'Edge Function « livekit-token » et remonte le vrai message d'erreur. */
export async function callLivekit<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("livekit-token", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx?.json) msg = (await ctx.json())?.error ?? msg;
    } catch { /* garde le message par défaut */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}