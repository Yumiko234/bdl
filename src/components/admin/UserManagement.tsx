import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, UserPlus, Shield } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "student"
  });

  // rôle courant déterminé dynamiquement depuis Supabase (fallback = student)
  const [currentUserRole, setCurrentUserRole] = useState<string>("student");

  // hiérarchie : plus la valeur est élevée, plus le rôle est puissant
  const roleHierarchy: Record<string, number> = {
    student: 0,
    bdl_member: 1,
    communication_manager: 2,
    secretary_general: 3,
    vice_president: 4,
    president: 5
  };

  const roleLabel = (role: string) =>
    role === "student" ? "Étudiant"
    : role === "bdl_member" ? "Membre BDL"
    : role === "communication_manager" ? "Responsable Communication"
    : role === "secretary_general" ? "Secrétaire Générale"
    : role === "vice_president" ? "Vice-présidente"
    : "Président";

  // renvoie vrai si l'utilisateur courant peut attribuer targetRole (<= son niveau)
  const canAssignRole = (targetRole: string) => {
    const currentLevel = roleHierarchy[currentUserRole] ?? 0;
    const targetLevel = roleHierarchy[targetRole] ?? 0;
    return targetLevel <= currentLevel;
  };

  useEffect(() => {
    // lancer les deux chargements : utilisateurs et rôle courant
    loadCurrentUserRole();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // récupère le rôle(s) du user courant et choisit le rôle le plus élevé
  const loadCurrentUserRole = async () => {
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // fallback si pas d'user
        setCurrentUserRole("student");
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        setCurrentUserRole("student");
        return;
      }

      const roles: string[] = (rolesData ?? []).map((r: any) => r.role);

      if (roles.length === 0) {
        setCurrentUserRole("student");
        return;
      }

      // déterminer le rôle de plus haut niveau si plusieurs rôles
      const highest = roles.reduce((acc, role) => {
        const accLevel = roleHierarchy[acc] ?? 0;
        const roleLevel = roleHierarchy[role] ?? 0;
        return roleLevel > accLevel ? role : acc;
      }, roles[0]);

      setCurrentUserRole(highest);
    } catch (e) {
      setCurrentUserRole("student");
    }
  };

  const loadUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (profilesError) {
      toast.error("Erreur lors du chargement des utilisateurs");
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      toast.error("Erreur lors du chargement des rôles");
      return;
    }

    const usersWithRoles = (profiles ?? []).map((profile: any) => ({
      ...profile,
      roles: (roles ?? []).filter((r: any) => r.user_id === profile.id).map((r: any) => r.role)
    }));

    setUsers(usersWithRoles);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: newUser.fullName
        }
      }
    });

    if (error) {
      toast.error("Erreur lors de la création: " + error.message);
      setLoading(false);
      return;
    }

    if (data?.user && newUser.role !== "student") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: data.user.id,
          role: newUser.role as any
        });

      if (roleError) {
        toast.error("Utilisateur créé mais erreur lors de l'assignation du rôle");
      }
    }

    toast.success("Utilisateur créé avec succès");
    setNewUser({ email: "", password: "", fullName: "", role: "student" });
    setLoading(false);
    loadUsers();
  };

  // modification du rôle principal d'un utilisateur (sécurité serveur idéale : vérification côté backend également)
  const handleChangeRole = async (userId: string, newRole: string, currentRoles: string[]) => {
    // sécurité client : vérifier qu'on a le droit d'assigner ce rôle
    if (!canAssignRole(newRole)) {
      toast.error("Autorisation insuffisante pour attribuer ce rôle.");
      return;
    }

    // supprimer tous les rôles existants puis insérer le nouveau rôle principal
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      toast.error("Erreur lors de la suppression des anciens rôles");
      return;
    }

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (insertError) {
      toast.error("Erreur lors de l'attribution du rôle");
      return;
    }

    toast.success(`Rôle mis à jour : ${roleLabel(newRole)}`);
    loadUsers();
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestion des Utilisateurs
          <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>
            (Vous : {roleLabel(currentUserRole)})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Création */}
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5" />
            <h3 className="font-semibold">Créer un nouvel utilisateur</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="Nom Prénom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle initial</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Étudiant</SelectItem>
                  <SelectItem value="bdl_member">Membre BDL</SelectItem>
                  <SelectItem value="communication_manager">Responsable Communication</SelectItem>
                  <SelectItem value="secretary_general">Secrétaire Générale</SelectItem>
                  <SelectItem value="vice_president">Vice-présidente</SelectItem>
                  <SelectItem value="president">Président</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCreateUser} disabled={loading}>
            {loading ? "Création..." : "Créer l'utilisateur"}
          </Button>
        </div>

        {/* Liste des utilisateurs */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Liste des utilisateurs
          </h3>

          {users.map((user) => (
            <Card key={user.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      {user.roles.map((r) => (
                        <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="w-56">
                    <Select
                      value={user.roles[0] ?? "student"}
                      onValueChange={(value) =>
                        handleChangeRole(user.id, value, user.roles)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {Object.keys(roleHierarchy)
                          // n'afficher que les rôles qu'on est autorisé à assigner
                          .filter((role) => canAssignRole(role))
                          // trier du plus bas au plus haut (optionnel)
                          .sort((a, b) => roleHierarchy[a] - roleHierarchy[b])
                          .map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabel(role)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
