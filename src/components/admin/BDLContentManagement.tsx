import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Pencil, Save, X } from "lucide-react";

interface BDLContent {
  id: string;
  section_key: string;
  title: string;
  content: string;
  display_order: number;
}

export const BDLContentManagement = () => {
  const [contents, setContents] = useState<BDLContent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    const { data, error } = await supabase
      .from("bdl_content")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Erreur lors du chargement");
      return;
    }

    setContents(data || []);
  };

  const startEdit = (content: BDLContent) => {
    setEditingId(content.id);
    setEditForm({ title: content.title, content: content.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", content: "" });
  };

  const saveContent = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("bdl_content")
      .update({
        title: editForm.title,
        content: editForm.content,
      })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Contenu mis à jour");
      loadContents();
      cancelEdit();
    }
    setLoading(false);
  };

  const getSectionLabel = (key: string) => {
    const labels: Record<string, string> = {
      hero_subtitle: "Sous-titre Hero",
      mission_title: "Titre de la Mission",
      mission_content: "Contenu de la Mission",
      responsibilities_title: "Titre des Responsabilités",
    };
    return labels[key] || key;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Gestion du Contenu BDL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {contents.map((content) => (
          <Card key={content.id} className="bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">
                  {getSectionLabel(content.section_key)}
                </h3>
                {editingId !== content.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(content)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
              </div>

              {editingId === content.id ? (
                <div className="space-y-4">
                  <div>
                    <Label>Titre</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Contenu</Label>
                    {content.section_key === "mission_content" ? (
                      <RichTextEditor
                        value={editForm.content}
                        onChange={(value) =>
                          setEditForm({ ...editForm, content: value })
                        }
                      />
                    ) : (
                      <Input
                        value={editForm.content}
                        onChange={(e) =>
                          setEditForm({ ...editForm, content: e.target.value })
                        }
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveContent(content.id)}
                      disabled={loading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {content.title}
                  </p>
                  {content.section_key === "mission_content" ? (
                    <div
                      className="prose max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: content.content }}
                    />
                  ) : (
                    <p className="text-sm">{content.content}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
