import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pin, Pencil, Trash2, Loader2, Megaphone, Lock } from "lucide-react";

interface InternalNote {
  id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

/**
 * Onglet "Notes internes" du panneau admin.
 * Lecture : tout le staff BDL. Écriture (créer/modifier/supprimer/épingler) :
 * réservée à l'Exécutif, vérifié via la fonction RPC `is_executive_staff`.
 * Les notes publiées apparaissent ensuite dans l'Intranet (voir Intranet.tsx).
 */
export const AdminInternalNotes = () => {
  const { user } = useAuth();

  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExecutive, setIsExecutive] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<InternalNote | null>(null);
  const [form, setForm] = useState({ title: "", content: "", is_pinned: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      checkExecutiveAccess();
      loadNotes();
    }
  }, [user]);

  const checkExecutiveAccess = async () => {
    setCheckingAccess(true);
    const { data, error } = await supabase.rpc("is_executive_staff" as any, {
      _user_id: user!.id,
    });
    if (error) {
      console.error("is_executive_staff:", error);
      setIsExecutive(false);
    } else {
      setIsExecutive(!!data);
    }
    setCheckingAccess(false);
  };

  const loadNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bdl_internal_notes" as any)
      .select("id, title, content, author_id, is_pinned, created_at, updated_at")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des notes internes : " + error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as any[];
    const authorIds = Array.from(new Set(rows.map((n) => n.author_id).filter(Boolean)));

    let namesById: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      namesById = Object.fromEntries((profs || []).map((p: any) => [p.id, p.full_name]));
    }

    setNotes(rows.map((n) => ({ ...n, author_name: namesById[n.author_id] ?? "Membre de l'Exécutif" })));
    setLoading(false);
  };

  const openCreate = () => {
    setEditingNote(null);
    setForm({ title: "", content: "", is_pinned: false });
    setShowForm(true);
  };

  const openEdit = (note: InternalNote) => {
    setEditingNote(note);
    setForm({ title: note.title, content: note.content, is_pinned: note.is_pinned });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Titre et contenu requis.");
      return;
    }
    setSaving(true);

    if (editingNote) {
      const { error } = await supabase
        .from("bdl_internal_notes" as any)
        .update({
          title: form.title.trim(),
          content: form.content.trim(),
          is_pinned: form.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingNote.id);

      if (error) toast.error("Erreur : " + error.message);
      else toast.success("Note mise à jour.");
    } else {
      const { error } = await supabase.from("bdl_internal_notes" as any).insert({
        title: form.title.trim(),
        content: form.content.trim(),
        is_pinned: form.is_pinned,
        author_id: user!.id,
      });

      if (error) toast.error("Erreur : " + error.message);
      else toast.success("Annonce publiée à l'Exécutif et au Bureau.");
    }

    setSaving(false);
    setShowForm(false);
    await loadNotes();
  };

  const handleTogglePin = async (note: InternalNote) => {
    const { error } = await supabase
      .from("bdl_internal_notes" as any)
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id);
    if (error) toast.error("Erreur : " + error.message);
    else await loadNotes();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bdl_internal_notes" as any).delete().eq("id", id);
    if (error) toast.error("Erreur suppression");
    else { toast.success("Note supprimée."); await loadNotes(); }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading || checkingAccess) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Notes internes
          </h1>
          <p className="text-muted-foreground text-sm">
            Annonces de l'Exécutif à destination des membres du Bureau, affichées dans l'Intranet.
          </p>
        </div>
        {isExecutive ? (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle annonce
          </Button>
        ) : (
          <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
            <Lock className="h-3 w-3" />
            Lecture seule — réservé à l'Exécutif pour publier
          </Badge>
        )}
      </div>

      {notes.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune note interne pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className={`shadow-card ${note.is_pinned ? "border-primary/40 bg-primary/5" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {note.is_pinned && (
                        <Badge className="gap-1 bg-primary text-primary-foreground">
                          <Pin className="h-3 w-3" /> Épinglée
                        </Badge>
                      )}
                      <CardTitle className="text-base">{note.title}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Par {note.author_name} · {fmtDate(note.created_at)}
                    </p>
                  </div>

                  {isExecutive && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleTogglePin(note)} title={note.is_pinned ? "Désépingler" : "Épingler"}>
                        <Pin className={`h-3.5 w-3.5 ${note.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(note)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              « {note.title} » ne sera plus visible dans l'Intranet.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(note.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">{editingNote ? "Modifier la note" : "Nouvelle annonce"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Nouvelle procédure de remboursement"
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu *</Label>
                <Textarea
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Détail de l'annonce pour les membres du Bureau…"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Épingler en haut</Label>
                  <p className="text-xs text-muted-foreground">Mise en avant dans l'Intranet et cette liste.</p>
                </div>
                <Switch
                  checked={form.is_pinned}
                  onCheckedChange={(v) => setForm({ ...form, is_pinned: v })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : editingNote ? "Mettre à jour" : "Publier l'annonce"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};