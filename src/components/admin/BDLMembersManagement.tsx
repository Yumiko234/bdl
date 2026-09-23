import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Save,
  X,
  GripVertical,
  Link,
  Link2Off,
  Download,
  Search,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface BDLMember {
  id: string;
  user_id: string | null;
  full_name: string;
  role_label: string;
  avatar_url: string | null;
  is_executive: boolean;
  display_order: number;
}

interface ProfileOption {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const ROLE_OPTIONS = [
  { value: "Administrateur",                                         label: "Administrateur",                          systemRole: "administrator" },
  { value: "Président",                                              label: "Président",                               systemRole: "president" },
  { value: "Présidente",                                             label: "Présidente",                              systemRole: "presidente" },
  { value: "Vice-Président",                                         label: "Vice-Président",                          systemRole: "vice_president" },
  { value: "Vice-Présidente",                                        label: "Vice-Présidente",                         systemRole: "vice_presidente" },
  { value: "Secrétaire Général",                                     label: "Secrétaire Général",                      systemRole: "secretary_general" },
  { value: "Secrétaire Générale",                                    label: "Secrétaire Générale",                     systemRole: "secretary_general2" },
  { value: "Directeur de la Communauté et de la Communication",     label: "Dir. Communauté & Communication (H)",     systemRole: "communication_manager" },
  { value: "Directrice de la Communauté et de la Communication",    label: "Dir. Communauté & Communication (F)",     systemRole: "communication_manager2" },
  { value: "Membre du Bureau",                                       label: "Membre du Bureau",                        systemRole: "bdl_member" },
];

const getSystemRole = (roleLabel: string): string =>
  ROLE_OPTIONS.find((r) => r.value === roleLabel)?.systemRole ?? "bdl_member";

const getRoleLabel = (role: string) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const emptyForm = {
  full_name: "",
  role_label: "Membre du Bureau",
  avatar_url: "",
  is_executive: false,
  display_order: 1,
  linked_user_id: "" as string,
};

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export const BDLMembersManagement = () => {
  const [members, setMembers] = useState<BDLMember[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [linkAccount, setLinkAccount] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
    loadProfiles();
  }, []);

  /* ---- loaders ---- */

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("bdl_members")
      .select("id, user_id, full_name, role_label, avatar_url, is_executive, display_order")
      .order("is_executive", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des membres");
      return;
    }

    setMembers((data ?? []) as BDLMember[]);
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .order("full_name");
    setProfiles((data ?? []) as ProfileOption[]);
  };

  /* ---- form helpers ---- */

  const openCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setLinkAccount(false);
    setForm({ ...emptyForm, display_order: members.length + 1 });
  };

  const openEdit = (m: BDLMember) => {
    setEditingId(m.id);
    setIsCreating(false);
    setLinkAccount(!!m.user_id);
    setForm({
      full_name: m.full_name,
      role_label: m.role_label,
      avatar_url: m.avatar_url ?? "",
      is_executive: m.is_executive,
      display_order: m.display_order,
      linked_user_id: m.user_id ?? "",
    });
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setLinkAccount(false);
    setForm(emptyForm);
  };

  /* When the admin picks a profile from the dropdown, pre-fill name/avatar */
  const handleProfileSelect = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setForm((f) => ({
      ...f,
      linked_user_id: profileId,
      full_name: profile.full_name ?? f.full_name,
      avatar_url: profile.avatar_url ?? f.avatar_url,
    }));
  };

  /* ---- save ---- */

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setLoading(true);
    try {
      const userId = linkAccount && form.linked_user_id ? form.linked_user_id : null;

      const payload = {
        full_name: form.full_name.trim(),
        role_label: form.role_label,
        avatar_url: form.avatar_url.trim() || null,
        is_executive: form.is_executive,
        display_order: form.display_order,
        user_id: userId,
      };

      if (isCreating) {
        const { error } = await supabase.from("bdl_members").insert(payload);
        if (error) throw error;

        // If linked to an account, sync the role in user_roles too
        if (userId) {
          await supabase
            .from("user_roles")
            .upsert({ user_id: userId, role: getSystemRole(form.role_label) as any });
        }

        toast.success("Membre ajouté avec succès");
      } else if (editingId) {
        const { error } = await supabase
          .from("bdl_members")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;

        // Sync role in user_roles if linked
        if (userId) {
          await supabase
            .from("user_roles")
            .upsert({ user_id: userId, role: getSystemRole(form.role_label) as any });
        }

        toast.success("Membre mis à jour");
      }

      cancelForm();
      await loadMembers();
    } catch (err: any) {
      toast.error("Erreur : " + (err.message ?? "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  /* ---- delete ---- */

  const handleDelete = async (id: string) => {
    if (!confirm("Retirer ce membre du BDL ?")) return;
    const { error } = await supabase.from("bdl_members").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Membre retiré");
      loadMembers();
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Nom", "Rôle", "Exécutif", "Lié à un compte", "Ordre"],
      ...members.map((m) => [
        m.full_name,
        m.role_label,
        m.is_executive ? "Oui" : "Non",
        m.user_id ? "Oui" : "Non",
        m.display_order,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `membres_bdl_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---- derived ---- */

  const q = search.trim().toLowerCase();
  const filtered = q
    ? members.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.role_label.toLowerCase().includes(q)
      )
    : members;
  const executive = filtered.filter((m) => m.is_executive);
  const regular = filtered.filter((m) => !m.is_executive);

  /* ---- render ---- */

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Membres du BDL
            </CardTitle>
            {!isCreating && !editingId && (
              <div className="flex gap-2">
                {members.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                )}
                <Button size="sm" onClick={openCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un membre
                </Button>
              </div>
            )}
          </div>
          {members.length > 0 && !isCreating && !editingId && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Rechercher par nom ou rôle…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ---- Form ---- */}
        {(isCreating || editingId) && (
          <Card className="border-primary/40 bg-muted/30">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-bold text-lg">
                {isCreating ? "Nouveau membre" : "Modifier le membre"}
              </h3>

              {/* Link toggle */}
              <div className="flex items-center gap-3 p-3 rounded-md border bg-background">
                <Switch
                  id="link-account"
                  checked={linkAccount}
                  onCheckedChange={(v) => {
                    setLinkAccount(v);
                    if (!v) setForm((f) => ({ ...f, linked_user_id: "" }));
                  }}
                />
                <Label htmlFor="link-account" className="flex items-center gap-2 cursor-pointer">
                  {linkAccount ? (
                    <Link className="h-4 w-4 text-primary" />
                  ) : (
                    <Link2Off className="h-4 w-4 text-muted-foreground" />
                  )}
                  {linkAccount
                    ? "Lié à un compte existant"
                    : "Fiche sans compte (membre externe)"}
                </Label>
              </div>

              {/* Profile picker — only when linked */}
              {linkAccount && (
                <div className="space-y-2">
                  <Label htmlFor="mb-profile">Compte utilisateur</Label>
                  <Select
                    value={form.linked_user_id}
                    onValueChange={handleProfileSelect}
                  >
                    <SelectTrigger id="mb-profile">
                      <SelectValue placeholder="Choisir un compte…" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} — {p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Sélectionner un compte pré-remplit le nom et la photo.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="mb-name">Nom complet *</Label>
                  <Input
                    id="mb-name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Prénom Nom"
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="mb-role">Rôle</Label>
                  <Select
                    value={form.role_label}
                    onValueChange={(v) => setForm({ ...form, role_label: v })}
                  >
                    <SelectTrigger id="mb-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Avatar URL */}
                <div className="space-y-2">
                  <Label htmlFor="mb-avatar">URL de la photo (optionnel)</Label>
                  <Input
                    id="mb-avatar"
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>

                {/* Display order */}
                <div className="space-y-2">
                  <Label htmlFor="mb-order">Ordre d'affichage</Label>
                  <Input
                    id="mb-order"
                    type="number"
                    min={1}
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({ ...form, display_order: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              {/* Executive toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  id="mb-exec"
                  checked={form.is_executive}
                  onCheckedChange={(v) => setForm({ ...form, is_executive: v })}
                />
                <Label htmlFor="mb-exec">Membre de l'équipe exécutive</Label>
              </div>

              {/* Live preview */}
              {form.full_name && (
                <div className="flex items-center gap-3 p-3 rounded-md border bg-background">
                  <Avatar className="h-10 w-10">
                    {form.avatar_url && (
                      <AvatarImage src={form.avatar_url} alt={form.full_name} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {getInitials(form.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{form.full_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {getRoleLabel(form.role_label)}
                      {form.is_executive && (
                        <Badge variant="default" className="text-xs">Exécutif</Badge>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={cancelForm} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---- Executive section ---- */}
        {executive.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Badge variant="default">Équipe Exécutive</Badge>
              <span className="text-muted-foreground text-sm">({executive.length})</span>
            </h3>
            <div className="space-y-2">
              {executive.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  isEditing={editingId === m.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ---- Regular members ---- */}
        {regular.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Badge variant="secondary">Membres</Badge>
              <span className="text-muted-foreground text-sm">({regular.length})</span>
            </h3>
            <div className="space-y-2">
              {regular.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  isEditing={editingId === m.id}
                />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && !isCreating && (
          <p className="text-center text-muted-foreground py-8">
            Aucun membre BDL enregistré. Cliquez sur « Ajouter un membre » pour commencer.
          </p>
        )}
        {members.length > 0 && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucun membre ne correspond à « {search} »
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* MemberRow sub-component                                             */
/* ------------------------------------------------------------------ */

interface MemberRowProps {
  member: BDLMember;
  onEdit: (m: BDLMember) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
}

const MemberRow = ({ member, onEdit, onDelete, isEditing }: MemberRowProps) => (
  <Card className={`bg-muted/30 ${isEditing ? "ring-2 ring-primary" : ""}`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Avatar className="h-10 w-10 shrink-0">
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt={member.full_name} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(member.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{member.full_name}</p>
              {member.user_id && (
                <Link
                  className="h-3 w-3 text-muted-foreground shrink-0"
                  title="Lié à un compte"
                />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{getRoleLabel(member.role_label)}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">#{member.display_order}</span>
          {member.is_executive && (
            <Badge variant="default" className="text-xs">Exécutif</Badge>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onEdit(member)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(member.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);