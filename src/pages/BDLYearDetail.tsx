// src/pages/BDLYearDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom"; // Import Link conservé (Étape 3.D)
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  role: string;
  is_executive: boolean;
  is_honorary: boolean;
  avatar_url: string | null;
  display_order: number;
}

interface Year {
  id: string;
  year_label: string;
  is_current: boolean;
}

const BDLYearDetail = () => {
  const { year } = useParams<{ year: string }>();
  const [yearData, setYearData] = useState<Year | null>(null);
  const [executiveMembers, setExecutiveMembers] = useState<Member[]>([]);
  const [regularMembers, setRegularMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (year) {
      loadYearData();
    }
  }, [year]);

  const loadYearData = async () => {
    try {
      // Load year info
      const { data: yearInfo, error: yearError } = await supabase
        .from("bdl_years")
        .select("*")
        .eq("year_label", year)
        .single();

      if (yearError) throw yearError;
      setYearData(yearInfo);

      // Load members for this year
      const { data: members, error: membersError } = await supabase
        .from("bdl_historical_members")
        .select("*")
        .eq("year_id", yearInfo.id)
        .order("is_executive", { ascending: false })
        .order("display_order", { ascending: true });

      if (membersError) throw membersError;

      const executive = (members || []).filter((m: Member) => m.is_executive);
      const regular = (members || []).filter((m: Member) => !m.is_executive);

      setExecutiveMembers(executive);
      setRegularMembers(regular);
    } catch (error) {
      console.error("Error loading year data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
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

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleGradient = (role: string): string => {
    if (["president", "secretary_general"].includes(role)) return "gradient-institutional";
    if (["vice_president", "communication_manager"].includes(role)) return "gradient-gold";
    return "gradient-institutional";
  };

  // Fonction utilitaire ajoutée (Étape 3.D)
  const generateMemberSlug = (fullName: string): string => {
    return fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  };

  const renderMemberCard = (member: Member) => {
    const gradient = getRoleGradient(member.role);
    const slug = generateMemberSlug(member.full_name); // Ajout (Étape 3.D)

    return (
      <Link to={`/bdl/${slug}`} key={member.id}> {/* Modification (Étape 3.D) */}
        <Card
          className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 cursor-pointer"
        >
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="w-24 h-24 rounded-full ring-4 ring-background group-hover:scale-110 transition-transform duration-300 object-cover"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full ${gradient} flex items-center justify-center text-white text-2xl font-bold shadow-elegant ring-4 ring-background group-hover:scale-110 transition-transform duration-300`}
                >
                  {getInitials(member.full_name)}
                </div>
              )}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">{member.full_name}</h3>
                <Badge variant="secondary" className="text-xs font-medium">
                  {getRoleLabel(member.role)}
                </Badge>
                {member.is_honorary && (
                  <Badge className="text-xs font-medium bg-accent text-secondary mt-2">
                    Membre Honorifique
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (loading) {
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

  if (!yearData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Année introuvable</p>
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
              <Link to="/bdl/historique">
                <Button variant="outline" className="mb-4 border-white text-black hover:bg-white hover:text-primary">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Retour à l'historique
                </Button>
              </Link>
              <h1 className="text-5xl font-bold">BDL {yearData.year_label}</h1>
              {yearData.is_current && (
                <Badge className="text-lg py-2 px-4">Année en cours</Badge>
              )}
            </div>
          </div>
        </section>

        {executiveMembers.length > 0 && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto space-y-12">
                <div>
                  <h2 className="text-4xl font-bold text-center mb-8">Équipe Exécutive</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {executiveMembers.map(renderMemberCard)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {regularMembers.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto space-y-12">
                <div>
                  <h2 className="text-4xl font-bold text-center mb-8">Membres</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {regularMembers.map(renderMemberCard)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {executiveMembers.length === 0 && regularMembers.length === 0 && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <Card className="max-w-2xl mx-auto shadow-card">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Aucun membre enregistré pour cette année
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BDLYearDetail;
