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

/**
 * Règle importante :
 * - Assure-toi que ta table des rôles s'appelle bien "user_roles" avec colonnes { user_id, role }
 * - Assure-toi que la table des profils s'appelle "profiles" avec colonnes { id, full_name, email }
 * - Les valeurs stockées dans user_roles.role doivent être exactement les clefs ci-dessous.
 */

/* ---------- Configuration des rôles et labels ---------- */
const ROLE_KEYS = [
  "president",
  "vice_president",
  "secretary_general",
  "communication_manager",
  "bdl_member",
  "student"
] as const;
type RoleKey = typeof ROLE_KEYS[number];

const rolePrecedence: Record<RoleKey, number> = {
  president: 1,
  vice_president: 2,
  secretary_general: 3,
  communication_manager: 4,
  bdl_member: 5,
  student: 6
};

const roleLabel = (r: RoleKey | string) =>
  r === "president" ? "Président" :
  r === "vice_president" ? "Vice-président" :
  r === "secretary_general" ? "Secrétaire général" :
  r === "communication_manager" ? "Responsable communication" :
  r === "bdl_member" ? "Membre BDL" :
  "Étudiant";

/* ---------- Types ---------- */
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roles: string[];       // rôles tels qu'en base (peuvent être multiples)
  primaryRole: RoleKey;  // rôle principal calculé (un des RoleKey)
}

/* ---------- Composant principal ---------- */
export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "student" as RoleKey
  });

  // rôle principal du user courant
  const [currentUserPrimaryRole, setCurrentUserPrimaryRole] = useState<RoleKey>("student");

  /* ---------- Utilitaires ---------- */
  const getPrimaryRole = (roles: string[] | undefined): RoleKey => {
    if (!roles || roles.length === 0) return "student";
    // garder le rôle avec le plus petit rôlePrecedence (1 = top)
    return roles.reduce((best: string, r: string) => {
      const rKey = ROLE_KEYS.includes(r as RoleKey) ? (r as RoleKey) : "student";
      const bestKey = ROLE_KEYS.includes(best as RoleKey) ? (best as RoleKey) : "student";
      return (rolePrecedence[rKey] ?? 999) < (rolePrecedence[bestKey] ?? 999) ? rKey : bestKey;
    }, roles[0]) as RoleKey;
  };

  // Peut-on, en tant que currentUserPrimaryRole, attribuer targetRole ?
  // Règle : autoriser si rank(targetRole) >= rank(currentUserPrimaryRole)
  const canAssignRole = (targetRole: string) => {
    const curRank = rolePrecedence[currentUserPrimaryRole] ?? 999;
    const targetRank = rolePrecedence[(ROLE_KEYS.includes(targetRole as RoleKey) ? targetRole : "student") as RoleKey] ?? 999;
    return targetRank >= curRank;
  };

  /* ---------- Chargement du rôle courant ---------- */
  const loadCurrentUserRole = async () => {
    try {
      // supabase.auth.getUser() retourne { data: { user }, error }
      const res = await supabase.auth.getUser();
      const user = (res as any)?.data?.user ?? null;

      if (!user) {
        setCurrentUserPrimaryRole("student");
        return;
      }

      // récupérer tous les rôles du user (ne PAS utiliser single())
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        console.debug("Erreur lecture user_roles:", rolesError);
        setCurrentUserPrimaryRole("student");
        return;
      }

      const roles: string[] = (rolesData ?? []).map((r: any) => r.role);
      const primary = getPrimaryRole(roles);
      setCurrentUserPrimaryRole(primary);
      console.debug("current user roles", roles, "primary:", primary);
    } catch (err) {
      console.debug("loadCurrentUserRole error", err);
      setCurrentUserPrimaryRole("student");
    }
  };

  /* ---------- Chargement et tri des utilisateurs ---------- */
  const loadUsers = async () => {
    try {
      // lire les profils
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) {
        toast.error("Erreur lors du chargement des profils");
        return;
      }

      // lire tous les rôles
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

      // tri par préséance (1 en haut)
      assembled.sort((a, b) => (rolePrecedence[a.primaryRole] ?? 999) - (rolePrecedence[b.primaryRole] ?? 999));
      setUsers(assembled);
    } catch (err) {
      console.debug("loadUsers error", err);
      toast.error("Erreur inattendue lors du chargement des utilisateurs");
    }
  };

  useEffect(() => {
    // charger rôle courant puis utilisateurs
    loadCurrentUserRole().then(() => loadUsers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Création d'utilisateur (sécurisée) ---------- */
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.fullName) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    // sécurité : on ne peut pas créer un utilisateur avec un rôle supérieur
    if (!canAssignRole(newUser.role)) {
      toast.error("Vous n'êtes pas autorisé à attribuer ce rôle");
      return;
    }

    setLoading(true);
    try {
      // inscrire via Supabase Auth — on passe full_name en metadata si souhaité
      const { data: signData, error: signError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password || Math.random().toString(36).slice(2, 10),
        options: {
          data: { full_name: newUser.fullName }
        }
      } as any); // cast selon version du client

      if (signError) {
        console.debug("signUp error", signError);
        toast.error("Erreur lors de la création du compte : " + (signError.message ?? "Erreur"));
        setLoading(false);
        return;
      }

      const createdUserId = (signData as any)?.user?.id ?? (signData as any)?.user?.id ?? null;
      if (!createdUserId) {
        toast.error("Impossible de récupérer l'identifiant du nouvel utilisateur");
        setLoading(false);
        return;
      }

      // Insérer le profil dans la table profiles (id = auth.user.id)
      const { error: profErr } = await supabase
        .from("profiles")
        .insert([{ id: createdUserId, full_name: newUser.fullName, email: newUser.email }]);

      if (profErr) {
        console.debug("profiles insert error", profErr);
        // ne pas aborter — continuer à assigner rôle si possible
      }

      // assigner le rôle demandé
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert([{ user_id: createdUserId, role: newUser.role }]);

      if (roleErr) {
        console.debug("user_roles insert error", roleErr);
        toast.error("Utilisateur créé mais échec lors de l'attribution du rôle");
        setLoading(false);
        loadUsers();
        return;
      }

      toast.success("Utilisateur créé avec succès");
      setNewUser({ email: "", password: "", fullName: "", role: "student" });
      await loadUsers();
    } catch (err) {
      console.debug("handleCreateUser error", err);
      toast.error("Erreur inattendue lors de la création");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Modification du rôle principal d'un utilisateur ---------- */
  const handleChangeRole = async (userId: string, newRole: RoleKey) => {
    // garde-fou client
    if (!canAssignRole(newRole)) {
      toast.error("Autorisation insuffisante pour attribuer ce rôle.");
      return;
    }

    setLoading(true);
    try {
      // supprimer les rôles existants puis insérer le nouveau
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (delErr) {
        console.debug("delete user_roles error", delErr);
        toast.error("Erreur lors de la suppression des anciens rôles");
        setLoading(false);
        return;
      }

      const { error: insErr } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole }]);

      if (insErr) {
        console.debug("insert user_roles error", insErr);
        toast.error("Erreur lors de l'attribution du rôle");
        setLoading(false);
        return;
      }

      toast.success(`Rôle attribué : ${roleLabel(newRole)}`);
      await loadUsers();
    } catch (err) {
      console.debug("handleChangeRole error", err);
      toast.error("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Options de rôles filtrées pour affichage (ordre de préséance) ---------- */
  const availableRolesOrdered = [...ROLE_KEYS].sort((a, b) => rolePrecedence[a] - rolePrecedence[b]);

  /* ---------- Rendu ---------- */
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
              <Label htmlFor="password">Mot de passe (optionnel)</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Laisser vide pour mot de passe aléatoire"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle initial</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as RoleKey })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRolesOrdered
                    .filter((r) => canAssignRole(r))
                    .map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
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
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="w-56">
                    <Select
                      value={u.primaryRole ?? "student"}
                      onValueChange={(value) => handleChangeRole(u.id, value as RoleKey)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
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

export default UserManagement;
