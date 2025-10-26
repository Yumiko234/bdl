import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface ContactInfo {
  id: string;
  section_key: string;
  title: string;
  content: string;
  display_order: number;
}

export const ContactManagement = () => {
  const [contactInfos, setContactInfos] = useState<ContactInfo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    section_key: "",
    title: "",
    content: "",
    display_order: 0
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadContactInfos();
  }, []);

  const loadContactInfos = async () => {
    const { data, error } = await supabase
      .from('contact_info')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error("Erreur lors du chargement");
    } else {
      setContactInfos(data || []);
    }
  };

  const handleEdit = (info: ContactInfo) => {
    setEditingId(info.id);
    setFormData({
      section_key: info.section_key,
      title: info.title,
      content: info.content,
      display_order: info.display_order
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      section_key: "",
      title: "",
      content: "",
      display_order: contactInfos.length + 1
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (isCreating) {
      const { error } = await supabase
        .from('contact_info')
        .insert({
          ...formData,
          updated_by: user?.id
        });

      if (error) {
        toast.error("Erreur lors de la création");
      } else {
        toast.success("Information créée avec succès");
        setIsCreating(false);
        loadContactInfos();
      }
    } else if (editingId) {
      const { error } = await supabase
        .from('contact_info')
        .update({
          title: formData.title,
          content: formData.content,
          display_order: formData.display_order,
          updated_by: user?.id
        })
        .eq('id', editingId);

      if (error) {
        toast.error("Erreur lors de la mise à jour");
      } else {
        toast.success("Information mise à jour avec succès");
        setEditingId(null);
        loadContactInfos();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette information ?")) {
      return;
    }

    const { error } = await supabase
      .from('contact_info')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Information supprimée avec succès");
      loadContactInfos();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestion des Informations de Contact</CardTitle>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une section
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isCreating || editingId) && (
          <Card className="bg-muted/30">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold">
                {isCreating ? "Nouvelle information" : "Modifier l'information"}
              </h3>
              
              {isCreating && (
                <div className="space-y-2">
                  <Label htmlFor="section_key">Clé de section *</Label>
                  <Input
                    id="section_key"
                    value={formData.section_key}
                    onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                    placeholder="ex: email, adresse"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Email, Permanences, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  placeholder="Le contenu de cette section..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Ordre d'affichage</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {contactInfos.map((info) => (
            <Card key={info.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{info.title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">
                      {info.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Clé: {info.section_key} | Ordre: {info.display_order}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(info)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(info.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};