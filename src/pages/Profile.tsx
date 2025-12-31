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
import { User, Mail, Shield } from "lucide-react";

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
      // Charger le profil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Charger les rôles
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
      console.error("Erreur chargement profil:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

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

      toast.success("Profil mis à jour avec succès");
      loadProfile();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!profile || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <User className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Mon Profil</h1>
              <p className="text-xl">Gérez vos informations personnelles</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Photo de profil */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Photo de profil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfilePhotoUpload
                    userId={user.id}
                    currentAvatarUrl={profile.avatar_url}
                    fullName={profile.full_name}
                    onPhotoUpdate={(newUrl) => {
                      setProfile({ ...profile, avatar_url: newUrl });
                    }}
                  />
                </CardContent>
              </Card>

              {/* Informations personnelles */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom complet</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </CardContent>
              </Card>

              {/* Rôles */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Mes rôles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                  </div>
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
