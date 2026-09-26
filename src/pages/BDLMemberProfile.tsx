import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, Mail, MessageCircle, Calendar, GraduationCap, Lightbulb, Award, History } from "lucide-react";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

interface MemberProfile {
  id: string;
  full_name: string;
  slug: string;
  person_slug: string;
  year_id: string | null;
  photo_url: string | null;
  age: number | null;
  role: string | null;
  class: string | null;
  contact_method: string | null;
  biography: string | null;
  career_path: string | null;
  anecdote: string | null;
  bdl_years?: { year_label: string } | null;
}

// Entrée unifiée : issue de bdl_member_profiles OU bdl_historical_members
interface YearEntry {
  year_id: string;
  year_label: string;
  is_current: boolean;
  role: string | null;
  photo_url: string | null;
  biography: string | null;
  career_path: string | null;
  anecdote: string | null;
  age: number | null;
  bdl_class: string | null;
  start_year: number | null;
  end_year: number | null;
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

// Traduit une clé de rôle DB si elle existe dans ROLE_LABELS, sinon affiche telle quelle
const formatRole = (role: string | null) =>
  role ? (ROLE_LABELS[role] ?? role) : null;

const BDLMemberProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [yearEntries, setYearEntries] = useState<YearEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openYear, setOpenYear] = useState<string | null>(null);
  const yearRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (slug) loadProfile();
    else setLoading(false);
  }, [slug]);

  // Auto-ouvre l'année du hash URL
  useEffect(() => {
    if (yearEntries.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const entry = yearEntries.find((y) => y.year_label === hash);
    if (entry && openYear !== entry.year_id) {
      setOpenYear(entry.year_id);
      setTimeout(() => {
        yearRefs.current[entry.year_id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [yearEntries]);

  const loadProfile = async () => {
    try {
      let { data, error } = await supabase
        .from("bdl_member_profiles")
        .select("*, bdl_years(year_label)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;

      // Fallback : si pas trouvé par slug, essaie par person_slug (URL sans suffixe année)
      if (!data) {
        const { data: byPersonSlug } = await supabase
          .from("bdl_member_profiles")
          .select("*, bdl_years(year_label)")
          .eq("person_slug", slug)
          .eq("is_published", true)
          .order("slug", { ascending: false }) // fiche globale ou plus récente année
          .limit(1)
          .maybeSingle();
        data = byPersonSlug;
      }

      if (!data) throw new Error("not-found");

      // Fiche année → redirige vers la fiche globale + hash
      if (data.year_id !== null) {
        const { data: globalProfile } = await supabase
          .from("bdl_member_profiles")
          .select("slug")
          .eq("person_slug", data.person_slug)
          .eq("is_published", true)
          .is("year_id", null)
          .maybeSingle();

        if (globalProfile) {
          const yearLabel = (data.bdl_years as any)?.year_label;
          const hash = yearLabel ? `#${encodeURIComponent(yearLabel)}` : "";
          navigate(`/bdl/${globalProfile.slug}${hash}`, { replace: true });
          return;
        }
      }

      setProfile(data);
      document.title = `${data.full_name} – Bureau des Lycéens`;

      // --- Fiches années depuis bdl_member_profiles ---
      const { data: profileYears } = await supabase
        .from("bdl_member_profiles")
        .select("year_id, role, photo_url, biography, career_path, anecdote, age, class, bdl_years(year_label, is_current, start_year, end_year)")
        .eq("person_slug", data.person_slug)
        .eq("is_published", true)
        .not("year_id", "is", null);

      const profileYearMap: Record<string, YearEntry> = {};
      (profileYears || []).forEach((p: any) => {
        profileYearMap[p.year_id] = {
          year_id: p.year_id,
          year_label: p.bdl_years?.year_label ?? "",
          is_current: p.bdl_years?.is_current ?? false,
          role: p.role,
          photo_url: p.photo_url,
          biography: p.biography,
          career_path: p.career_path,
          anecdote: p.anecdote,
          age: p.age,
          bdl_class: p.class,
          start_year: p.bdl_years?.start_year ?? null,
          end_year: p.bdl_years?.end_year ?? null,
        };
      });

      // --- Rôles historiques depuis bdl_historical_members ---
      // Complète les années qui n'ont pas de fiche détaillée (ilike pour la casse)
      const { data: historical } = await supabase
        .from("bdl_historical_members")
        .select("role, year_id, bdl_years(year_label, is_current, start_year, end_year)")
        .ilike("full_name", data.full_name);

      (historical || []).forEach((h: any) => {
        if (!profileYearMap[h.year_id]) {
          profileYearMap[h.year_id] = {
            year_id: h.year_id,
            year_label: h.bdl_years?.year_label ?? "",
            is_current: h.bdl_years?.is_current ?? false,
            role: h.role,
            photo_url: null,
            biography: null,
            career_path: null,
            anecdote: null,
            age: null,
            bdl_class: null,
            start_year: h.bdl_years?.start_year ?? null,
            end_year: h.bdl_years?.end_year ?? null,
          };
        }
      });

      const sorted = Object.values(profileYearMap).sort((a, b) =>
        (b.year_label || "").localeCompare(a.year_label || "")
      );

      setYearEntries(sorted);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Profil introuvable");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleToggleYear = (entry: YearEntry) => {
    const hasContent = entry.biography || entry.career_path || entry.anecdote;
    if (!hasContent) return;
    const next = openYear === entry.year_id ? null : entry.year_id;
    setOpenYear(next);
    if (next) {
      window.history.replaceState(null, "", `${window.location.pathname}#${encodeURIComponent(entry.year_label)}`);
      setTimeout(() => {
        yearRefs.current[entry.year_id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
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

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold">Profil introuvable</h2>
              <p className="text-muted-foreground">
                Ce membre n'existe pas ou son profil n'est pas encore publié.
              </p>
              <Link to="/bdl">
                <Button>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Retour au BDL
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentYearEntry = yearEntries.find((y) => y.is_current);
  const isCurrentMember = !!currentYearEntry;
  // Hero : rôle de l'année en cours si membre actuel, sinon fiche globale
  const displayPhoto = currentYearEntry?.photo_url || profile.photo_url || yearEntries[0]?.photo_url;
  const displayRole = currentYearEntry?.role || profile.role;
  const displayAge = currentYearEntry?.age || profile.age;
  const displayClass = currentYearEntry?.bdl_class || profile.class;
  const latestYear = yearEntries[0];

  // Plage complète (ex: "2023-2026") au lieu de la seule dernière année
  const yearsWithRange = yearEntries.filter((y) => y.start_year != null && y.end_year != null);
  const rangeLabel = (() => {
    if (yearsWithRange.length === 0) return latestYear?.year_label ?? "";
    const minStart = Math.min(...yearsWithRange.map((y) => y.start_year as number));
    const maxEnd = Math.max(...yearsWithRange.map((y) => y.end_year as number));
    return `${minStart}-${maxEnd}`;
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <MaintenanceOverlay>
        {/* Hero */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <nav className="text-xs text-white/60 flex items-center gap-1.5 flex-wrap mb-6">
              <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <Link to="/bdl" className="hover:text-white transition-colors">Le BDL</Link>
              <span>/</span>
              <span className="text-white/90 font-medium">{profile.full_name}</span>
            </nav>
            <Link to="/bdl" className="inline-block mb-8">
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 -ml-2">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Retour au BDL
              </Button>
            </Link>
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="flex justify-center">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt={profile.full_name}
                    loading="lazy"
                    className="h-40 w-40 rounded-full object-cover ring-4 ring-white shadow-elegant"
                  />
                ) : (
                  <div className="h-40 w-40 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold shadow-elegant ring-4 ring-white">
                    {getInitials(profile.full_name)}
                  </div>
                )}
              </div>

              <h1 className="text-5xl font-bold">{profile.full_name}</h1>

              <div className="flex flex-wrap justify-center gap-2">
                {yearEntries.length > 0 && (
                  isCurrentMember ? (
                    <Badge className="bg-green-500/80 text-white border-green-400/30 text-sm py-1 px-3">
                      Membre actuel
                    </Badge>
                  ) : (
                    <Badge className="bg-white/15 text-white border-white/25 text-sm py-1 px-3">
                      Ancien membre — {rangeLabel}
                    </Badge>
                  )
                )}
                {displayRole && (
                  <Badge className="bg-white/20 text-white border-white/30 text-base py-1 px-3">
                    <Award className="h-4 w-4 mr-1" />
                    {formatRole(displayRole)}
                  </Badge>
                )}
                {displayAge && (
                  <Badge className="bg-white/20 text-white border-white/30 text-base py-1 px-3">
                    <Calendar className="h-4 w-4 mr-1" />
                    {displayAge} ans
                  </Badge>
                )}
                {displayClass && (
                  <Badge className="bg-white/20 text-white border-white/30 text-base py-1 px-3">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {displayClass}
                  </Badge>
                )}
              </div>

              {yearEntries.length > 0 && (
                <p className="text-white/60 text-xs uppercase tracking-wide pt-2">
                  {yearEntries.length} fiche{yearEntries.length > 1 ? "s" : ""} par année ↓
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Contact */}
        {profile.contact_method && (
          <section className="py-8 bg-accent/10">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="flex items-center justify-center gap-2">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  <span className="font-medium">Contact :</span>
                  <span className="text-muted-foreground">{profile.contact_method}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Contenu principal */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-8">
              {profile.biography && (
                <Card className="shadow-card">
                  <CardContent className="p-8 space-y-4">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                      <Mail className="h-8 w-8 text-primary" />
                      Biographie
                    </h2>
                    <p className="text-lg leading-relaxed whitespace-pre-line">{profile.biography}</p>
                  </CardContent>
                </Card>
              )}
              {profile.career_path && (
                <Card className="shadow-card">
                  <CardContent className="p-8 space-y-4">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                      <GraduationCap className="h-8 w-8 text-primary" />
                      Parcours
                    </h2>
                    <p className="text-lg leading-relaxed whitespace-pre-line">{profile.career_path}</p>
                  </CardContent>
                </Card>
              )}
              {profile.anecdote && (
                <Card className="shadow-card bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                  <CardContent className="p-8 space-y-4">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                      <Lightbulb className="h-8 w-8 text-accent" />
                      Anecdote
                    </h2>
                    <p className="text-lg leading-relaxed whitespace-pre-line italic">{profile.anecdote}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Fiches par année */}
        {yearEntries.length > 0 && (
          <section className="py-8 pb-16 bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto space-y-3">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <History className="h-6 w-6 text-primary" />
                  Au BDL — par année
                </h2>
                {yearEntries.map((entry) => {
                  const isOpen = openYear === entry.year_id;
                  const hasContent = entry.biography || entry.career_path || entry.anecdote;
                  return (
                    <div
                      key={entry.year_id}
                      id={entry.year_label}
                      ref={(el) => { yearRefs.current[entry.year_id] = el; }}
                      className="rounded-xl border bg-card shadow-sm overflow-hidden scroll-mt-20"
                    >
                      <button
                        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${hasContent ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"}`}
                        onClick={() => handleToggleYear(entry)}
                        aria-expanded={isOpen}
                        disabled={!hasContent}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={entry.is_current ? "default" : "secondary"}
                            className="text-sm font-medium px-3 py-1"
                          >
                            {entry.year_label}
                          </Badge>
                          {entry.role && (
                            <span className="text-sm text-muted-foreground">
                              {formatRole(entry.role)}
                            </span>
                          )}
                        </div>
                        {hasContent && (
                          <span className="text-xs text-muted-foreground">
                            {isOpen ? "Réduire ↑" : "Voir détails ↓"}
                          </span>
                        )}
                      </button>

                      {isOpen && hasContent && (
                        <div className="border-t px-5 pb-5 pt-4 space-y-4">
                          {entry.biography && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Biographie</p>
                              <p className="text-sm leading-relaxed whitespace-pre-line">{entry.biography}</p>
                            </div>
                          )}
                          {entry.career_path && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Parcours</p>
                              <p className="text-sm leading-relaxed whitespace-pre-line">{entry.career_path}</p>
                            </div>
                          )}
                          {entry.anecdote && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Anecdote</p>
                              <p className="text-sm leading-relaxed italic whitespace-pre-line">{entry.anecdote}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

export default BDLMemberProfile;
