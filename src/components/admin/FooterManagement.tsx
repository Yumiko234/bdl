import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";

interface FooterContent {
  id: string;
  section_key: string;
  title: string | null;
  content: string;
  display_order: number;
}

export const FooterManagement = () => {
  const [contents, setContents] = useState<FooterContent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ content: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    const { data, error } = await supabase
      .from("footer_content")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Erreur lors du chargement");
      return;
    }

    setContents(data || []);
  };

  const startEdit = (content: FooterContent) => {
    setEditingId(content.id);
    setEditForm({ content: content.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ content: "" });
  };

  const saveContent = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("footer_content")
      .update({
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
      about: "À propos",
      quote: "Citation",
      contact_address: "Adresse",
      contact_email: "Email de contact",
      copyright: "Copyright",
    };
    return labels[key] || key;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Gestion du Footer</CardTitle>
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
                    <Label>Contenu</Label>
                    <Input
                      value={editForm.content}
                      onChange={(e) =>
                        setEditForm({ content: e.target.value })
                      }
                      placeholder="Utilisez <br /> pour les sauts de ligne"
                    />
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
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: content.content }}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
