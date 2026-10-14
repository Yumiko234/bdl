// Edge Function « livekit-token »
// ---------------------------------------------------------------------------
// Délivre les jetons d'accès LiveKit pour la conférence et exécute les actions
// de modération. La clé secrète LiveKit ne quitte JAMAIS ce fichier.
//
// Secrets requis (supabase secrets set ...) :
//   LIVEKIT_URL          ex. wss://bdl-saint-andre-gx5y5hur.livekit.cloud
//   LIVEKIT_API_KEY
//   LIVEKIT_API_SECRET
//
// Rôles (attribut LiveKit « role », posé UNIQUEMENT par ce serveur) :
//   moderator   hôte ou membre de l'exécutif
//   comoderator nommé par un modérateur (membre connecté uniquement)
//   speaker     auditeur à qui on a donné la parole
//   audience    écoute seulement
//
// Actions (corps JSON { action, conferenceId, identity?, guestName? }) :
//   token               → jeton pour rejoindre (invité autorisé si guest_allowed)
//   promote / demote    → donner / retirer la parole      (modérateur, co-mod)
//   mute / mute_all     → couper un micro / tous les micros (modérateur, co-mod)
//   set_comoderator     → nommer un co-modérateur          (modérateur)
//   revoke_comoderator  → retirer le co-modérateur         (modérateur)
//   end                 → terminer pour tout le monde      (modérateur)
// ---------------------------------------------------------------------------
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from "npm:livekit-server-sdk@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Même liste que dans src/pages/Conference.tsx
const EXEC_ROLES = [
  "administrator",
  "president",
  "presidente",
  "vice_president",
  "vice_presidente",
  "secretary_general",
  "secretary_general2",
  "communication_manager",
  "communication_manager2",
];

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lkUrl = Deno.env.get("LIVEKIT_URL");
    const lkKey = Deno.env.get("LIVEKIT_API_KEY");
    const lkSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!lkUrl || !lkKey || !lkSecret) {
      throw new HttpError(500, "LiveKit n'est pas configuré côté serveur.");
    }

    const { action = "token", conferenceId, guestName, identity } =
      await req.json();
    if (!conferenceId || typeof conferenceId !== "string") {
      throw new HttpError(400, "conferenceId manquant");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── Qui appelle ? (utilisateur connecté ou invité) ────────────────────
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabaseUser.auth.getUser();
      userId = data.user?.id ?? null; // clé anonyme seule → invité
    }

    // ── La conférence doit exister et être en cours ───────────────────────
    const { data: conf, error: confError } = await admin
      .from("conferences")
      .select("id, title, status, host_id, guest_allowed")
      .eq("id", conferenceId)
      .maybeSingle();
    if (confError) throw confError;
    if (!conf) throw new HttpError(404, "Conférence introuvable.");
    if (conf.status !== "live") {
      throw new HttpError(410, "Cette conférence est terminée.");
    }

    // ── Rôle de l'appelant (hôte / exécutif) ──────────────────────────────
    let isExec = false;
    let displayName = "Invité";
    if (userId) {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        admin.from("user_roles").select("role").eq("user_id", userId),
        admin.from("profiles").select("full_name").eq("id", userId)
          .maybeSingle(),
      ]);
      isExec = roles?.some((r: { role: string }) =>
        EXEC_ROLES.includes(r.role)
      ) ?? false;
      displayName = profile?.full_name || "Membre";
    } else {
      if (!conf.guest_allowed) {
        throw new HttpError(401, "Connexion requise pour cette conférence.");
      }
      const clean = String(guestName ?? "").trim().slice(0, 40);
      displayName = clean || "Invité";
    }
    const isHost = userId !== null && userId === conf.host_id;
    const isModerator = isHost || isExec;

    const roomService = new RoomServiceClient(
      lkUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:"),
      lkKey,
      lkSecret,
    );

    // ── Outils de modération ──────────────────────────────────────────────
    // L'attribut « role » est posé par ce serveur seulement : le jeton ne
    // donne PAS le droit de modifier ses propres attributs, il est donc fiable.
    const roleOf = async (id: string): Promise<string | undefined> => {
      try {
        const p = await roomService.getParticipant(conf.id, id);
        return p.attributes?.["role"];
      } catch {
        return undefined; // pas (ou plus) dans la salle
      }
    };

    // Un co-modérateur est un membre connecté dont le rôle LiveKit est
    // « comoderator » (son identité LiveKit = son identifiant Supabase).
    const isCoMod = !isModerator && userId !== null
      ? (await roleOf(userId)) === "comoderator"
      : false;
    const canModerate = isModerator || isCoMod;

    const requireModerator = () => {
      if (!isModerator) {
        throw new HttpError(403, "Réservé à l'hôte et à l'exécutif.");
      }
    };
    const requireCanModerate = () => {
      if (!canModerate) throw new HttpError(403, "Réservé aux modérateurs.");
    };
    const requireTarget = (): string => {
      if (!identity || typeof identity !== "string") {
        throw new HttpError(400, "identity manquant");
      }
      return identity;
    };
    const setRole = (
      id: string,
      role: "speaker" | "audience" | "comoderator",
    ) =>
      roomService.updateParticipant(conf.id, id, {
        attributes: { role },
        permission: {
          canSubscribe: true,
          canPublish: role !== "audience",
          canPublishData: true,
        },
      });
    const muteMicrophones = async (id: string): Promise<number> => {
      const p = await roomService.getParticipant(conf.id, id);
      let n = 0;
      for (const t of p.tracks ?? []) {
        if (t.source === TrackSource.MICROPHONE && !t.muted) {
          await roomService.mutePublishedTrack(conf.id, id, t.sid, true);
          n++;
        }
      }
      return n;
    };

    switch (action) {
      // ── Jeton pour rejoindre ───────────────────────────────────────────
      case "token": {
        const id = userId ?? `guest-${crypto.randomUUID().slice(0, 8)}`;
        const role = isModerator ? "moderator" : "audience";

        const at = new AccessToken(lkKey, lkSecret, {
          identity: id,
          name: displayName,
          ttl: "6h",
          attributes: { role },
        });
        at.addGrant({
          room: conf.id,
          roomJoin: true,
          canSubscribe: true,
          canPublishData: true, // chat, réactions, sondages, main levée
          canPublish: isModerator, // les auditeurs écoutent jusqu'à promotion
          roomAdmin: isModerator,
          // canUpdateOwnMetadata volontairement ABSENT : sinon un participant
          // pourrait se donner lui-même le rôle de modérateur.
        });

        return json({
          token: await at.toJwt(),
          url: lkUrl,
          role,
          identity: id,
          name: displayName,
        });
      }

      // ── Donner la parole ───────────────────────────────────────────────
      case "promote": {
        requireCanModerate();
        const target = requireTarget();
        const current = await roleOf(target);
        if (current === "moderator" || current === "comoderator") {
          return json({ success: true }); // déjà habilité
        }
        await setRole(target, "speaker");
        return json({ success: true });
      }

      // ── Retirer la parole ──────────────────────────────────────────────
      case "demote": {
        requireCanModerate();
        const target = requireTarget();
        const current = await roleOf(target);
        if (current === "moderator" || current === "comoderator") {
          throw new HttpError(400, "Impossible de rétrograder un modérateur.");
        }
        await muteMicrophones(target).catch(() => 0);
        await setRole(target, "audience");
        return json({ success: true });
      }

      // ── Couper un micro / tous les micros ──────────────────────────────
      case "mute": {
        requireCanModerate();
        const muted = await muteMicrophones(requireTarget());
        return json({ success: true, muted });
      }

      case "mute_all": {
        requireCanModerate();
        const people = await roomService.listParticipants(conf.id);
        let muted = 0;
        for (const p of people) {
          if (p.identity === userId) continue; // on ne se coupe pas soi-même
          muted += await muteMicrophones(p.identity).catch(() => 0);
        }
        return json({ success: true, muted });
      }

      // ── Co-modérateur (un seul à la fois) ──────────────────────────────
      case "set_comoderator": {
        requireModerator();
        const target = requireTarget();
        if (target.startsWith("guest-")) {
          throw new HttpError(
            400,
            "Un invité ne peut pas être co-modérateur (connexion requise).",
          );
        }
        if ((await roleOf(target)) === "moderator") {
          throw new HttpError(400, "Cette personne est déjà modératrice.");
        }
        const people = await roomService.listParticipants(conf.id);
        for (const p of people) {
          if (p.attributes?.["role"] === "comoderator" && p.identity !== target) {
            await setRole(p.identity, "speaker");
          }
        }
        await setRole(target, "comoderator");
        return json({ success: true });
      }

      case "revoke_comoderator": {
        requireModerator();
        const people = await roomService.listParticipants(conf.id);
        for (const p of people) {
          if (p.attributes?.["role"] === "comoderator") {
            await setRole(p.identity, "speaker");
          }
        }
        return json({ success: true });
      }

      // ── Terminer pour tout le monde ────────────────────────────────────
      case "end": {
        requireModerator();
        await admin
          .from("conferences")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", conf.id);
        try {
          await roomService.deleteRoom(conf.id);
        } catch (e) {
          // La salle peut déjà avoir disparu (personne dedans) : pas bloquant.
          console.warn("deleteRoom:", e);
        }
        return json({ success: true });
      }

      default:
        throw new HttpError(400, `Action inconnue : ${action}`);
    }
  } catch (err) {
    console.error("livekit-token error:", err);
    const status = err instanceof HttpError ? err.status : 400;
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      status,
    );
  }
});