import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

interface EstablishmentSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  display_order: number;
}

export const EstablishmentManagement = () => {
  const [sections, setSections] = useState<EstablishmentSection[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    section_key: "",
    display_order: 0,
  });

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from('establishment_info')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections((data as any) || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      toast.error("Erreur lors du chargement des sections");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      if (editingSection) {
        const { error } = await supabase
          .from('establishment_info')
          .update({
            title: formData.title,
            content: formData.content,
            display_order: formData.display_order,
            updated_by: user.id,
          })
          .eq('id', editingSection);

        if (error) throw error;
        toast.success("Section mise à jour avec succès");
      } else {
        const { error } = await supabase
          .from('establishment_info')
          .insert({
            section_key: formData.section_key,
            title: formData.title,
            content: formData.content,
            display_order: formData.display_order,
            updated_by: user.id,
          });

        if (error) throw error;
        toast.success("Section créée avec succès");
      }

      resetForm();
      loadSections();
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (section: EstablishmentSection) => {
    setEditingSection(section.id);
    setFormData({
      title: section.title,
      content: section.content,
      section_key: section.section_key,
      display_order: section.display_order,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette section ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('establishment_info')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Section supprimée avec succès");
      loadSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      section_key: "",
      display_order: 0,
    });
    setEditingSection(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingSection ? "Modifier une section" : "Ajouter une section"}
          </CardTitle>
          <CardDescription>
            Gérez les informations affichées sur la page Établissement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingSection && (
              <div className="space-y-2">
                <Label htmlFor="section_key">Clé de section (unique)</Label>
                <Input
                  id="section_key"
                  value={formData.section_key}
                  onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                  placeholder="ex: history, values..."
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de la section"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordre d'affichage</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                placeholder="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Contenu de la section..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingSection ? "Mettre à jour" : "Créer"}
              </Button>
              {editingSection && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sections existantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>Ordre: {section.display_order}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(section)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
