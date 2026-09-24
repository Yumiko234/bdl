// src/pages/BDLHistory.tsx
import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History, ChevronRight, Award } from "lucide-react";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

interface Year {
  id: string;
  year_label: string;
  start_year: number;
  end_year: number;
  is_current: boolean;
}

interface HonoraryMember {
  full_name: string;
  role: string;
  avatar_url: string | null;
  year_label: string;
  profile_slug: string;
}

const ROLE_LABELS: Record<string, string> = {
  president: "Président",
  presidente: "Présidente",
  vice_president: "Vice-Président",
  vice_presidente: "Vice-Présidente",
  secretary_general: "Secrétaire Général",
  secretary_general2: "Secrétaire Générale",
  communication_manager: "Directeur ComCom",
  communication_manager2: "Directrice ComCom",
  bdl_member: "Membre BDL",
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const toPersonSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

const BDLHistory = () => {
  useSEO({
    title: "Historique du BDL – Bureau des Lycéens",
    description: "Retracez l'histoire du Bureau des Lycéens du Lycée Saint-André, année par année.",
    url: "/bdl/historique",
  });
  const [years, setYears] = useState<Year[]>([]);
  const [honorary, setHonorary] = useState<HonoraryMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Historique – Bureau des Lycéens";
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [yearsRes, honoraryRes] = await Promise.all([
        supabase.from("bdl_years").select("*").order("start_year", { ascending: false }),
        supabase
          .from("bdl_historical_members")
          .select("full_name, role, avatar_url, bdl_years(year_label)")
          .eq("is_honorary", true)
          .order("display_order", { ascending: true }),
      ]);

      if (yearsRes.error) throw yearsRes.error;
      setYears(yearsRes.data || []);

      if (!honoraryRes.error && honoraryRes.data) {
        const names = honoraryRes.data.map((m: any) => m.full_name);
        const slugMap: Record<string, string> = {};
        if (names.length > 0) {
          const personSlugs = names.map(toPersonSlug);
          const { data: profiles } = await supabase
            .from("bdl_member_profiles")
            .select("person_slug, slug, year_id")
            .in("person_slug", personSlugs)
            .eq("is_published", true)
            .is("year_id", null);
          (profiles || []).forEach((p: any) => { slugMap[p.person_slug] = p.slug; });
        }
        setHonorary(
          honoraryRes.data.map((m: any) => {
            const personSlug = toPersonSlug(m.full_name);
            return {
              full_name: m.full_name,
              role: m.role,
              avatar_url: m.avatar_url ?? null,
              year_label: (m.bdl_years as any)?.year_label ?? "",
              profile_slug: slugMap[personSlug] ?? personSlug,
            };
          })
        );
      }
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <MaintenanceOverlay>
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <History className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Historique des BDL</h1>
              <p className="text-xl">
                Découvrez les membres qui ont fait partie du Bureau des Lycéens au cours des années passées
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
                                  <h3 className="text-2xl font-bold">{year.year_label}</h3>
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

        {honorary.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <Award className="h-12 w-12 mx-auto text-accent" />
                  <h2 className="text-3xl font-bold">Membres Honorifiques</h2>
                  <p className="text-muted-foreground">
                    En reconnaissance de leur contribution à la restructuration du BDL de Saint-André
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {honorary.map((m) => (
                    <Link key={m.profile_slug} to={`/bdl/${m.profile_slug}`}>
                      <Card className="group shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                        <CardContent className="p-5 flex items-center gap-4">
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.full_name}
                              className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-background group-hover:ring-accent transition-all"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full gradient-institutional flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ring-2 ring-background group-hover:ring-accent transition-all">
                              {getInitials(m.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-base truncate">{m.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {ROLE_LABELS[m.role] ?? m.role}
                            </p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {m.year_label}
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
};

export default BDLHistory;
