import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("En-tête d'authentification manquant");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client "scopé" à l'appelant : sert uniquement à vérifier son identité.
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      throw new Error("Utilisateur non authentifié");
    }

    // Client admin : seule cette fonction Edge le détient (clé service_role).
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Vérifie que l'appelant a bien le rôle "administrator" en base.
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc(
      "has_role",
      { _user_id: user.id, _role: "administrator" }
    );

    if (roleError) throw roleError;
    if (!isAdmin) {
      return json(
        { error: "Accès refusé : réservé aux administrateurs." },
        403
      );
    }

    const { action, userId, email, password } = await req.json();
    if (!action) throw new Error("Paramètre 'action' manquant");

    switch (action) {
      // ── Statistiques d'un utilisateur (panneau déplié) ──────────────────
      case "get_user_stats": {
        if (!userId) throw new Error("userId manquant");
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(
          userId
        );
        if (error) throw error;

        return json({
          user: {
            last_sign_in_at: data.user.last_sign_in_at,
            created_at: data.user.created_at,
            email_confirmed_at: data.user.email_confirmed_at,
            phone: data.user.phone,
            user_metadata: data.user.user_metadata,
          },
        });
      }

      // ── Modifier l'email d'authentification ─────────────────────────────
      case "update_email": {
        if (!userId || !email) throw new Error("userId ou email manquant");

        const { error: authError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            email,
            email_confirm: true, // évite de renvoyer un mail de confirmation
          });
        if (authError) throw authError;

        // Garde la table profiles synchronisée avec auth.users
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ email })
          .eq("id", userId);
        if (profileError) throw profileError;

        return json({ success: true });
      }

      // ── Changer le mot de passe ──────────────────────────────────────────
      case "update_password": {
        if (!userId || !password) throw new Error("userId ou password manquant");
        if (password.length < 8) {
          throw new Error("Le mot de passe doit contenir au moins 8 caractères");
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password }
        );
        if (error) throw error;

        return json({ success: true });
      }

      // ── Bannir ────────────────────────────────────────────────────────────
      case "ban_user": {
        if (!userId) throw new Error("userId manquant");
        if (userId === user.id) {
          throw new Error("Vous ne pouvez pas vous bannir vous-même.");
        }

        // "876000h" ≈ 100 ans : Supabase n'a pas de "ban permanent" natif,
        // c'est la convention recommandée par leur documentation.
        const { error: authError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: "876000h",
          });
        if (authError) throw authError;

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_banned: true })
          .eq("id", userId);
        if (profileError) throw profileError;

        return json({ success: true });
      }

      // ── Débannir ──────────────────────────────────────────────────────────
      case "unban_user": {
        if (!userId) throw new Error("userId manquant");

        const { error: authError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: "none",
          });
        if (authError) throw authError;

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_banned: false })
          .eq("id", userId);
        if (profileError) throw profileError;

        return json({ success: true });
      }

      default:
        throw new Error(`Action inconnue : ${action}`);
    }
  } catch (err) {
    console.error("admin-users error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});