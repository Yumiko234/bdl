import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Définition des rôles disponibles
const availableRoles = [
  "president",
  "vice_president",
  "sg",
  "resp_com",
  "bdl",
  "student"
];

// Classification par préséance
const rolePrecedence: Record<string, number> = {
  "president": 1,
  "vice_president": 2,
  "sg": 3,
  "resp_com": 4,
  "bdl": 5,
  "student": 6
};

// Libellés publics
function roleLabel(role: string): string {
  switch (role) {
    case "president": return "Président";
    case "vice_president": return "Vice-président";
    case "sg": return "Secrétaire général";
    case "resp_com": return "Responsable communication";
    case "bdl": return "Membre BDL";
    default: return "Étudiant";
  }
}

// Conversion rôle Étudiant → rôle institutionnel du BDL
function convertRole(roleEtudiant: string): string {
  switch (roleEtudiant) {
    case "Président": return "president";
    case "VP": return "vice_president";
    case "SG": return "sg";
    case "RespCom": return "resp_com";
    case "Membre": return "bdl";
    default: return "student";
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    firstname: "",
    lastname: "",
    role: "student"
  });

  const [currentUserRole, setCurrentUserRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);

  // Vérification si le créateur peut attribuer un rôle donné
  function canAssignRole(targetRole: string): boolean {
    return rolePrecedence[currentUserRole] <= rolePrecedence[targetRole];
  }

  // Chargement du rôle de l'utilisateur connecté
  useEffect(() => {
    async function fetchRole() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .single();

      setCurrentUserRole(data?.role || "student");
    }

    fetchRole();
  }, []);

  // Chargement et tri des utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("users").select("*");
      if (error) return;

      const processed = data.map((u) => ({
        ...u,
        role: convertRole(u.role_etudiant)
      }));

      const sorted = processed.sort(
        (a, b) => rolePrecedence[a.role] - rolePrecedence[b.role]
      );

      setUsers(sorted);
    };

    fetchUsers();
  }, []);

  // Création utilisateur
  const handleCreateUser = async () => {
    setLoading(true);

    if (!canAssignRole(newUser.role)) {
      toast.error("Vous n’êtes pas autorisé à attribuer ce rôle.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: crypto.randomUUID()
    });

    if (error) {
      toast.error("Erreur lors de la création.");
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          firstname: newUser.firstname,
          lastname: newUser.lastname,
          role_etudiant: newUser.role
        });

      if (insertError) {
        toast.error("Erreur dans l’enregistrement des informations.");
      }

      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({
          user_id: data.user.id,
          role: newUser.role
        });

      if (roleErr) {
        toast.error("Utilisateur créé mais rôle non attribué.");
      }

      toast.success("Utilisateur créé.");
    }

    setLoading(false);
  };

  return (
    <div>
      <Navigation />
      <main className="container mx-auto py-10">

        <h1 className="text-3xl font-bold mb-6">Liste des membres</h1>

        <div className="grid grid-cols-2 gap-6">

          {/* Liste des utilisateurs */}
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="border p-4 rounded shadow bg-white">
                <p className="font-semibold">
                  {u.firstname} {u.lastname}
                </p>
                <p className="text-gray-700">{roleLabel(u.role)}</p>
              </div>
            ))}
          </div>

          {/* Création utilisateur */}
          <div className="border p-5 rounded shadow bg-white">
            <h2 className="text-xl font-bold mb-4">Créer un utilisateur</h2>

            <Input
              className="mb-3"
              placeholder="Adresse e-mail"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />

            <Input
              className="mb-3"
              placeholder="Prénom"
              value={newUser.firstname}
              onChange={(e) =>
                setNewUser({ ...newUser, firstname: e.target.value })
              }
            />

            <Input
              className="mb-3"
              placeholder="Nom"
              value={newUser.lastname}
              onChange={(e) =>
                setNewUser({ ...newUser, lastname: e.target.value })
              }
            />

            <Select
              onValueChange={(value) =>
                setNewUser({ ...newUser, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>

              <SelectContent>
                {availableRoles
                  .sort((a, b) => rolePrecedence[a] - rolePrecedence[b])
                  .filter((r) => canAssignRole(r))
                  .map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              className="mt-4 w-full"
              disabled={loading}
              onClick={handleCreateUser}
            >
              Créer
            </Button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
