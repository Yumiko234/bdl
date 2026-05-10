import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Radio, Crown, Clock, Users, Trash2, StopCircle,
  RefreshCw, Calendar, CheckCircle2, XCircle, Loader2,
  BarChart3, MessageSquare
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBConference {
  id: string;
  title: string;
  status: "live" | "ended";
  host_id: string;
  host_name: string;
  created_at: string;
  ended_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function duration(start: string, end: string | null): string {
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  const mins = Math.floor((to - from) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ""}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "live" | "ended" }) {
  if (status === "live")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        En direct
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5">
      <CheckCircle2 className="h-3 w-3" />
      Terminée
    </Badge>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg gradient-institutional flex items-center justify-center text-white flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const AdminConference = () => {
  const [conferences, setConferences] = useState<DBConference[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create-from-admin form
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  // Filters
  const [filter, setFilter] = useState<"all" | "live" | "ended">("all");

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        setCurrentUser({ id: user.id, name: (profile as any)?.full_name ?? "Admin" });
      }
    })();
    fetchConferences();
  }, []);

  const fetchConferences = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);

    const { data, error } = await supabase
      .from("conferences" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (!quiet) toast.error("Erreur chargement : " + error.message);
    } else {
      setConferences((data as DBConference[]) ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────────

  const createConference = async () => {
    if (!newTitle.trim() || !currentUser) return;
    setCreating(true);
    const id = crypto.randomUUID();

    const { error } = await supabase.from("conferences" as any).insert({
      id,
      title: newTitle.trim(),
      status: "live",
      host_id: currentUser.id,
      host_name: currentUser.name,
    });

    if (error) {
      toast.error("Erreur création : " + error.message);
    } else {
      toast.success("Conférence créée !");
      setNewTitle("");
      fetchConferences(true);
    }
    setCreating(false);
  };

  const endConference = async (id: string) => {
    const { error } = await supabase
      .from("conferences" as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Conférence terminée.");
      fetchConferences(true);
    }
  };

  const deleteConference = async (id: string) => {
    if (!confirm("Supprimer définitivement cette conférence ?")) return;
    const { error } = await supabase
      .from("conferences" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur suppression : " + error.message);
    } else {
      toast.success("Conférence supprimée.");
      fetchConferences(true);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const total = conferences.length;
  const live = conferences.filter((c) => c.status === "live").length;
  const ended = conferences.filter((c) => c.status === "ended").length;

  const avgDuration = () => {
    const finished = conferences.filter((c) => c.status === "ended" && c.ended_at);
    if (finished.length === 0) return "—";
    const totalMins = finished.reduce((acc, c) => {
      return acc + Math.floor((new Date(c.ended_at!).getTime() - new Date(c.created_at).getTime()) / 60000);
    }, 0);
    const avg = Math.round(totalMins / finished.length);
    return avg < 60 ? `${avg} min` : `${Math.floor(avg / 60)}h${avg % 60 > 0 ? ` ${avg % 60}min` : ""}`;
  };

  const filtered = conferences.filter((c) => filter === "all" || c.status === filter);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total conférences" value={total} icon={<Radio className="h-5 w-5" />} />
        <StatCard label="En direct" value={live} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Terminées" value={ended} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Durée moyenne" value={avgDuration()} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      {/* ── Create from admin ──────────────────────────────────────────────────── */}
      <Card className="shadow-card border-2 border-primary/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-5 w-5 text-amber-500" />
            Créer une conférence (Admin)
          </CardTitle>
          <CardDescription>
            Lance une nouvelle conférence directement depuis le panneau d'administration.
            Elle sera visible immédiatement sur la page <code className="text-xs bg-muted px-1 rounded">/conference</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Thème / titre de la conférence…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createConference()}
              className="flex-1"
            />
            <Button onClick={createConference} disabled={creating || !newTitle.trim()}>
              {creating
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Radio className="h-4 w-4 mr-2" />}
              Lancer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Conference list ────────────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-5 w-5" />
              Historique des conférences
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Filter tabs */}
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(["all", "live", "ended"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f === "all" ? "Toutes" : f === "live" ? "En direct" : "Terminées"}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchConferences(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Radio className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">Aucune conférence trouvée.</p>
              {filter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
                  Voir toutes les conférences
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((conf) => (
                <Card key={conf.id} className={`bg-muted/30 ${conf.status === "live" ? "border-green-200" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4 flex-wrap">

                      {/* Left: info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={conf.status} />
                          <h3 className="font-bold text-base truncate">{conf.title}</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                            {conf.host_name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {fmtDate(conf.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Durée : {duration(conf.created_at, conf.ended_at)}
                          </span>
                          {conf.ended_at && (
                            <span className="flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5" />
                              Terminée le {fmtDate(conf.ended_at)}
                            </span>
                          )}
                        </div>

                        {/* ID (petit, pour debug / copie) */}
                        <p className="text-xs text-muted-foreground/60 font-mono truncate">ID : {conf.id}</p>
                      </div>

                      {/* Right: actions */}
                      <div className="flex gap-2 flex-shrink-0 flex-wrap">
                        {conf.status === "live" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-200 text-orange-600 hover:bg-orange-50"
                            onClick={() => endConference(conf.id)}
                          >
                            <StopCircle className="h-4 w-4 mr-1.5" />
                            Terminer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteConference(conf.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SQL reminder ──────────────────────────────────────────────────────── */}
      <Card className="bg-amber-50/60 border-amber-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Radio className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-2">
            <p className="font-semibold">Table Supabase requise</p>
            <p>Si la table <code className="bg-amber-100 px-1 rounded font-mono text-xs">conferences</code> n'existe pas encore, exécutez ce SQL dans votre éditeur Supabase :</p>
            <pre className="bg-white border border-amber-200 rounded-lg p-3 text-xs font-mono overflow-auto whitespace-pre-wrap text-slate-700">
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};