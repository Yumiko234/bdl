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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    if (profilesError) {
      toast.error("Erreur lors du chargement des utilisateurs");
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast.error("Erreur lors du chargement des rôles");
      return;
    }

    const usersWithRoles = profiles.map(profile => ({
      ...profile,
      roles: roles.filter(r => r.user_id === profile.id).map(r => r.role)
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

    if (data.user && newUser.role !== "student") {
      const { error: roleError } = await supabase
        .from('user_roles')
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

  const handleChangeRole = async (
    userId: string, 
    currentRoles: string[], 
    action: 'add' | 'remove', 
    role: string
  ) => {
    if (action === 'add') {
      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: role as any
        });

      if (error) {
        toast.error("Erreur lors de l'ajout du rôle");
      } else {
        toast.success("Rôle ajouté avec succès");
        loadUsers();
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) {
        toast.error("Erreur lors du retrait du rôle");
      } else {
        toast.success("Rôle retiré avec succès");
        loadUsers();
      }
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestion des Utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Étudiant</SelectItem>
                  <SelectItem value="bdl_member">Membre BDL</SelectItem>
                  <SelectItem value="secretary_general">Secrétaire Générale</SelectItem>
                  <SelectItem value="communication_manager">Responsable Communication</SelectItem>
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
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role === 'student' ? 'Étudiant' : 
                           role === 'bdl_member' ? 'Membre BDL' : 
                           role === 'secretary_general' ? 'Secrétaire Générale' :
                           role === 'communication_manager' ? 'Responsable Communication' :
                           role === 'vice_president' ? 'Vice-présidente' :
                           'Président'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!user.roles.includes('bdl_member') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleChangeRole(user.id, user.roles, 'add', 'bdl_member')}
                      >
                        → Membre BDL
                      </Button>
                    )}
                    {user.roles.includes('bdl_member') && !user.roles.includes('president') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleChangeRole(user.id, user.roles, 'remove', 'bdl_member')}
                      >
                        → Étudiant
                      </Button>
                    )}
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
