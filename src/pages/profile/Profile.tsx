import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Trash, Trash2, AlertTriangle, Info, Download, BarChart2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { roleLabel, rolePrecedence, getPrimaryRole } from "@/lib/roles";

interface UserProfile {
  full_name: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  email: string;
  avatar_url: string | null;
  roles: string[];
}

const CLASS_OPTIONS = [
  {
    label: "Seconde",
    values: Array.from({ length: 8 }, (_, i) => `Seconde ${i + 1}`),
  },
  {
    label: "Première",
    values: Array.from({ length: 6 }, (_, i) => `Première ${i + 1}`),
  },
  {
    label: "Terminale",
    values: Array.from({ length: 6 }, (_, i) => `Terminale ${i + 1}`),
  },
];

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    class_name: "",
    email: ""
  });

  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: ""
  });

  const [exportLoading, setExportLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ===================== LOAD PROFILE ===================== */

  useEffect(() => {
    document.title = "Mon Profil – Bureau des Lycéens";
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user) {
      loadProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // loadProfile intentionally omitted: it only reads `user` which is already a dep
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, class_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

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
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        class_name: userData.class_name || "",
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
      const emailChanged = formData.email !== profile?.email;

      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
          options: { emailRedirectTo: `${window.location.origin}/confirm` },
        });
        if (authError) throw authError;
        // Réinitialise le champ email — le changement sera effectif après confirmation
        setFormData(prev => ({ ...prev, email: profile?.email || "" }));
        toast.info(`Email de confirmation envoyé à ${formData.email}. Cliquez le lien pour valider.`);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name.toUpperCase(),
          class_name: formData.class_name,
          ...(emailChanged ? {} : { email: formData.email }),
        })
        .eq("id", user.id);

      if (error) throw error;

      if (!emailChanged) toast.success("Profil mis à jour");
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
      const avatarPath = new URL(profile.avatar_url).pathname.replace(/^\/storage\/v1\/object\/public\/avatars\//, "");

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
    if (passwordData.password.length < 12) {
      toast.error("Le mot de passe doit contenir au moins 12 caractères");
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

  /* ===================== EXPORT RGPD ===================== */

  const handleExportData = async () => {
    if (!user) return;
    setExportLoading(true);
    try {
      const [profileRes, rolesRes, votesRes, deletionRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, class_name, email, avatar_url, created_at").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("scrutin_votes").select("scrutin_id, choice, created_at").eq("user_id", user.id),
        supabase.from("deletion_requests").select("requested_at, scheduled_deletion_at, cancelled_at").eq("user_id", user.id).maybeSingle(),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        roles: rolesRes.data ?? [],
        scrutin_votes: votesRes.data ?? [],
        deletion_request: deletionRes.data ?? null,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-bdl-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Vos données ont été téléchargées.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  /* ===================== DELETE ACCOUNT ===================== */

  const handleDeleteAccount = async () => {
    if (!user || deleteEmail !== profile?.email || !deleteChecked) return;
    setDeleteLoading(true);
    try {
      const scheduledAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("deletion_requests").upsert(
        {
          user_id: user.id,
          requested_at: new Date().toISOString(),
          scheduled_deletion_at: scheduledAt,
          cancelled_at: null,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      toast.success("Demande enregistrée. Votre compte sera supprimé dans 10 jours. Reconnectez-vous pour annuler.");
      setDeleteOpen(false);
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la demande de suppression. Réessayez.");
    } finally {
      setDeleteLoading(false);
    }
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
        <MaintenanceOverlay>
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4 text-center space-y-4">
            <User className="h-20 w-20 mx-auto" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Mon Profil</h1>
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
                    <Label>Prénom</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Nom de famille</Label>
                    <Input
                      value={formData.last_name}
                      className="uppercase"
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value.toUpperCase() })
                      }
                    />
                  </div>

                  <div>
                    <Label>Classe</Label>
                    <Select
                      value={formData.class_name}
                      onValueChange={(value) => setFormData({ ...formData, class_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez votre classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_OPTIONS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.values.map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
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
                      {roleLabel(role)}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              {/* SUIVI DES ACTIONS (membres BDL uniquement) */}
              {profile.roles.some(r => r !== "student") && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5" />
                      Suivi de mes actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Consultez vos actions BDL, vos points et vos présences aux réunions.
                    </p>
                    <button
                      onClick={() => navigate("/bdl-profile")}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
                    >
                      <BarChart2 className="h-4 w-4" />
                      Voir mon suivi
                    </button>
                  </CardContent>
                </Card>
              )}

              {/* MES DONNÉES (RGPD) */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Mes données</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Téléchargez une copie de toutes vos données personnelles (profil, rôles, votes).
                    Conformément au RGPD, vous disposez d'un droit d'accès et de portabilité.
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleExportData}
                    disabled={exportLoading}
                  >
                    <Download className="h-4 w-4" />
                    {exportLoading ? "Préparation…" : "Exporter mes données (JSON)"}
                  </Button>
                </CardContent>
              </Card>

              {/* ZONE DANGEREUSE */}
              <Card className="shadow-card border-destructive/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Zone dangereuse
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    La suppression de votre compte est définitive après un délai de 10 jours.
                    Vous pouvez l'annuler à tout moment en vous reconnectant pendant ce délai.
                  </p>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer mon compte
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

        {/* DIALOG SUPPRESSION */}
        <Dialog
          open={deleteOpen}
          onOpenChange={(o) => {
            setDeleteOpen(o);
            if (!o) { setDeleteEmail(""); setDeleteChecked(false); }
          }}
        >
          <DialogContent className="border-destructive/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Supprimer votre compte
              </DialogTitle>
              <DialogDescription>
                Cette action est définitive passé le délai de rétractation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Ce qui sera supprimé */}
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 space-y-2 text-sm">
                <p className="font-semibold text-destructive">Ce qui sera supprimé :</p>
                <ul className="list-disc pl-4 space-y-1 text-foreground/80">
                  <li>Votre compte et vos informations personnelles</li>
                  <li>Votre historique de votes et sondages</li>
                  <li>Vos inscriptions aux événements</li>
                  <li>Votre photo de profil</li>
                  <li>Tous vos messages et participations</li>
                </ul>
              </div>

              {/* Délai de rétractation */}
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Vous avez <strong>10 jours</strong> pour changer d'avis.
                  Il vous suffit de vous reconnecter avec vos identifiants pour annuler la suppression automatiquement.
                </span>
              </div>

              {/* Checkbox confirmation */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="delete-check"
                  checked={deleteChecked}
                  onCheckedChange={(c) => setDeleteChecked(c as boolean)}
                />
                <Label htmlFor="delete-check" className="text-sm cursor-pointer leading-snug">
                  Je comprends que la suppression définitive de mon compte sera effective
                  dans 10 jours et est irréversible
                </Label>
              </div>

              {/* Email de confirmation */}
              <div className="space-y-1.5">
                <Label htmlFor="delete-email" className="text-sm">
                  Pour confirmer, saisissez votre adresse email :
                </Label>
                <Input
                  id="delete-email"
                  type="email"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  placeholder={profile?.email || ""}
                  disabled={!deleteChecked}
                  className={deleteChecked && deleteEmail && deleteEmail !== profile?.email
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""}
                />
                {deleteChecked && deleteEmail && deleteEmail !== profile?.email && (
                  <p className="text-xs text-destructive">L'adresse ne correspond pas à votre compte</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                disabled={!deleteChecked || deleteEmail !== profile?.email || deleteLoading}
                onClick={handleDeleteAccount}
                className="gap-2"
              >
                {deleteLoading
                  ? "Traitement…"
                  : <><Trash2 className="h-4 w-4" /> Supprimer définitivement</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;