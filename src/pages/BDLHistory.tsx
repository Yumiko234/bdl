// src/pages/BDLHistory.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History, ChevronRight, Award } from "lucide-react";

interface Year {
  id: string;
  year_label: string;
  start_year: number;
  end_year: number;
  is_current: boolean;
}

const BDLHistory = () => {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error("Error loading years:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <History className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Historique des BDL</h1>
              <p className="text-xl">
                Découvrez les membres qui ont fait l'histoire du Bureau des Lycéens
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">
                  Chargement de l'historique...
                </p>
              ) : years.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucune année dans l'historique pour le moment
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold mb-8">Années Scolaires</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {years.map((year) => (
                      <Link key={year.id} to={`/bdl/historique/${year.year_label}`}>
                        <Card className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full gradient-institutional flex items-center justify-center text-white text-xl font-bold">
                                  {year.start_year.toString().slice(-2)}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold">
                                    {year.year_label}
                                  </h3>
                                  {year.is_current && (
                                    <Badge className="mt-1">Année en cours</Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section Membres Honorifiques */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-elegant border-2 border-accent">
                <CardContent className="p-8 space-y-6">
                  <div className="text-center space-y-4">
                    <Award className="h-16 w-16 mx-auto text-accent" />
                    <h2 className="text-3xl font-bold">Membres Honorifiques</h2>
                    <p className="text-muted-foreground text-lg">
                      En reconnaissance de leur contribution exceptionnelle au développement 
                      et à la structuration du Bureau des Lycéens de Saint-André
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {[
                      { name: "Alexandre Lejal", role: "Président", gradient: "gradient-institutional" },
                      { name: "Charline Jaegle", role: "Vice-Présidente", gradient: "gradient-gold" },
                      { name: "Saraan Vicq", role: "Secrétaire Générale", gradient: "gradient-institutional" },
                      { name: "Majid Matari", role: "Directeur de la Communauté et de la Communication", gradient: "gradient-gold" }
                    ].map((member) => (
                      <Card key={member.name} className="shadow-card">
                        <CardContent className="p-6 text-center space-y-3">
                          <div className={`w-20 h-20 mx-auto rounded-full ${member.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-elegant`}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{member.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {member.role}
                            </p>
                            <Badge variant="secondary" className="mt-2">
                              2025-2026
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BDLHistory;