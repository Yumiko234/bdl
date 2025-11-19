import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

export default function BDLMembersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [executif, setExecutif] = useState<boolean>(false);
  const [customRole, setCustomRole] = useState<string>("");

  useEffect(() => {
    fetchUsers();
    fetchMembers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (!error) setUsers(data);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("bdl_members")
      .select("*, users(*), user_roles(role)")
      .order("created_at", { ascending: true });

    if (!error) setMembers(data);
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un utilisateur.");
      return;
    }

    const { error } = await supabase.from("bdl_members").insert({
      user_id: selectedUserId,
      is_executif: executif
    });

    if (error) {
      toast.error("Erreur lors de l’ajout du membre.");
      return;
    }

    if (customRole.trim() !== "") {
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: selectedUserId,
        role: `custom:${customRole.trim()}`
      });

      if (roleError) {
        toast.error(
          "Le membre a été ajouté, mais la fonction personnalisée n’a pas pu être enregistrée."
        );
      }
    }

    setExecutif(false);
    setSelectedUserId(null);
    setCustomRole("");

    toast.success("Membre ajouté avec succès.");
    fetchMembers();
  };

  const handleRemoveMember = async (id: string, userId: string) => {
    const { error } = await supabase.from("bdl_members").delete().eq("id", id);

    if (!error) {
      await supabase.from("user_roles").delete().eq("user_id", userId).like("role", "custom:%");
      fetchMembers();
      toast.success("Membre retiré.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des membres du BDL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Ajouter un membre</Label>
          <select
            className="border rounded p-2 w-full"
            value={selectedUserId || ""}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Sélectionner un utilisateur</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch checked={executif} onCheckedChange={setExecutif} />
          <Label>Membre exécutif</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customRole">Fonction personnalisée (optionnel)</Label>
          <input
            id="customRole"
            type="text"
            className="border rounded p-2 w-full"
            placeholder="ex : Photographe, Responsable logistique…"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
          />
        </div>

        <Button onClick={handleAddMember}>Ajouter</Button>

        <hr className="my-4" />

        <div className="space-y-4">
          {members.map((m) => (
            <div key={m.id} className="border p-4 rounded flex justify-between">
              <div>
                <p className="font-semibold">{m.users.full_name}</p>
                <p>{m.is_executif ? "Exécutif" : "Membre"}</p>
                {m.user_roles?.map((r: any) => (
                  <p key={r.role} className="text-muted-foreground text-sm">{r.role}</p>
                ))}
              </div>

              <Button
                variant="destructive"
                onClick={() => handleRemoveMember(m.id, m.user_id)}
              >
                Retirer
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
