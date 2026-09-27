import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMemberActionLog, ActionLogType } from "@/hooks/useMemberActionLog";
import { describeLogEntry, logEntryIcon, LOG_TYPE_OPTIONS } from "@/lib/actionLogFormat";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Route attendue : /admin/actions/:slug
 * NB : le paramètre "slug" est ici traité comme le user_id du membre (comme
 * dans bdl_action_log.target_id). Si tu ajoutes une vraie colonne `slug` à
 * `bdl_members`, remplace la requête ci-dessous par une résolution
 * `.eq("slug", slug)` -> récupère `user_id` -> utilise-le pour le hook.
 */
export default function MemberActionLogPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<ActionLogType | "all">("all");
  const [memberProfile, setMemberProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const { entries, loading, error } = useMemberActionLog(slug ?? null, filterType);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", slug)
        .maybeSingle();
      setMemberProfile(data as any);
      setProfileLoading(false);
    })();
  }, [slug]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    entries.forEach((e) => {
      const day = new Date(e.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      (map[day] ??= []).push(e);
    });
    return Object.entries(map);
  }, [entries]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        <section className="gradient-institutional text-white py-12">
          <div className="container mx-auto px-4">
            <Button
              variant="outline"
              size="sm"
              className="border-white/40 bg-white text-black hover:bg-white/90 gap-1"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>

            <div className="flex items-center gap-4 mt-4">
              <Avatar className="h-14 w-14 ring-4 ring-white/30 flex-shrink-0">
                <AvatarImage src={memberProfile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-white/20 text-lg font-bold">
                  {getInitials(memberProfile?.full_name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white/70 text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                  <History className="h-3.5 w-3.5" /> Historique des actions
                </p>
                <h1 className="text-2xl font-bold mt-1">
                  {profileLoading ? "…" : memberProfile?.full_name ?? "Membre introuvable"}
                </h1>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">{entries.length} évènement(s)</p>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as ActionLogType | "all")}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card className="shadow-card">
              <CardContent className="py-6 text-sm text-destructive">Erreur : {error}</CardContent>
            </Card>
          )}

          {!loading && !error && entries.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Aucune activité enregistrée pour ce membre.
              </CardContent>
            </Card>
          )}

          {grouped.map(([day, dayEntries]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">{day}</p>
              {dayEntries.map((entry) => (
                <Card key={entry.id} className="shadow-card">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={entry.actor_avatar ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(entry.actor_name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm">
                        <span className="font-semibold">{entry.actor_name}</span> {describeLogEntry(entry)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {logEntryIcon(entry)}
                        {fmtDateTime(entry.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}