import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Vote, ThumbsUp, ThumbsDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Scrutin {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
}

interface VoteData {
  user_id: string;
  vote: "pour" | "contre" | "abstention";
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface MyVote {
  vote: "pour" | "contre" | "abstention";
}

const Scrutin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [scrutins, setScrutins] = useState<Scrutin[]>([]);
  const [votes, setVotes] = useState<Record<string, VoteData[]>>({});
  const [myVotes, setMyVotes] = useState<Record<string, MyVote>>({});
  const [loading, setLoading] = useState(true);
  const [canVote, setCanVote] = useState(false);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkVotingRights();
      loadScrutins();
    }
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

    // Load votes for closed scrutins and my votes
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
      .select("user_id, vote, profiles(full_name, avatar_url)")
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

  const handleVote = async (scrutinId: string, voteValue: "pour" | "contre" | "abstention") => {
    if (!user || !canVote) {
      toast.error("Vous n'avez pas les droits pour voter");
      return;
    }

    // Check if already voted
    if (myVotes[scrutinId]) {
      toast.error("Vous avez déjà voté sur ce scrutin");
      return;
    }

    // Insert new vote
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
      await loadMyVote(scrutinId);
    }
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
    
    return "";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
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
                Votez sur les décisions importantes du Bureau
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {!canVote && (
                <Card className="border-accent bg-accent/10">
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">
                      Vous pouvez consulter les scrutins mais vous n'avez pas les
                      droits pour voter. Seuls les membres du BDL peuvent voter.
                    </p>
                  </CardContent>
                </Card>
              )}

              {scrutins.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucun scrutin pour le moment
                  </CardContent>
                </Card>
              ) : (
                scrutins.map((scrutin) => (
                  <Card
                    key={scrutin.id}
                    className={`shadow-card ${
                      scrutin.status === "open" ? "border-2 border-accent" : ""
                    }`}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-2xl font-bold">{scrutin.title}</h3>
                            <Badge
                              variant={
                                scrutin.status === "open" ? "default" : "secondary"
                              }
                            >
                              {scrutin.status === "open" ? "En cours" : "Terminé"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {scrutin.description}
                          </p>
                        </div>
                      </div>

                      {/* Voting buttons for open scrutins */}
                      {scrutin.status === "open" && canVote && (
                        <div className="flex gap-3 pt-4 border-t">
                          <Button
                            onClick={() => handleVote(scrutin.id, "pour")}
                            variant={myVotes[scrutin.id] ? "default" : "outline"}
                            className={`flex-1 ${getButtonClassName(scrutin.id, "pour")}`}
                            disabled={!!myVotes[scrutin.id]}
                          >
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Pour
                          </Button>
                          <Button
                            onClick={() => handleVote(scrutin.id, "contre")}
                            variant={myVotes[scrutin.id] ? "default" : "outline"}
                            className={`flex-1 ${getButtonClassName(scrutin.id, "contre")}`}
                            disabled={!!myVotes[scrutin.id]}
                          >
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            Contre
                          </Button>
                          <Button
                            onClick={() => handleVote(scrutin.id, "abstention")}
                            variant={myVotes[scrutin.id] ? "default" : "outline"}
                            className={`flex-1 ${getButtonClassName(scrutin.id, "abstention")}`}
                            disabled={!!myVotes[scrutin.id]}
                          >
                            <Minus className="h-4 w-4 mr-2" />
                            Abstention
                          </Button>
                        </div>
                      )}

                      {/* Show my vote for open scrutins */}
                      {scrutin.status === "open" && myVotes[scrutin.id] && (
                        <div className="text-sm text-muted-foreground pt-2">
                          Votre vote a été enregistré :{" "}
                          <span className="font-semibold">
                            {getVoteLabel(myVotes[scrutin.id].vote)}
                          </span>
                        </div>
                      )}

                      {/* Show results for closed scrutins */}
                      {scrutin.status === "closed" && votes[scrutin.id] && (
                        <div className="pt-4 border-t space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Résultats du vote :</h4>
                            
                            {/* Summary */}
                            <div className="flex gap-4 text-sm font-medium">
                              <span className="text-green-600">
                                Pour:{" "}
                                {
                                  votes[scrutin.id].filter((v) => v.vote === "pour")
                                    .length
                                }
                              </span>
                              <span className="text-red-600">
                                Contre:{" "}
                                {
                                  votes[scrutin.id].filter(
                                    (v) => v.vote === "contre"
                                  ).length
                                }
                              </span>
                              <span className="text-blue-600">
                                Abstention:{" "}
                                {
                                  votes[scrutin.id].filter(
                                    (v) => v.vote === "abstention"
                                  ).length
                                }
                              </span>
                            </div>
                          </div>

                          <Collapsible
                            open={openDetails[scrutin.id]}
                            onOpenChange={() => toggleDetails(scrutin.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" className="w-full">
                                {openDetails[scrutin.id] ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Masquer les détails
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Voir les détails
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 mt-3">
                              {votes[scrutin.id].map((voteData) => (
                                <div
                                  key={voteData.user_id}
                                  className="flex items-center gap-3 p-3 bg-muted/30 rounded"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={voteData.profiles.avatar_url || undefined}
                                    />
                                    <AvatarFallback>
                                      {voteData.profiles.full_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 font-medium">
                                    {voteData.profiles.full_name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {getVoteIcon(voteData.vote)}
                                    <span className="text-sm font-semibold">
                                      {getVoteLabel(voteData.vote)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Scrutin;