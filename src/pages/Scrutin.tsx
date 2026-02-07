import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Vote, ThumbsUp, ThumbsDown, Minus, ChevronDown, ChevronUp, EyeOff, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Scrutin {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  is_secret: boolean;
  created_at: string;
}

interface VoteData {
  user_id: string;
  vote: "pour" | "contre" | "abstention";
  profiles: {
    full_name: string;
    avatar_url: string | null;
    user_roles: Array<{ role: string }>;
  };
}

interface MyVote {
  vote: "pour" | "contre" | "abstention";
}

interface GroupedScrutins {
  [key: string]: Scrutin[];
}

const Scrutin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [scrutins, setScrutins] = useState<Scrutin[]>([]);
  const [votes, setVotes] = useState<Record<string, VoteData[]>>({});
  const [myVotes, setMyVotes] = useState<Record<string, MyVote>>({});
  const [loading, setLoading] = useState(true);
  const [canVote, setCanVote] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    scrutinId: string;
    voteValue: "pour" | "contre" | "abstention";
    scrutinTitle: string;
  }>({
    open: false,
    scrutinId: "",
    voteValue: "pour",
    scrutinTitle: "",
  });

  useEffect(() => {
    if (user) {
      checkVotingRights();
    }
    loadScrutins();
  }, [user]);

  const checkVotingRights = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (data) {
      const roles = data.map((r) => r.role);
      const votingRoles = [
        "bdl_member",
        "communication_manager",
        "secretary_general",
        "vice_president",
      ];
      setCanVote(roles.some((r) => votingRoles.includes(r)));
      setIsPresident(roles.includes("president"));
    }
  };

  const loadScrutins = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scrutins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement");
      setLoading(false);
      return;
    }

    setScrutins(data || []);

    for (const scrutin of data || []) {
      if (scrutin.status === "closed") {
        await loadVotes(scrutin.id);
      }
      await loadMyVote(scrutin.id);
    }

    setLoading(false);
  };

  const loadVotes = async (scrutinId: string) => {
    const { data, error } = await supabase
      .from("scrutin_votes")
      .select(`
        user_id, 
        vote, 
        profiles!scrutin_votes_user_id_fkey(
          full_name, 
          avatar_url,
          user_roles(role)
        )
      `)
      .eq("scrutin_id", scrutinId);

    if (error) {
      console.error("Error loading votes:", error);
      return;
    }

    setVotes((prev) => ({ ...prev, [scrutinId]: data as any || [] }));
  };

  const loadMyVote = async (scrutinId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from("scrutin_votes")
      .select("vote")
      .eq("scrutin_id", scrutinId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setMyVotes((prev) => ({ ...prev, [scrutinId]: data }));
    }
  };

  const openConfirmDialog = (scrutinId: string, voteValue: "pour" | "contre" | "abstention", scrutinTitle: string) => {
    setConfirmDialog({
      open: true,
      scrutinId,
      voteValue,
      scrutinTitle,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      scrutinId: "",
      voteValue: "pour",
      scrutinTitle: "",
    });
  };

  const handleVote = async (scrutinId: string, voteValue: "pour" | "contre" | "abstention") => {
    if (!user || !canVote) {
      toast.error("Vous n'avez pas les droits pour voter");
      return;
    }

    if (myVotes[scrutinId]) {
      toast.error("Vous avez déjà voté sur ce scrutin");
      return;
    }

    const { error } = await supabase.from("scrutin_votes").insert({
      scrutin_id: scrutinId,
      user_id: user.id,
      vote: voteValue,
    });

    if (error) {
      console.error("Vote error:", error);
      toast.error("Erreur lors du vote");
    } else {
      toast.success("Vote enregistré avec succès");
      setMyVotes((prev) => ({
        ...prev,
        [scrutinId]: { vote: voteValue },
      }));
    }
    
    closeConfirmDialog();
  };

  const confirmVote = () => {
    handleVote(confirmDialog.scrutinId, confirmDialog.voteValue);
  };

  const toggleDetails = (scrutinId: string) => {
    setOpenDetails(prev => ({
      ...prev,
      [scrutinId]: !prev[scrutinId]
    }));
  };

  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case "pour":
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case "contre":
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case "abstention":
        return <Minus className="h-4 w-4 text-blue-600" />;
    }
  };

  const getVoteLabel = (vote: string) => {
    switch (vote) {
      case "pour":
        return "Pour";
      case "contre":
        return "Contre";
      case "abstention":
        return "Abstention";
    }
  };

  const getButtonClassName = (scrutinId: string, voteValue: "pour" | "contre" | "abstention") => {
    const hasVoted = myVotes[scrutinId];
    const isThisVote = hasVoted?.vote === voteValue;
    
    if (isThisVote) {
      switch (voteValue) {
        case "pour":
          return "bg-green-600 hover:bg-green-700 text-white border-green-600";
        case "contre":
          return "bg-red-600 hover:bg-red-700 text-white border-red-600";
        case "abstention":
          return "bg-blue-600 hover:bg-blue-700 text-white border-blue-600";
      }
    }
    
    if (hasVoted) {
      return "opacity-50 cursor-not-allowed";
    }
    
    switch (voteValue) {
      case "pour":
        return "hover:bg-green-100 hover:border-green-600 hover:text-green-700";
      case "contre":
        return "hover:bg-red-100 hover:border-red-600 hover:text-red-700";
      case "abstention":
        return "hover:bg-blue-100 hover:border-blue-600 hover:text-blue-700";
    }
  };

  const getRoleLabel = (profile: VoteData['profiles']) => {
    if (!profile?.user_roles || profile.user_roles.length === 0) return "Membre BDL";
    
    const roleLabels: Record<string, string> = {
      president: "Président",
      vice_president: "Vice-Présidente",
      secretary_general: "Secrétaire Générale",
      communication_manager: "Directeur de la Communication",
      bdl_member: "Membre BDL",
    };
    
    const rolePriority = ["president", "vice_president", "secretary_general", "communication_manager", "bdl_member"];
    for (const priority of rolePriority) {
      if (profile.user_roles.some(r => r.role === priority)) {
        return roleLabels[priority] || "Membre BDL";
      }
    }
    
    return "Membre BDL";
  };

  const getPeriodLabel = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const groupScrutinsByPeriod = (scrutins: Scrutin[]): GroupedScrutins => {
    return scrutins.reduce((groups: GroupedScrutins, scrutin) => {
      const period = getPeriodLabel(scrutin.created_at);
      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(scrutin);
      return groups;
    }, {});
  };

  const filteredScrutins = scrutins.filter((scrutin) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      scrutin.title.toLowerCase().includes(searchLower) ||
      scrutin.description.toLowerCase().includes(searchLower)
    );
  });

  const groupedScrutins = groupScrutinsByPeriod(filteredScrutins);
  const periods = Object.keys(groupedScrutins).sort((a, b) => {
    const dateA = new Date(groupedScrutins[a][0].created_at);
    const dateB = new Date(groupedScrutins[b][0].created_at);
    return dateB.getTime() - dateA.getTime();
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <Vote className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Scrutins BDL</h1>
              <p className="text-xl">
                Votez sur les décisions du Bureau
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {!user && (
                <Card className="border-accent bg-accent/10">
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">
                      Vous devez être connecté pour voter sur les scrutins.{" "}
                      <a href="/auth" className="text-primary hover:underline font-semibold">
                        Se connecter
                      </a>
                    </p>
                  </CardContent>
                </Card>
              )}

              {user && isPresident && (
                <Card className="border-primary bg-primary/10">
                  <CardContent className="p-6">
                    <p className="text-center font-semibold">
                      En tant que Président, vous ne pouvez pas voter (neutralité présidentielle).
                    </p>
                  </CardContent>
                </Card>
              )}

              {user && !canVote && !isPresident && (
                <Card className="border-accent bg-accent/10">
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">
                      Seuls les membres du BDL peuvent voter.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher un scrutin par titre ou description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              {scrutins.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucun scrutin pour le moment
                  </CardContent>
                </Card>
              ) : filteredScrutins.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucun scrutin ne correspond à votre recherche
                  </CardContent>
                </Card>
              ) : (
                periods.map((period) => (
                  <div key={period} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-border flex-1" />
                      <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
                        {period}
                      </h2>
                      <div className="h-px bg-border flex-1" />
                    </div>

                    {groupedScrutins[period].map((scrutin) => (
                      <Card
                        key={scrutin.id}
                        className={`shadow-card ${
                          scrutin.status === "open" ? "border-2 border-accent" : ""
                        }`}
                      >
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="text-2xl font-bold">{scrutin.title}</h3>
                                <Badge
                                  variant={
                                    scrutin.status === "open" ? "default" : "secondary"
                                  }
                                >
                                  {scrutin.status === "open" ? "En cours" : "Terminé"}
                                </Badge>
                                {scrutin.is_secret && (
                                  <Badge variant="outline" className="gap-1">
                                    <EyeOff className="h-3 w-3" />
                                    Secret
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                {scrutin.description}
                              </p>
                            </div>
                          </div>

                          {scrutin.status === "open" && user && canVote && !isPresident && (
                            <div className="flex gap-3 pt-4 border-t">
                              <Button
                                onClick={() => openConfirmDialog(scrutin.id, "pour", scrutin.title)}
                                variant={myVotes[scrutin.id] ? "default" : "outline"}
                                className={`flex-1 transition-all ${getButtonClassName(scrutin.id, "pour")}`}
                                disabled={!!myVotes[scrutin.id]}
                              >
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Pour
                              </Button>
                              <Button
                                onClick={() => openConfirmDialog(scrutin.id, "contre", scrutin.title)}
                                variant={myVotes[scrutin.id] ? "default" : "outline"}
                                className={`flex-1 transition-all ${getButtonClassName(scrutin.id, "contre")}`}
                                disabled={!!myVotes[scrutin.id]}
                              >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Contre
                              </Button>
                              <Button
                                onClick={() => openConfirmDialog(scrutin.id, "abstention", scrutin.title)}
                                variant={myVotes[scrutin.id] ? "default" : "outline"}
                                className={`flex-1 transition-all ${getButtonClassName(scrutin.id, "abstention")}`}
                                disabled={!!myVotes[scrutin.id]}
                              >
                                <Minus className="h-4 w-4 mr-2" />
                                Abstention
                              </Button>
                            </div>
                          )}

                          {scrutin.status === "open" && myVotes[scrutin.id] && (
                            <div className="text-sm text-muted-foreground pt-2">
                              Votre vote : <span className="font-semibold">{getVoteLabel(myVotes[scrutin.id].vote)}</span>
                            </div>
                          )}

                          {scrutin.status === "closed" && votes[scrutin.id] && (() => {
                            const currentVotes = votes[scrutin.id];
                            const pour = currentVotes.filter((v) => v.vote === "pour").length;
                            const contre = currentVotes.filter((v) => v.vote === "contre").length;
                            const abstention = currentVotes.filter((v) => v.vote === "abstention").length;
                            
                            const votants = pour + contre + abstention;
                            const exprimes = pour + contre;
                            const majoriteAbsolue = Math.floor(exprimes / 2) + 1;
                            const estAdopte = pour >= majoriteAbsolue && exprimes > 0;

                            return (
                              <div className="pt-4 border-t space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <h4 className="font-semibold text-lg">Résultats officiels</h4>
                                  
                                  {exprimes > 0 ? (
                                    <Badge 
                                      className={`text-sm py-1 px-4 self-start md:self-center ${
                                        estAdopte 
                                          ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" 
                                          : "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
                                      }`}
                                      variant="outline"
                                    >
                                      {estAdopte ? "SCRUTIN ADOPTÉ" : "SCRUTIN REJETÉ"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">AUCUN SUFFRAGE EXPRIMÉ</Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg border">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase font-medium">Votants</span>
                                    <span className="text-xl font-bold">{votants}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase font-medium">Exprimés</span>
                                    <span className="text-xl font-bold">{exprimes}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase font-medium text-blue-600">Majorité</span>
                                    <span className="text-xl font-bold text-blue-600">{majoriteAbsolue}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase font-medium text-green-600">Pour</span>
                                    <span className="text-xl font-bold text-green-600">{pour}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase font-medium text-red-600">Contre</span>
                                    <span className="text-xl font-bold text-red-600">{contre}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase font-medium">Abstention</span>
                                    <span className="text-xl font-bold">{abstention}</span>
                                  </div>
                                </div>

                                {!scrutin.is_secret && (
                                  <Collapsible
                                    open={openDetails[scrutin.id]}
                                    onOpenChange={() => toggleDetails(scrutin.id)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                                        {openDetails[scrutin.id] ? (
                                          <><ChevronUp className="h-4 w-4 mr-2" /> Masquer le détail des votes</>
                                        ) : (
                                          <><ChevronDown className="h-4 w-4 mr-2" /> Voir le détail des votes par membre</>
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 mt-3">
                                      {currentVotes.map((voteData) => (
                                        <div
                                          key={voteData.user_id}
                                          className="flex items-center gap-3 p-3 bg-background border rounded-md"
                                        >
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage src={voteData.profiles.avatar_url || undefined} />
                                            <AvatarFallback>{voteData.profiles.full_name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <div className="text-sm font-medium">{voteData.profiles.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{getRoleLabel(voteData.profiles)}</div>
                                          </div>
                                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
                                            {getVoteIcon(voteData.vote)}
                                            <span className="text-xs font-bold uppercase">{voteData.vote}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}

                                {scrutin.is_secret && (
                                  <div className="text-center text-sm text-muted-foreground italic p-3 bg-muted/20 rounded-md border">
                                    <EyeOff className="h-4 w-4 inline mr-2" />
                                    Scrutin secret : le détail nominatif des votes est masqué
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modal de confirmation */}
      <Dialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer votre vote</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de voter <strong className="text-foreground">{getVoteLabel(confirmDialog.voteValue)}</strong> pour le scrutin :
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="font-semibold text-lg">{confirmDialog.scrutinTitle}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex gap-3">
            <div className="text-amber-600 mt-0.5">⚠️</div>
            <p className="text-sm text-amber-800">
              Attention : une fois enregistré, votre vote ne pourra plus être modifié.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeConfirmDialog}>
              Annuler
            </Button>
            <Button 
              onClick={confirmVote}
              className={
                confirmDialog.voteValue === "pour" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : confirmDialog.voteValue === "contre"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            >
              Confirmer mon vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Scrutin;
