import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Upload, Trash2, Download } from "lucide-react";

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string | null;
  file_size: string | null;
  visibility: string;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  reglement: "Règlements",
  "compte-rendu": "Comptes-rendus",
  formulaire: "Formulaires",
  autre: "Autres",
  jobdl: "JoBDL",
};

export const DocumentManagement = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "reglement",
    file_url: "",
    file_size: "",
    visibility: "public" as "public" | "authenticated" | "bdl_only",
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des documents");
    } else {
      setDocuments(data || []);
    }
  };

  // Upload direct du fichier vers Supabase Storage
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const filePath = `${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (error) {
      toast.error("Erreur lors de l'upload du fichier");
      setUploading(false);
      return null;
    }

    const { publicUrl, error: urlError } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    if (urlError) {
      toast.error("Erreur lors de la récupération du lien du fichier");
      setUploading(false);
      return null;
    }

    setUploading(false);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.file_url) {
      toast.error("Veuillez remplir tous les champs et uploader un fichier");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);

    const { error } = await supabase
      .from("documents")
      .insert({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        file_url: formData.file_url,
        file_size: formData.file_size || null,
        visibility: formData.visibility,
        uploaded_by: user.id,
      });

    if (error) {
      toast.error("Erreur lors de l'ajout du document");
    } else {
      toast.success("Document ajouté avec succès");
      setFormData({
        title: "",
        description: "",
        category: "reglement",
        file_url: "",
        file_size: "",
        visibility: "public",
      });
      loadDocuments();
    }

    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Document supprimé");
      loadDocuments();
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Gestion des Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <h3 className="font-semibold">Ajouter un document</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Titre</Label>
              <Input
                id="doc-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre du document"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-description">Description</Label>
              <Textarea
                id="doc-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Description du document..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">Fichier</Label>
              <Input
                id="doc-file"
                type="file"
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    const url = await handleFileUpload(file);
                    if (url) {
                      setFormData({
                        ...formData,
                        file_url: url,
                        file_size: `${(file.size / 1024).toFixed(2)} KB`,
                      });
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Le fichier sera stocké directement sur le site et disponible au téléchargement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doc-category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="doc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-visibility">Visibilité</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: any) => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger id="doc-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (tous)</SelectItem>
                    <SelectItem value="authenticated">Utilisateurs connectés</SelectItem>
                    <SelectItem value="bdl_only">Membres BDL uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Ajout en cours..." : "Ajouter le document"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Documents publiés</h3>

          {documents.map((doc) => (
            <Card key={doc.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{doc.title}</h4>
                      <Badge variant="secondary">
                        {doc.visibility === 'public' ? 'Public' :
                         doc.visibility === 'authenticated' ? 'Connectés' : 'BDL'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Catégorie: {categoryLabels[doc.category] || doc.category}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {doc.file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url!, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(doc.id)}
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
