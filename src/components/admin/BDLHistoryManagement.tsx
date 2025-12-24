// src/components/admin/BDLHistoryManagement.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History, Plus, Trash2, Users, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Year {
  id: string;
  year_label: string;
  start_year: number;
  end_year: number;
  is_current: boolean;
}

interface Member {
  id: string;
  year_id: string;
  full_name: string;
  role: string;
  is_executive: boolean;
  is_honorary: boolean;
  avatar_url: string | null;
  display_order: number;
}

export const BDLHistoryManagement = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [yearForm, setYearForm] = useState({
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 1,
    is_current: false,
  });

  const [memberForm, setMemberForm] = useState({
    full_name: "",
    role: "bdl_member",
    is_executive: false,
    is_honorary: false,
    display_order: 0,
  });

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    try {
      const { data, error } = await supabase
        .from("bdl_years")
        .select("*")
        .order("start_year", { ascending: false });

      if (error) throw error;
      setYears(data || []);

      // Load members for each year
      for (const year of data || []) {
        await loadMembersForYear(year.id);
      }
    } catch (error) {
      console.error("Error loading years:", error);
      toast.error("Erreur lors du chargement des années");
    }
  };

  const loadMembersForYear = async (yearId: string) => {
    try {
      const { data, error } = await supabase
        .from("bdl_historical_members")
        .select("*")
        .eq("year_id", yearId)
        .order("is_executive", { ascending: false })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setMembers((prev) => ({ ...prev, [yearId]: data || [] }));
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const handleCreateYear = async () => {
    if (yearForm.start_year >= yearForm.end_year) {
      toast.error("L'année de fin doit être supérieure à l'année de début");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const yearLabel = `${yearForm.start_year}-${yearForm.end_year}`;

    try {
      const { error } = await supabase.from("bdl_years").insert({
        year_label: yearLabel,
        start_year: yearForm.start_year,
        end_year: yearForm.end_year,
        is_current: yearForm.is_current,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Année créée avec succès");
      setYearForm({
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear() + 1,
        is_current: false,
      });
      loadYears();
    } catch (error: any) {
      console.error("Error creating year:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteYear = async (yearId: string) => {
    try {
      const { error } = await supabase
        .from("bdl_years")
        .delete()
        .eq("id", yearId);

      if (error) throw error;

      toast.success("Année supprimée");
      loadYears();
    } catch (error) {
      console.error("Error deleting year:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddMember = async () => {
    if (!selectedYear || !memberForm.full_name) {
      toast.error("Veuillez sélectionner une année et renseigner un nom");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase.from("bdl_historical_members").insert({
        year_id: selectedYear,
        full_name: memberForm.full_name,
        role: memberForm.role,
        is_executive: memberForm.is_executive,
        is_honorary: memberForm.is_honorary,
        display_order: memberForm.display_order,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Membre ajouté avec succès");
      setMemberForm({
        full_name: "",
        role: "bdl_member",
        is_executive: false,
        is_honorary: false,
        display_order: 0,
      });
      loadMembersForYear(selectedYear);
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string, yearId: string) => {
    try {
      const { error } = await supabase
        .from("bdl_historical_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Membre supprimé");
      loadMembersForYear(yearId);
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      president: "Président",
      vice_president: "Vice-Présidente",
      secretary_general: "Secrétaire Générale",
      communication_manager: "Directeur de la Communication",
      bdl_member: "Membre BDL",
    };
    return labels[role] || role;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-6 w-6" />
          Gestion de l'Historique BDL
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Création d'année */}
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="font-semibold">Créer une nouvelle année scolaire</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Année de début</Label>
              <Input
                type="number"
                value={yearForm.start_year}
                onChange={(e) => setYearForm({ ...yearForm, start_year: parseInt(e.target.value) })}
                placeholder="2025"
              />
            </div>

            <div className="space-y-2">
              <Label>Année de fin</Label>
              <Input
                type="number"
                value={yearForm.end_year}
                onChange={(e) => setYearForm({ ...yearForm, end_year: parseInt(e.target.value) })}
                placeholder="2026"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-current"
                  checked={yearForm.is_current}
                  onCheckedChange={(checked) => setYearForm({ ...yearForm, is_current: checked })}
                />
                <Label htmlFor="is-current">Année en cours</Label>
              </div>
            </div>
          </div>

          <Button onClick={handleCreateYear} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Créer l'année
          </Button>
        </div>

        {/* Liste des années */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Années existantes</h3>

          {years.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune année enregistrée
            </p>
          ) : (
            years.map((year) => (
              <Card key={year.id} className="bg-muted/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xl">{year.year_label}</h4>
                        {year.is_current && <Badge>Année en cours</Badge>}
                      </div>

                      {/* Members for this year */}
                      {members[year.id] && members[year.id].length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground">
                            {members[year.id].length} membre(s)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {members[year.id].map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-2 bg-background rounded-md border"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{member.full_name}</p>
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {getRoleLabel(member.role)}
                                    </Badge>
                                    {member.is_executive && (
                                      <Badge className="text-xs">Exécutif</Badge>
                                    )}
                                    {member.is_honorary && (
                                      <Badge variant="outline" className="text-xs">
                                        Honorifique
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Supprimer {member.full_name} de cette année ?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteMember(member.id, year.id)}
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedYear(selectedYear === year.id ? null : year.id)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Supprimer l'année {year.year_label} et tous ses membres ?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteYear(year.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Add member form for selected year */}
                  {selectedYear === year.id && (
                    <div className="mt-4 p-4 border rounded-lg bg-background space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter un membre à {year.year_label}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom complet</Label>
                          <Input
                            value={memberForm.full_name}
                            onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                            placeholder="Prénom Nom"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Rôle</Label>
                          <Select
                            value={memberForm.role}
                            onValueChange={(value) => setMemberForm({ ...memberForm, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="president">Président</SelectItem>
                              <SelectItem value="vice_president">Vice-Présidente</SelectItem>
                              <SelectItem value="secretary_general">Secrétaire Générale</SelectItem>
                              <SelectItem value="communication_manager">
                                Directeur de la Communication
                              </SelectItem>
                              <SelectItem value="bdl_member">Membre BDL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Ordre d'affichage</Label>
                          <Input
                            type="number"
                            value={memberForm.display_order}
                            onChange={(e) =>
                              setMemberForm({ ...memberForm, display_order: parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>

                        <div className="flex flex-col gap-2 justify-end">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="member-executive"
                              checked={memberForm.is_executive}
                              onCheckedChange={(checked) =>
                                setMemberForm({ ...memberForm, is_executive: checked })
                              }
                            />
                            <Label htmlFor="member-executive" className="text-sm">
                              Membre de l'équipe exécutive
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="member-honorary"
                              checked={memberForm.is_honorary}
                              onCheckedChange={(checked) =>
                                setMemberForm({ ...memberForm, is_honorary: checked })
                              }
                            />
                            <Label htmlFor="member-honorary" className="text-sm">
                              Membre honorifique
                            </Label>
                          </div>
                        </div>
                      </div>

                      <Button onClick={handleAddMember} disabled={loading}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter ce membre
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};