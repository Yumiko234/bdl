import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Shield, Trash } from "lucide-react";

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: ""
  });

  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: ""
  });

  /* ===================== LOAD PROFILE ===================== */

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user) {
      loadProfile();
    }
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const userData: UserProfile = {
        ...profileData,
        roles: rolesData?.map(r => r.role) || []
      };

      setProfile(userData);
      setFormData({
        full_name: userData.full_name,
        email: userData.email
      });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== SAVE PROFILE ===================== */

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil mis à jour");
      loadProfile();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  /* ===================== DELETE AVATAR ===================== */

  const handleDeleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    try {
      const avatarPath = profile.avatar_url.split(
        "/storage/v1/object/public/avatars/"
      )[1];

      const { error: storageError } = await supabase.storage
        .from("avatars")
        .remove([avatarPath]);

      if (storageError) throw storageError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setProfile({ ...profile, avatar_url: null });
      toast.success("Photo de profil supprimée");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression de la photo");
    }
  };

  /* ===================== CHANGE PASSWORD ===================== */

  const handlePasswordChange = async () => {
    if (passwordData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.password
      });

      if (error) throw error;

      toast.success("Mot de passe modifié avec succès");
      setPasswordData({ password: "", confirmPassword: "" });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du changement de mot de passe");
    }
  };

  /* ===================== ROLES LABEL ===================== */

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      president: "Président",
      vice_president: "Vice-Présidente",
      secretary_general: "Secrétaire Générale",
      communication_manager: "Directeur de la Communication",
      bdl_member: "Membre BDL",
      student: "Étudiant"
    };
    return labels[role] || role;
  };

  /* ===================== RENDER ===================== */

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!profile || !user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4 text-center space-y-4">
            <User className="h-20 w-20 mx-auto" />
            <h1 className="text-5xl font-bold">Mon Profil</h1>
            <p className="text-xl">Gérez vos informations personnelles</p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto space-y-6">

              {/* PHOTO */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Photo de profil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProfilePhotoUpload
                    userId={user.id}
                    currentAvatarUrl={profile.avatar_url}
                    fullName={profile.full_name}
                    onPhotoUpdate={(url) =>
                      setProfile({ ...profile, avatar_url: url })
                    }
                  />

                  {profile.avatar_url && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAvatar}
                      className="flex gap-2"
                    >
                      <Trash className="h-4 w-4" />
                      Supprimer la photo
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* INFOS */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nom complet</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </CardContent>
              </Card>

              {/* SÉCURITÉ */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Sécurité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nouveau mot de passe</Label>
                    <Input
                      type="password"
                      value={passwordData.password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          password: e.target.value
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Confirmer le mot de passe</Label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })
                      }
                    />
                  </div>

                  <Button onClick={handlePasswordChange}>
                    Modifier le mot de passe
                  </Button>
                </CardContent>
              </Card>

              {/* RÔLES */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Mes rôles</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {profile.roles.map(role => (
                    <Badge key={role} variant="secondary">
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
