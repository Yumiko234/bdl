import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Edit, Trash2 } from "lucide-react";
import "@/styles/journal.css"; // ✅ Cohérence institutionnelle

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  content: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

export const OfficialJournalManagement = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    nor_number: "",
    content: "",
    publication_date: ""
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("official_journal" as any)
      .select("*")
      .order("publication_date", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des entrées");
    } else {
      setEntries(data as unknown as JournalEntry[]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.nor_number || !formData.content || !formData.publication_date) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRole = roles?.[0]?.role || "bdl_member";

    if (editingEntry) {
      const { error } = await supabase
        .from("official_journal" as any)
        .update({
          title: formData.title,
          nor_number: formData.nor_number,
          content: formData.content,
          publication_date: formData.publication_date
        })
        .eq("id", editingEntry);

      if (error) {
        toast.error("Erreur lors de la modification");
      } else {
        toast.success("Entrée modifiée avec succès");
        resetForm();
        loadEntries();
      }
    } else {
      const { error } = await supabase
        .from("official_journal" as any)
        .insert({
          title: formData.title,
          nor_number: formData.nor_number,
          content: formData.content,
          publication_date: formData.publication_date,
          author_id: user.id,
          author_name: (profile as any)?.full_name || null,
          author_role: userRole
        });

      if (error) {
        toast.error("Erreur lors de la publication");
      } else {
        toast.success("Entrée publiée avec succès");
        resetForm();
        loadEntries();
      }
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry.id);
    setFormData({
      title: entry.title,
      nor_number: entry.nor_number,
      content: entry.content,
      publication_date: entry.publication_date
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return;

    const { error } = await supabase
      .from("official_journal" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Entrée supprimée");
      loadEntries();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      nor_number: "",
      content: "",
      publication_date: ""
    });
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-muted/20 py-10">
      <Card className="max-w-5xl mx-auto shadow-card">
        <CardHeader className="text-center border-b">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl font-serif">
            <FileText className="h-7 w-7" />
            Journal Officiel — Gestion des Publications
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          <section className="border rounded-xl p-6 bg-white/60 shadow-inner">
            <h3 className="font-semibold text-lg mb-4 text-center font-serif">
              {editingEntry ? "Modification d’une publication" : "Nouvelle publication officielle"}
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Titre de la publication"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nor">Numéro NOR</Label>
                <Input
                  id="nor"
                  value={formData.nor_number}
                  onChange={(e) => setFormData({ ...formData, nor_number: e.target.value })}
                  placeholder="Ex : BDL2025-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date de publication</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.publication_date}
                  onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="content">Contenu officiel</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Texte de la publication officielle..."
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={handleSubmit}>
                {editingEntry ? "Mettre à jour" : "Publier"}
              </Button>
              {editingEntry && (
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-4 font-serif">Publications récentes</h3>

            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Aucune publication n’a encore été enregistrée.
                </p>
              ) : (
                entries.map((entry) => (
                  <Card key={entry.id} className="bg-muted/30 font-serif hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-bold text-lg">{entry.title}</h4>
                          <p className="text-sm text-muted-foreground">NOR : {entry.nor_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.publication_date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
