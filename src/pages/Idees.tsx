import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Lightbulb, Send, Clock, CheckCircle2, Archive, ChevronRight } from "lucide-react";

const RATE_LIMIT_MS = 10 * 60 * 1000;
const RATE_KEY = "bdl-idees-last-submit";

type Status = "pending" | "reviewed" | "archived";

interface Idea {
  id: string;
  content: string;
  is_anonymous: boolean;
  status: Status;
  reply: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "En attente", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",  icon: <Clock className="h-3 w-3" /> },
  reviewed: { label: "Traitée",    color: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700",   icon: <CheckCircle2 className="h-3 w-3" /> },
  archived: { label: "Archivée",   color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600",            icon: <Archive className="h-3 w-3" /> },
};

const StatusBadge = ({ status }: { status: Status }) => {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
};

const Req = () => <span className="text-destructive ml-0.5">*</span>;

const Idees = () => {
  useSEO({ title: "Boîte à idées – Bureau des Lycéens" });
  const { user } = useAuth();

  const [prenom, setPrenom]           = useState("");
  const [nom, setNom]                 = useState("");
  const [classe, setClasse]           = useState("");
  const [content, setContent]         = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [myIdeas, setMyIdeas]         = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const nameGiven      = prenom.trim() || nom.trim();
  const classeRequired = !!nameGiven;
  const showNameFields = !user;

  const loadMyIdeas = async () => {
    if (!user) return;
    setLoadingIdeas(true);
    const { data } = await supabase
      .from("boite_a_idees")
      .select("id, content, is_anonymous, status, reply, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    setMyIdeas((data as Idea[]) || []);
    setLoadingIdeas(false);
  };

  useEffect(() => { loadMyIdeas(); }, [user]);

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error("L'idée est obligatoire."); return; }
    if (classeRequired && !classe.trim()) { toast.error("La classe est obligatoire si tu renseignes ton nom."); return; }

    try {
      const last = localStorage.getItem(RATE_KEY);
      if (last && Date.now() - Number(last) < RATE_LIMIT_MS) {
        const remaining = Math.ceil((RATE_LIMIT_MS - (Date.now() - Number(last))) / 60000);
        toast.error(`Attends encore ${remaining} min avant de soumettre une nouvelle idée.`);
        return;
      }
    } catch { /* localStorage indisponible */ }

    setSubmitting(true);

    const effectivelyAnonymous = !user || isAnonymous;
    const authorId = user?.id ?? null;
    let authorName: string | null = null;

    if (!effectivelyAnonymous) {
      const fullName = [prenom.trim(), nom.trim()].filter(Boolean).join(" ");
      if (fullName) {
        authorName = fullName;
      } else if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        authorName = profile?.full_name ?? null;
      }
    }

    const { error } = await supabase.from("boite_a_idees").insert({
      content: content.trim(),
      is_anonymous: effectivelyAnonymous,
      author_id: authorId,
      author_name: authorName,
      classe: showNameFields && classe.trim() ? classe.trim() : null,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi.");
    } else {
      try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch { /* ignore */ }
      toast.success("Idée envoyée ! Merci pour ta contribution.");
      setPrenom(""); setNom(""); setClasse(""); setContent(""); setIsAnonymous(false);
      loadMyIdeas();
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MaintenanceOverlay />
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/8 via-background to-background border-b">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Boîte à idées</h1>
              <p className="text-sm text-muted-foreground">Bureau des Lycéens · Saint-André</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Une suggestion pour améliorer la vie au lycée, un projet à proposer, une idée à partager ?
            L'exécutif BDL la lira et pourra te répondre directement.
          </p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <div className="grid gap-8 lg:grid-cols-5">

          {/* Formulaire — colonne principale */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Soumettre une idée</h2>
              <p className="text-xs text-muted-foreground"><span className="text-destructive">*</span> champ obligatoire</p>
            </div>

            {/* Toggle anonyme — si connecté */}
            {user && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                <Switch id="anon-toggle" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                <div>
                  <Label htmlFor="anon-toggle" className="text-sm font-medium cursor-pointer">Soumettre anonymement</Label>
                  <p className="text-xs text-muted-foreground">Ton nom ne sera pas visible par l'exécutif</p>
                </div>
              </div>
            )}

            {/* Identité */}
            {showNameFields && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom" className="text-sm">Prénom</Label>
                    <Input id="prenom" placeholder="Jean" value={prenom} onChange={e => setPrenom(e.target.value)} maxLength={50} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom" className="text-sm">Nom</Label>
                    <Input id="nom" placeholder="Dupont" value={nom} onChange={e => setNom(e.target.value)} maxLength={50} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classe" className="text-sm">
                    Classe
                    {classeRequired
                      ? <Req />
                      : <span className="text-muted-foreground font-normal text-xs ml-1">— obligatoire si prénom/nom renseigné</span>}
                  </Label>
                  <Input
                    id="classe"
                    placeholder="Ex : Terminale B"
                    value={classe}
                    onChange={e => setClasse(e.target.value)}
                    maxLength={30}
                  />
                </div>
              </div>
            )}

            {/* Idée */}
            <div className="space-y-1.5">
              <Label htmlFor="idea" className="text-sm">Ton idée <Req /></Label>
              <Textarea
                id="idea"
                placeholder="Décris ton idée en détail…"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{content.length} / 2000</p>
            </div>

            <div className="flex items-center justify-between">
              {!user && (
                <p className="text-xs text-muted-foreground">
                  <Link to="/auth" className="text-primary underline underline-offset-2">Connecte-toi</Link> pour suivre tes idées.
                </p>
              )}
              <Button
                className="ml-auto gap-2"
                onClick={handleSubmit}
                disabled={submitting || !content.trim()}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </div>

          {/* Colonne info */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-dashed">
              <CardContent className="pt-5 space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Comment ça marche ?</p>
                <div className="space-y-2">
                  {[
                    "Remplis le formulaire avec ton idée",
                    "L'exécutif BDL la reçoit et l'examine",
                    "Tu reçois une réponse si tu es connecté·e",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs border-t pt-3">
                  Prénom et nom facultatifs. La classe devient obligatoire si tu renseignes un nom.
                  Délai entre deux envois : 10 minutes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mes soumissions */}
        {user && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-4">Mes soumissions</h2>
            {loadingIdeas ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : myIdeas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tu n'as pas encore soumis d'idée.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myIdeas.map((idea) => (
                  <Card key={idea.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-relaxed flex-1">{idea.content}</p>
                        <StatusBadge status={idea.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {idea.is_anonymous && <span className="italic">Envoyée anonymement ·</span>}
                        <span>{new Date(idea.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                      {idea.reply && (
                        <div className="flex gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-primary mb-1">Réponse du BDL</p>
                            <p className="text-sm">{idea.reply}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Idees;
