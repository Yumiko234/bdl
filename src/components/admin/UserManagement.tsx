import { useEffect, useState } from "react";
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
  roles: string[];        // roles tels qu'en base, ex: ["student"] ou ["president","bdl_member"]
  primaryRole: string;   // rôle principal calculé (ex: "president")
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

  // rôle et classement : plus le chiffre est petit, plus l'autorité est élevée.
  const roleRanks: Record<string, number> = {
    president: 1,
    vice_president: 2,
    secretary_general: 3,
    communication_manager: 4,
    bdl_member: 5,
    student: 6
  };

  const roleLabel = (r: string) =>
    r === "president" ? "Président" :
    r === "vice_president" ? "Vice-président" :
    r === "secretary_general" ? "Secrétaire général" :
    r === "communication_manager" ? "Responsable communication" :
    r === "bdl_member" ? "Membre BDL" :
    "Étudiant";

  // rôle du user courant (calculé dynamiquement). Par défaut "student" si non authentifié.
  const [currentUserPrimaryRole, setCurrentUserPrimaryRole] = useState<string>("student");

  // UTILITAIRE : retourne le rôle principal (celui de plus haute autorité) parmi un tableau de rôles
  const getPrimaryRole = (roles: string[] | undefined): string => {
    if (!roles || roles.length === 0) return "student";
    return roles.reduce((best, r) => {
      return (roleRanks[r] ?? 999) < (roleRanks[best] ?? 999) ? r : best;
    }, roles[0]);
  };

  // UTILITAIRE : peut-on, en tant qu'utilisateur courant, attribuer targetRole ?
  // Règle : autoriser si rank(targetRole) >= rank(currentUserPrimaryRole)
  const canAssignRole = (targetRole: string) => {
    const currentRank = roleRanks[currentUserPrimaryRole] ?? 999;
    const targetRank = roleRanks[targetRole] ?? 999;
    return targetRank >= currentRank;
  };

  // Chargement du rôle du user courant : récupère la session puis les user_roles
  const loadCurrentUserRole = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setCurrentUserPrimaryRole("student");
        return;
      }

      const user = authData.user;
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        setCurrentUserPrimaryRole("student");
        return;
      }

      const roles: string[] = (rolesData ?? []).map((r: any) => r.role);
      const primary = getPrimaryRole(roles);
      setCurrentUserPrimaryRole(primary);
    } catch (e) {
      setCurrentUserPrimaryRole("student");
    }
  };

  // Chargement et fusion des profils + rôles ; calcul du rôle principal ; tri par préséance
  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) {
        toast.error("Erreur lors du chargement des profils");
        return;
      }

      const { data: rolesRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        toast.error("Erreur lors du chargement des rôles");
        return;
      }

      const rolesByUser: Record<string, string[]> = {};
      (rolesRows ?? []).forEach((r: any) => {
        if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
        rolesByUser[r.user_id].push(r.role);
      });

      const assembled: UserProfile[] = (profiles ?? []).map((p: any) => {
        const roles = rolesByUser[p.id] ?? ["student"];
        const primaryRole = getPrimaryRole(roles);
        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          roles,
          primaryRole
        };
      });

      // tri : par rang (1 = Président en haut)
      assembled.sort((a, b) => (roleRanks[a.primaryRole] ?? 999) - (roleRanks[b.primaryRole] ?? 999));

      setUsers(assembled);
    } catch (e) {
      toast.error("Erreur inattendue lors du chargement des utilisateurs");
    }
  };

  useEffect(() => {
    // on charge d'abord le rôle courant puis la liste (pour cohérence d'UI)
    loadCurrentUserRole().then(() => loadUsers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Création d'un nouvel utilisateur (identique à ta logique)
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

    if (data?.user && newUser.role && newUser.role !== "student") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: newUser.role });

      if (roleError) {
        toast.error("Utilisateur créé mais erreur lors de l'assignation du rôle");
      }
    }

    toast.success("Utilisateur créé avec succès");
    setNewUser({ email: "", password: "", fullName: "", role: "student" });
    setLoading(false);
    loadUsers();
  };

  // Modification du rôle principal d'un utilisateur
  const handleChangeRole = async (userId: string, newRole: string) => {
    // double sécurité côté client
    if (!canAssignRole(newRole)) {
      toast.error("Autorisation insuffisante pour attribuer ce rôle.");
      return;
    }

    setLoading(true);

    // suppression des rôles existants (si logique DB différente, adapter)
    const { error: delError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (delError) {
      toast.error("Erreur lors de la suppression des anciens rôles");
      setLoading(false);
      return;
    }

    const { error: insError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (insError) {
      toast.error("Erreur lors de l'attribution du rôle");
      setLoading(false);
      return;
    }

    toast.success(`Rôle attribué : ${roleLabel(newRole)}`);
    setLoading(false);
    // recharger pour refléter les changements et recalculer préséance
    loadUsers();
  };

  // Options de rôles disponibles (triées par préséance)
  const availableRolesOrdered = Object.keys(roleRanks)
    .sort((a, b) => (roleRanks[a] - roleRanks[b]));

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestion des utilisateurs
          <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.85 }}>
            (Vous : {roleLabel(currentUserPrimaryRole)})
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Création d'utilisateur */}
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
                  {availableRolesOrdered.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCreateUser} disabled={loading}>
            {loading ? "Création..." : "Créer l'utilisateur"}
          </Button>
        </div>

        {/* Liste des utilisateurs triée par préséance */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Liste des utilisateurs
          </h3>

          {users.map((u) => (
            <Card key={u.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    <div className="flex gap-2 mt-2">
                      {/* Affiche tous les rôles sous forme de badges */}
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="w-56">
                    <Select
                      value={u.primaryRole ?? "student"}
                      onValueChange={(value) => handleChangeRole(u.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {/* n'afficher que les rôles que l'on a le droit d'attribuer */}
                        {availableRolesOrdered
                          .filter((r) => canAssignRole(r))
                          .map((r) => (
                            <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
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
