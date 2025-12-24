import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Vote, Plus, Trash2, Lock, Unlock } from "lucide-react";
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

interface Scrutin {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
}

interface VoteCount {
  pour: number;
  contre: number;
  abstention: number;
}

export const ScrutinManagement = () => {
  const [scrutins, setScrutins] = useState<Scrutin[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteCount>>({});

  useEffect(() => {
    loadScrutins();
  }, []);

  const loadScrutins = async () => {
    const { data, error } = await supabase
      .from("scrutins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des scrutins");
      return;
    }

    setScrutins(data || []);
    
    // Load vote counts for all scrutins
    if (data) {
      for (const scrutin of data) {
        await loadVoteCount(scrutin.id);
      }
    }
  };

  const loadVoteCount = async (scrutinId: string) => {
    const { data, error } = await supabase
      .from("scrutin_votes")
      .select("vote")
      .eq("scrutin_id", scrutinId);

    if (error) {
      console.error("Error loading votes:", error);
      return;
    }

    const counts: VoteCount = {
      pour: 0,
      contre: 0,
      abstention: 0,
    };

    data?.forEach((v) => {
      counts[v.vote as keyof VoteCount]++;
    });

    setVoteCounts((prev) => ({ ...prev, [scrutinId]: counts }));
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("scrutins").insert({
      title: formData.title,
      description: formData.description,
      created_by: user?.id,
      status: "closed",
    });

    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Scrutin créé avec succès");
      setFormData({ title: "", description: "" });
      loadScrutins();
    }

    setLoading(false);
  };

  const handleOpen = async (id: string) => {
    const { error } = await supabase
      .from("scrutins")
      .update({ 
        status: "open", 
        opened_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de l'ouverture");
    } else {
      toast.success("Scrutin ouvert - Les votes sont maintenant possibles");
      loadScrutins();
    }
  };

  const handleClose = async (id: string) => {
    const { error } = await supabase
      .from("scrutins")
      .update({ 
        status: "closed", 
        closed_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la clôture");
    } else {
      toast.success("Scrutin clos - Les résultats sont maintenant visibles");
      loadScrutins();
      loadVoteCount(id);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("scrutins")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Scrutin supprimé");
      loadScrutins();
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-6 w-6" />
          Gestion des Scrutins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form for creating new scrutin */}
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <h3 className="font-semibold">Créer un nouveau scrutin</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Titre du scrutin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder="Description du scrutin..."
              />
            </div>

            <Button onClick={handleCreate} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le scrutin
            </Button>
          </div>
        </div>

        {/* List of scrutins */}
        <div className="space-y-4">
          <h3 className="font-semibold">Scrutins existants</h3>

          {scrutins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun scrutin pour le moment
            </p>
          ) : (
            scrutins.map((scrutin) => (
              <Card key={scrutin.id} className="bg-muted/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{scrutin.title}</h4>
                        <Badge
                          variant={scrutin.status === "open" ? "default" : "secondary"}
                        >
                          {scrutin.status === "open" ? "Ouvert" : "Fermé"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {scrutin.description}
                      </p>
                      
                      {/* Show vote counts */}
{/* Show vote counts */}
{voteCounts[scrutin.id] && (() => {
  const counts = voteCounts[scrutin.id];
  const votants = counts.pour + counts.contre + counts.abstention;
  const exprimes = counts.pour + counts.contre;
  // Calcul de la majorité absolue : moitié des exprimés + 1
  const majoriteAbsolue = Math.floor(exprimes / 2) + 1;
  const estAdopte = counts.pour >= majoriteAbsolue;

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      {/* Ligne des totaux institutionnels */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Votants</span>
          <span className="font-bold text-lg">{votants}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Exprimés</span>
          <span className="font-bold text-lg">{exprimes}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Majorité Absolue</span>
          <span className="font-bold text-lg text-blue-600">{majoriteAbsolue}</span>
        </div>
      </div>

      {/* Détails des votes et Résultat */}
      <div className="flex items-center justify-between bg-background p-3 rounded-md border">
        <div className="flex gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-green-600 font-semibold">Pour: {counts.pour}</span>
            <span className="text-red-600 font-semibold">Contre: {counts.contre}</span>
            <span className="text-gray-500 italic">Abstention: {counts.abstention}</span>
          </div>
        </div>
        
        {exprimes > 0 && (
          <Badge className={estAdopte ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
            {estAdopte ? "ADOPTÉ" : "REJETÉ"}
          </Badge>
        )}
      </div>
    </div>
  );
})()}
                    </div>

                    <div className="flex gap-2">
                      {scrutin.status === "closed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpen(scrutin.id)}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Ouvrir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClose(scrutin.id)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Clore
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirmer la suppression
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer ce scrutin ?
                              Cette action est irréversible et supprimera également
                              tous les votes associés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(scrutin.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};