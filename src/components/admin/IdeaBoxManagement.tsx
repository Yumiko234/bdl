import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lightbulb, Clock, CheckCircle2, Archive, User, EyeOff, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useAdminReadOnly } from "@/contexts/AdminReadOnlyContext";

type Status = "pending" | "reviewed" | "archived";
type Filter = "pending" | "all" | "archived";

interface Idea {
  id: string;
  content: string;
  is_anonymous: boolean;
  author_name: string | null;
  classe: string | null;
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export const IdeaBoxManagement = () => {
  const readOnly = useAdminReadOnly();
  const [ideas, setIdeas]     = useState<Idea[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState<string | null>(null);
  const [filter, setFilter]   = useState<Filter>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadIdeas = async () => {
    const { data, error } = await supabase
      .from("boite_a_idees")
      .select("id, content, is_anonymous, author_name, classe, status, reply, created_at")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erreur de chargement"); return; }
    const rows = (data as Idea[]) || [];
    setIdeas(rows);
    const init: Record<string, string> = {};
    rows.forEach((r) => { init[r.id] = r.reply ?? ""; });
    setReplies(init);
  };

  useEffect(() => { loadIdeas(); }, []);

  const handleSave = async (id: string, newStatus: Status) => {
    if (readOnly) return;
    setSaving(id);
    const { error } = await supabase
      .from("boite_a_idees")
      .update({ reply: replies[id] || null, status: newStatus })
      .eq("id", id);
    if (error) { toast.error("Erreur"); } else { toast.success("Sauvegardé"); loadIdeas(); }
    setSaving(null);
  };

  const counts = { pending: 0, reviewed: 0, archived: 0 };
  ideas.forEach((i) => counts[i.status]++);

  const filtered = ideas.filter((i) =>
    filter === "all" ? true : filter === "pending" ? i.status === "pending" : i.status === "archived"
  );

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: "pending",  label: "En attente", count: counts.pending },
    { key: "all",      label: "Toutes",     count: ideas.length },
    { key: "archived", label: "Archivées",  count: counts.archived },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Boîte à idées</h1>
            <p className="text-sm text-muted-foreground">
              {counts.pending} en attente · {counts.reviewed} traitées · {counts.archived} archivées
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                filter === key ? "bg-primary/10 text-primary" : "bg-muted-foreground/20"
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune idée dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((idea) => {
            const isExpanded = expanded === idea.id;
            return (
              <Card key={idea.id} className="overflow-hidden transition-shadow hover:shadow-sm">
                <CardContent className="p-0">
                  {/* En-tête de la carte */}
                  <button
                    className="w-full flex items-start gap-3 p-4 text-left"
                    onClick={() => setExpanded(isExpanded ? null : idea.id)}
                  >
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={idea.status} />
                        <span className="text-xs text-muted-foreground">{formatDate(idea.created_at)}</span>
                        {idea.reply && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            <MessageSquare className="h-3 w-3" /> Répondu
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-2">{idea.content}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {idea.is_anonymous
                          ? <><EyeOff className="h-3 w-3" /><span>Anonyme</span></>
                          : <><User className="h-3 w-3" /><span>{idea.author_name ?? "Inconnu"}{idea.classe ? ` · ${idea.classe}` : ""}</span></>
                        }
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    }
                  </button>

                  {/* Détail déplié */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/20">
                      {/* Contenu complet */}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{idea.content}</p>

                      {!readOnly && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Réponse du BDL
                            </label>
                            <Textarea
                              placeholder="Répondre à cette idée… (optionnel)"
                              value={replies[idea.id] ?? ""}
                              onChange={(e) => setReplies((p) => ({ ...p, [idea.id]: e.target.value }))}
                              rows={3}
                              className="resize-none bg-background"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving === idea.id}
                              onClick={() => handleSave(idea.id, "reviewed")}
                              className="gap-1.5 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Marquer traitée
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving === idea.id}
                              onClick={() => handleSave(idea.id, "pending")}
                              className="gap-1.5"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              En attente
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving === idea.id}
                              onClick={() => handleSave(idea.id, "archived")}
                              className="gap-1.5 text-muted-foreground"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Archiver
                            </Button>
                            <Button
                              size="sm"
                              disabled={saving === idea.id}
                              onClick={() => handleSave(idea.id, idea.status)}
                              className="ml-auto"
                            >
                              {saving === idea.id ? "Sauvegarde…" : "Sauvegarder la réponse"}
                            </Button>
                          </div>
                        </>
                      )}

                      {readOnly && idea.reply && (
                        <div className="flex gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm">{idea.reply}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
