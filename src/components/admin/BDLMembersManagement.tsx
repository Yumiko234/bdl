import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface BDLMember {
  id: string;
  user_id: string;
  is_executive: boolean;
  custom_role: string | null;
  profiles: Profile;
}

export const BDLMembersManagement = () => {
  const [members, setMembers] = useState<BDLMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isExecutive, setIsExecutive] = useState(false);
  const [customRole, setCustomRole] = useState<string>("");

  useEffect(() => {
    loadMembers();
    loadProfiles();
  }, []);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("bdl_members" as any)
      .select("id, user_id, is_executive, custom_role, profiles(id, full_name, email)")
      .order("is_executive", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des membres");
    } else {
      setMembers(data as unknown as BDLMember[]);
    }
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    if (error) {
      toast.error("Erreur lors du chargement des profils");
    } else {
      setProfiles(data || []);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un utilisateur");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("bdl_members" as any)
      .insert({
        user_id: selectedUserId,
        is_executive: isExecutive,
        custom_role: customRole || null,
        added_by: user.id
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Ce membre est déjà dans la liste");
      } else {
        toast.error("Erreur lors de l'ajout du membre");
      }
    } else {
      toast.success("Membre ajouté avec succès");
      setSelectedUserId("");
      setIsExecutive(false);
      setCustomRole("");
      loadMembers();
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce membre ?")) return;

    const { error } = await supabase
      .from("bdl_members" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Membre retiré");
      loadMembers();
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestion de l'Affichage BDL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <h3 className="font-semibold">Ajouter un membre à l'affichage</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Utilisateur</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customRole">Fonction personnalisée (optionnel)</Label>
              <input
                id="customRole"
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Ex : Photographe"
                className="w-full border rounded-md bg-background p-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="executive"
                checked={isExecutive}
                onCheckedChange={setIsExecutive}
              />
              <Label htmlFor="executive">Membre de l'équipe exécutive</Label>
            </div>

            <Button onClick={handleAddMember}>
              Ajouter à l'affichage
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Membres affichés</h3>

          {members.map((member) => (
            <Card key={member.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{member.profiles.full_name}</h4>

                      {member.is_executive && (
                        <Badge variant="default">Exécutif</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {member.custom_role
                        ? `${member.custom_role}`
                        : member.is_executive
                          ? "Membre exécutif"
                          : "Membre"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {member.profiles.email}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </CardContent>
    </Card>
  );
};
