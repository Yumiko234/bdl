import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import {
  Newspaper, Calendar, FileText, Vote, BarChart3,
  BookMarked, BookUser, Headphones, UserCircle, Building2,
  LogOut, Shield, Loader2, ChevronRight, ChevronDown,
  CalendarDays, BookOpen, Lock, Pin, Scale
} from "lucide-react";

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface InternalNote {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author_name?: string;
}

const ROLE_KEYS = [
  "administrator",
  "president", "presidente",
  "vice_president", "vice_presidente",
  "secretary_general", "secretary_general2",
  "communication_manager", "communication_manager2",
  "bdl_member", "vie_scolaire",
  "student",
] as const;
type RoleKey = typeof ROLE_KEYS[number];

const rolePrecedence: Record<RoleKey, number> = {
  administrator: 1,
  president: 2,
  presidente: 2,
  vice_president: 3,
  vice_presidente: 3,
  secretary_general: 4,
  secretary_general2: 4,
  communication_manager: 5,
  communication_manager2: 5,
  bdl_member: 6,
  vie_scolaire: 7,
  student: 8
};

const roleLabel = (r: string) =>
  r === "administrator"          ? "Administrateur" :
  r === "president"              ? "Président" :
  r === "presidente"             ? "Présidente" :
  r === "vice_president"         ? "Vice-président" :
  r === "vice_presidente"        ? "Vice-présidente" :
  r === "secretary_general"      ? "Secrétaire Général" :
  r === "secretary_general2"     ? "Secrétaire Générale" :
  r === "communication_manager"  ? "Directeur de la Communauté et de la Communication" :
  r === "communication_manager2" ? "Directrice de la Communauté et de la Communication" :
  r === "vie_scolaire"           ? "Vie Scolaire" :
  r === "bdl_member"             ? "Membre BDL" : "Étudiant";


const getPrimaryRole = (roles: string[]): RoleKey => {
  if (!roles.length) return "student";
  return roles.reduce((best, r) => {
    const rk = ROLE_KEYS.includes(r as RoleKey) ? (r    as RoleKey) : "student";
    const bk = ROLE_KEYS.includes(best as RoleKey) ? (best as RoleKey) : "student";
    return rolePrecedence[rk] < rolePrecedence[bk] ? rk : bk;
  }, roles[0]) as RoleKey;
};

const getGreeting = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;
  if (currentTime >= 5.5 && currentTime < 13) return "Bonjour";
  else if (currentTime >= 13 && currentTime < 18) return "Bon après-midi";
  else return "Bonsoir";
};

interface QuickCard {
  title:       string;
  description: string;
  icon:        React.ReactNode;
  href:        string;
  color:       string;
}

const PUBLIC_CARDS: QuickCard[] = [
  { title: "Centre Juridique",        description: "Accédez aux documents légaux.",                                icon: <Scale        className="h-6 w-6" />, href: "/legal",            color: "bg-primary/10 text-primary" },
  { title: "Actualités",              description: "Les dernières nouvelles du lycée et du BDL.",                  icon: <Newspaper    className="h-6 w-6" />, href: "/actualites",       color: "bg-accent/20 text-foreground" },
  { title: "Événements",              description: "Agenda des événements à venir.",                               icon: <Calendar     className="h-6 w-6" />, href: "/events",           color: "bg-primary/10 text-primary" },
  { title: "Calendrier",              description: "Calendrier scolaire et dates importantes.",                    icon: <CalendarDays className="h-6 w-6" />, href: "/calendrier",       color: "bg-accent/20 text-foreground" },
  { title: "Documents",               description: "Règlements, formulaires et comptes-rendus.",                   icon: <FileText     className="h-6 w-6" />, href: "/documents",        color: "bg-primary/10 text-primary" },
  { title: "Scrutins",                description: "Votes et scrutins ouverts.",                                   icon: <Vote         className="h-6 w-6" />, href: "/scrutin",          color: "bg-accent/20 text-foreground" },
  { title: "Sondages",                description: "Donnez votre avis sur les projets du BDL.",                    icon: <BarChart3    className="h-6 w-6" />, href: "/sondage",          color: "bg-primary/10 text-primary" },
  { title: "Journal Officiel",        description: "Publications officielles du Bureau des Lycéens.",              icon: <BookMarked   className="h-6 w-6" />, href: "/jo",               color: "bg-accent/20 text-foreground" },
  { title: "Le BDL",                  description: "Découvrez les membres et la mission du BDL.",                  icon: <BookOpen     className="h-6 w-6" />, href: "/bdl",              color: "bg-primary/10 text-primary" },
  { title: "Salle de Conférence",     description: "Conférence du BDL concernant la vie de l'établissement.",      icon: <Headphones   className="h-6 w-6" />, href: "/conference",       color: "bg-accent/20 text-foreground" },
  { title: "Certificat BDL",          description: "Vérifiez la validité d'un certificat émis par le Bureau.",     icon: <BookUser     className="h-6 w-6" />, href: "/certificat-verif", color: "bg-primary/10 text-primary" },
];

const Intranet = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [userRoles,   setUserRoles]   = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<RoleKey>("student");
  const [loading,     setLoading]     = useState(true);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    document.title = "Intranet – Bureau des Lycéens";
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: profileData }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, avatar_url").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);

      if (profileData) setProfile(profileData as any);

      const roles = (rolesData || []).map((r: any) => r.role);
      setUserRoles(roles);
      const primary = getPrimaryRole(roles);
      setPrimaryRole(primary);

      const bdlMember = rolePrecedence[primary] <= 6 && primary !== "student";
      if (bdlMember) await loadInternalNotes();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const loadInternalNotes = async () => {
    const { data, error } = await supabase
      .from("bdl_internal_notes" as any)
      .select("id, title, content, is_pinned, created_at, author_id")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("loadInternalNotes:", error);
      return;
    }

    const rows = (data || []) as any[];
    const authorIds = Array.from(new Set(rows.map((n) => n.author_id).filter(Boolean)));

    let namesById: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      namesById = Object.fromEntries((profs || []).map((p: any) => [p.id, p.full_name]));
    }

    setInternalNotes(rows.map((n) => ({ ...n, author_name: namesById[n.author_id] ?? "Exécutif" })));
  };

  // administrator est considéré comme BDL member (rang 0 ≤ 5)
  const isBDLMember = rolePrecedence[primaryRole] <= 6 && primaryRole !== "student";

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <MaintenanceOverlay>
        <main className="flex-1">
          {/* Hero */}
          <section className="gradient-institutional text-white py-14">
            <div className="container mx-auto px-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-elegant ring-4 ring-white/30 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} loading="lazy" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    getInitials(profile?.full_name ?? "?")
                  )}
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <p className="text-white/70 text-sm uppercase tracking-widest font-medium">Espace Intranet</p>
                  <h1 className="text-3xl font-bold">
                    {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "—"} 👋
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <Badge className={`border-white/30 ${primaryRole === 'administrator' ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white'}`}>
                      {primaryRole === 'administrator' && '👑 '}{roleLabel(primaryRole)}
                    </Badge>
                    <span className="text-white/60 text-sm">{profile?.email}</span>
                  </div>
                </div>

                <div className="sm:ml-auto flex gap-2 flex-wrap justify-center">
                  <Link to="/profile">
                    <Button variant="outline" className="border-white/40 text-black hover:bg-white/10 gap-2">
                      <UserCircle className="h-4 w-4" />
                      Mon profil
                    </Button>
                  </Link>
                  <Button variant="outline" className="border-white/40 text-black hover:bg-white/10 gap-2" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">

            {/* Onboarding : compléter le profil */}
            {!profile?.avatar_url && (
              <div className="flex items-center gap-4 p-4 rounded-xl border border-accent/40 bg-accent/10 flex-wrap">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-semibold text-sm">Complétez votre profil</p>
                  <p className="text-sm text-muted-foreground">Ajoutez une photo de profil pour personnaliser votre compte et être identifiable dans l'intranet.</p>
                </div>
                <Link to="/profile">
                  <Button size="sm" variant="outline" className="border-accent text-foreground hover:bg-accent/20 whitespace-nowrap">
                    Ajouter une photo
                  </Button>
                </Link>
              </div>
            )}

            {/* Notes internes de l'Exécutif */}
            {isBDLMember && internalNotes.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Pin className="h-5 w-5 text-primary" />
                    Annonces de l'Exécutif
                  </h2>
                </div>
                <div className="space-y-3">
                  {internalNotes.map((note) => (
                    <Card key={note.id} className={note.is_pinned ? "border-primary/40 bg-primary/5 shadow-card" : "shadow-card"}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                            {note.title}
                          </h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(note.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        <p className="text-xs text-muted-foreground/70 mt-2">— {note.author_name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Admin access (BDL staff + administrator) */}
            {isBDLMember && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Administration
                  </h2>
                </div>
                <div className="flex flex-col gap-6">
                  <Link to="/admin">
                    <div className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-primary/5 hover:border-primary/40 hover:shadow-elegant transition-all duration-300 cursor-pointer">
                      <div className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Panneau d'administration</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">Gérez les actualités, événements, documents, scrutins, sondages et membres du BDL.</p>
                          <Badge className="mt-2 bg-primary/10 text-primary border-primary/20 text-xs">
                            {primaryRole === 'administrator' && '👑 '}{roleLabel(primaryRole)}
                          </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </div>
                  </Link>

                  <Link to="/bdl-profile">
                    <div className="group relative overflow-hidden rounded-2xl border-2 border-accent/30 bg-accent/5 hover:border-accent/50 hover:shadow-elegant transition-all duration-300 cursor-pointer">
                      <div className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/30 transition-colors">
                          <Shield className="h-6 w-6 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground transition-colors">Suivi de mes actions</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {primaryRole === 'administrator'
                              ? "T'es plus là fréro."
                              : "Accéder au suivi de mes actions et notes de l'Exécutif."}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                </div>
              </section>
            )}

            {/* Support */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  Support & Demandes
                </h2>
              </div>
              <Link to="/support">
                <div className="group relative overflow-hidden rounded-2xl border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300 cursor-pointer bg-card">
                  <div className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Headphones className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">Accéder au support</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Posez une question, signalez un problème ou demandez une audience auprès du BDL.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </section>

            {/* Accès rapide — collapsible */}
            <section>
              <button
                onClick={() => setQuickAccessOpen(o => !o)}
                className="w-full flex items-center justify-between group"
              >
                <h2 className="text-xl font-bold group-hover:text-primary transition-colors">Accès rapide</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <span>{quickAccessOpen ? "Réduire" : "Afficher"}</span>
                  <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${quickAccessOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {quickAccessOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-5">
                  {PUBLIC_CARDS.map((card) => (
                    <Link key={card.href} to={card.href}>
                      <div className="group h-full rounded-xl border bg-card hover:shadow-card transition-all duration-200 hover:-translate-y-1 cursor-pointer p-5 flex flex-col gap-4">
                        <div className={`h-12 w-12 rounded-xl ${card.color} flex items-center justify-center`}>
                          <span className="text-xl">{card.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors leading-tight">{card.title}</h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

          </div>
        </main>
      </MaintenanceOverlay>

      <Footer />
    </div>
  );
};

export default Intranet;