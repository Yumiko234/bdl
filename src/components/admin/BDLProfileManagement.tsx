import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCircle, Plus, Trash2, Edit, Eye, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MemberProfile {
  id: string;
  user_id: string;
  full_name: string;
  slug: string;
  photo_url: string | null;
  age: number | null;
  role: string | null;
  class: string | null;
  contact_method: string | null;
  biography: string | null;
  career_path: string | null;
  anecdote: string | null;
  display_order: number;
  is_published: boolean;
}

export const BDLProfileManagement = () => {
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    full_name: "",
    slug: "",
    photo_url: "",
    age: "",
    role: "",
    class: "",
    contact_method: "",
    biography: "",
    career_path: "",
    anecdote: "",
    display_order: 0,
    is_published: false,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("bdl_member_profiles")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Erreur lors du chargement des profils");
    }
  };

  // Générer automatiquement le slug à partir du nom
  const generateSlug = (fullName: string): string => {
    return fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Retire les accents
      .replace(/[^a-z0-9\s-]/g, "") // Retire les caractères spéciaux
      .trim()
      .replace(/\s+/g, "_"); // Remplace les espaces par des underscores
  };

  const handleFullNameChange = (name: string) => {
    setFormData({
      ...formData,
      full_name: name,
      slug: generateSlug(name),
    });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingPhoto(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      if (!file.type.startsWith("image/")) {
        toast.error("Le fichier doit être une image");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5 MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${formData.slug || Date.now()}_${Date.now()}.${fileExt}`;
      const filePath = `bdl-profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setFormData({ ...formData, photo_url: publicUrl });
      toast.success("Photo uploadée avec succès");
    } catch (error: any) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.slug) {
      toast.error("Le nom complet est requis");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const profileData = {
        full_name: formData.full_name,
        slug: formData.slug,
        photo_url: formData.photo_url || null,
        age: formData.age ? parseInt(formData.age) : null,
        role: formData.role || null,
        class: formData.class || null,
        contact_method: formData.contact_method || null,
        biography: formData.biography || null,
        career_path: formData.career_path || null,
        anecdote: formData.anecdote || null,
        display_order: formData.display_order,
        is_published: formData.is_published,
        user_id: user?.id || null,
      };

      if (editingProfile) {
        const { error } = await supabase
          .from("bdl_member_profiles")
          .update(profileData)
          .eq("id", editingProfile);

        if (error) throw error;
        toast.success("Profil mis à jour avec succès");
      } else {
        const { error } = await supabase
          .from("bdl_member_profiles")
          .insert(profileData);

        if (error) throw error;
        toast.success("Profil créé avec succès");
      }

      resetForm();
      loadProfiles();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      if (error.code === "23505") {
        toast.error("Ce slug existe déjà. Veuillez modifier le nom.");
      } else {
        toast.error(error.message || "Erreur lors de l'enregistrement");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: MemberProfile) => {
    setEditingProfile(profile.id);
    setFormData({
      user_id: profile.user_id,
      full_name: profile.full_name,
      slug: profile.slug,
      photo_url: profile.photo_url || "",
      age: profile.age?.toString() || "",
      role: profile.role || "",
      class: profile.class || "",
      contact_method: profile.contact_method || "",
      biography: profile.biography || "",
      career_path: profile.career_path || "",
      anecdote: profile.anecdote || "",
      display_order: profile.display_order,
      is_published: profile.is_published,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bdl_member_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Profil supprimé");
      loadProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      full_name: "",
      slug: "",
      photo_url: "",
      age: "",
      role: "",
      class: "",
      contact_method: "",
      biography: "",
      career_path: "",
      anecdote: "",
      display_order: 0,
      is_published: false,
    });
    setEditingProfile(null);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-6 w-6" />
          Gestion des Profils Détaillés
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Formulaire */}
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="font-semibold">
              {editingProfile ? "Modifier le profil" : "Créer un nouveau profil"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleFullNameChange(e.target.value)}
                placeholder="Prénom Nom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="prenom_nom"
              />
              <p className="text-xs text-muted-foreground">
                URL : /bdl/{formData.slug || "prenom_nom"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Âge</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="18"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Président, Secrétaire général…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Classe</Label>
              <Input
                id="class"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                placeholder="Terminale A"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contact">Moyen de contact</Label>
              <Input
                id="contact"
                value={formData.contact_method}
                onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })}
                placeholder="email@example.com ou @instagram"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photo">Photo de profil</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
                {uploadingPhoto && <span className="text-sm">Upload...</span>}
              </div>
              {formData.photo_url && (
                <img
                  src={formData.photo_url}
                  alt="Preview"
                  className="mt-2 h-32 w-32 object-cover rounded-lg"
                />
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="biography">Biographie</Label>
              <Textarea
                id="biography"
                value={formData.biography}
                onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                rows={4}
                placeholder="Présentation personnelle..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="career">Parcours</Label>
              <Textarea
                id="career"
                value={formData.career_path}
                onChange={(e) => setFormData({ ...formData, career_path: e.target.value })}
                rows={3}
                placeholder="Parcours scolaire, engagements..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="anecdote">Anecdote (optionnel)</Label>
              <Textarea
                id="anecdote"
                value={formData.anecdote}
                onChange={(e) => setFormData({ ...formData, anecdote: e.target.value })}
                rows={2}
                placeholder="Une anecdote amusante..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordre d'affichage</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
              />
              <Label htmlFor="published" className="cursor-pointer">
                Publié (visible sur le site)
              </Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Enregistrement..." : editingProfile ? "Mettre à jour" : "Créer"}
            </Button>
            {editingProfile && (
              <Button variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </div>

        {/* Liste des profils */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Profils existants ({profiles.length})</h3>

          {profiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun profil créé pour le moment
            </p>
          ) : (
            profiles.map((profile) => (
              <Card key={profile.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      {profile.photo_url && (
                        <img
                          src={profile.photo_url}
                          alt={profile.full_name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      )}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{profile.full_name}</h4>
                          {profile.is_published ? (
                            <Badge className="bg-green-600">Publié</Badge>
                          ) : (
                            <Badge variant="secondary">Brouillon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          URL: /bdl/{profile.slug}
                        </p>
                        {profile.role && (
                          <p className="text-sm text-muted-foreground">
                            Rôle: {profile.role}
                          </p>
                        )}
                        {profile.class && (
                          <p className="text-sm text-muted-foreground">
                            Classe: {profile.class}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {profile.is_published && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/bdl/${profile.slug}`, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(profile)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Supprimer le profil de {profile.full_name} ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(profile.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
