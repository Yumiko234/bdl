import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield,
  Ban,
  Mail,
  Lock,
  Search,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  is_banned?: boolean;
}

export const AdminManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [banDialog, setBanDialog] = useState<{ open: boolean; user: UserProfile | null }>({
    open: false,
    user: null,
  });
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; user: UserProfile | null }>({
    open: false,
    user: null,
  });
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({ open: false, user: null });

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (profilesError) {
      toast.error("Erreur lors du chargement");
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const usersWithRoles = (profiles || []).map((profile) => ({
      ...profile,
      roles: (roles || [])
        .filter((r) => r.user_id === profile.id)
        .map((r) => r.role),
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Ban / Unban
  const handleBan = async (user: UserProfile, unban = false) => {
    setLoading(true);
    // Using Supabase Admin API via edge function or direct RPC
    // Since we don't have edge functions here, we'll use a profile flag
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !unban } as any)
      .eq("id", user.id);

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success(unban ? `${user.full_name} a été débanni` : `${user.full_name} a été banni`);
      setBanDialog({ open: false, user: null });
      loadUsers();
    }
    setLoading(false);
  };

  // Change email - updates profile table (auth email requires server-side)
  const handleChangeEmail = async () => {
    if (!emailDialog.user) return;
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", emailDialog.user.id);

    if (error) {
      toast.error("Erreur lors de la modification: " + error.message);
    } else {
      toast.success("Email mis à jour dans le profil");
      toast.info("Note: L'email d'authentification doit être modifié côté Supabase Dashboard pour l'authentification");
      setEmailDialog({ open: false, user: null });
      setNewEmail("");
      loadUsers();
    }
    setLoading(false);
  };

  // Change password - requires Supabase Admin SDK, we'll show instructions
  const handleChangePassword = async () => {
    if (!passwordDialog.user) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    // This requires the Supabase admin key (not available client-side for security)
    // We'll use the signUp workaround or inform the admin
    toast.info(
      "Pour modifier le mot de passe d'un utilisateur, utilisez le Dashboard Supabase > Authentication > Users"
    );
    toast.info(
      "Alternativement, l'utilisateur peut utiliser la fonctionnalité 'Mot de passe oublié'"
    );
    setPasswordDialog({ open: false, user: null });
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      student: "Étudiant",
      bdl_member: "Membre BDL",
      vie_scolaire: "Vie Scolaire",
      secretary_general: "Secrétaire Gén.",
      communication_manager: "Directeur ComCom",
      vice_president: "Vice-Présidente",
      president: "Président",
      administrator: "Administrateur",
    };
    return labels[role] || role;
  };

  const isBanned = (user: UserProfile) => (user as any).is_banned === true;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-destructive" />
          Gestion Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">Zone sensible</p>
            <p className="text-muted-foreground">
              Ces actions affectent directement les comptes utilisateurs. Agissez avec prudence.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* User list */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Aucun utilisateur trouvé</p>
          ) : (
            filteredUsers.map((user) => (
              <Card
                key={user.id}
                className={`${isBanned(user) ? "bg-destructive/5 border-destructive/20" : "bg-muted/30"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{user.full_name}</span>
                        {isBanned(user) && (
                          <Badge variant="destructive" className="text-xs">
                            Banni
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="flex gap-1 flex-wrap mt-2">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline" className="text-xs">
                            Étudiant
                          </Badge>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {getRoleLabel(role)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {/* Email */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => {
                          setEmailDialog({ open: true, user });
                          setNewEmail(user.email);
                        }}
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </Button>

                      {/* Password */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => {
                          setPasswordDialog({ open: true, user });
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        <Lock className="h-3 w-3" />
                        Mot de passe
                      </Button>

                      {/* Ban/Unban */}
                      <Button
                        size="sm"
                        variant={isBanned(user) ? "default" : "destructive"}
                        className="text-xs gap-1"
                        onClick={() => {
                          if (isBanned(user)) {
                            handleBan(user, true);
                          } else {
                            setBanDialog({ open: true, user });
                          }
                        }}
                      >
                        {isBanned(user) ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Débannir
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3" />
                            Bannir
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>

      {/* Ban Confirmation Dialog */}
      <Dialog open={banDialog.open} onOpenChange={(o) => setBanDialog({ open: o, user: banDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Bannir l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir bannir{" "}
              <strong>{banDialog.user?.full_name}</strong> ({banDialog.user?.email}) ?
              <br />
              <br />
              L'utilisateur ne pourra plus se connecter. Cette action est réversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setBanDialog({ open: false, user: null })}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => banDialog.user && handleBan(banDialog.user)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Confirmer le bannissement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog
        open={emailDialog.open}
        onOpenChange={(o) => setEmailDialog({ open: o, user: emailDialog.user })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Modifier l'email
            </DialogTitle>
            <DialogDescription>
              Modifier l'email de <strong>{emailDialog.user?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nouvel email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouvel@email.fr"
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded p-2">
              Note : Cette modification met à jour l'email dans le profil. Pour modifier l'email
              d'authentification, utilisez le Dashboard Supabase.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailDialog({ open: false, user: null })}>
                Annuler
              </Button>
              <Button disabled={loading} onClick={handleChangeEmail}>
                Modifier l'email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialog.open}
        onOpenChange={(o) => setPasswordDialog({ open: o, user: passwordDialog.user })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Modifier le mot de passe
            </DialogTitle>
            <DialogDescription>
              Modifier le mot de passe de <strong>{passwordDialog.user?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setPasswordDialog({ open: false, user: null })}
              >
                Annuler
              </Button>
              <Button disabled={loading} onClick={handleChangePassword}>
                Modifier le mot de passe
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};