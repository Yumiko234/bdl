import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import {
  Newspaper, Calendar, FileText, Vote, BarChart3,
  BookMarked, Headphones, UserCircle, Building2,
  LogOut, Shield, Loader2, ChevronRight,
  CalendarDays, BookOpen, Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

// ─── Helpers & Logic ──────────────────────────────────────────────────────────

const ROLE_KEYS = [
  "president", "vice_president", "secretary_general",
  "communication_manager", "bdl_member", "student",
] as const;
type RoleKey = typeof ROLE_KEYS[number];

const rolePrecedence: Record<RoleKey, number> = {
  president: 1, vice_president: 2, secretary_general: 3,
  communication_manager: 4, bdl_member: 5, student: 6,
};

const roleLabel = (r: string) =>
  r === "president"             ? "Président"           :
  r === "vice_president"        ? "Vice-Présidente"     :
  r === "secretary_general"     ? "Secrétaire Générale" :
  r === "communication_manager" ? "Dir. Communication"  :
  r === "bdl_member"            ? "Membre BDL"          : "Étudiant";

const getPrimaryRole = (roles: string[]): RoleKey => {
  if (!roles.length) return "student";
  return roles.reduce((best, r) => {
    const rk = ROLE_KEYS.includes(r as RoleKey) ? (r    as RoleKey) : "student";
    const bk = ROLE_KEYS.includes(best as RoleKey) ? (best as RoleKey) : "student";
    return rolePrecedence[rk] < rolePrecedence[bk] ? rk : bk;
  }, roles[0]) as RoleKey;
};

/**
 * Détermine la salutation en fonction de l'heure
 * 5h30 - 13h : Bonjour
 * 13h - 18h : Bon après-midi
 * 18h - 5h30 : Bonsoir
 */
const getGreeting = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;

  if (currentTime >= 5.5 && currentTime < 13) {
    return "Bonjour";
  } else if (currentTime >= 13 && currentTime < 18) {
    return "Bon après-midi";
  } else {
    return "Bonsoir";
  }
};

// ─── Quick-access card definition ─────────────────────────────────────────────

interface QuickCard {
  title:       string;
  description: string;
  icon:        React.ReactNode;
  href:        string;
  color:       string;          // Tailwind bg classes for the icon bubble
  external?:   boolean;
  bdlOnly?:    boolean;         // only show to BDL members+
}

const PUBLIC_CARDS: QuickCard[] = [
  {
    title:       "Actualités",
    description: "Les dernières nouvelles du lycée et du BDL.",
    icon:        <Newspaper   className="h-6 w-6" />,
    href:        "/actualites",
    color:       "bg-blue-100 text-blue-700",
  },
  {
    title:       "Événements",
    description: "Agenda des événements à venir.",
    icon:        <Calendar    className="h-6 w-6" />,
    href:        "/events",
    color:       "bg-violet-100 text-violet-700",
  },
  {
    title:       "Calendrier",
    description: "Calendrier scolaire et dates importantes.",
    icon:        <CalendarDays className="h-6 w-6" />,
    href:        "/calendrier",
    color:       "bg-indigo-100 text-indigo-700",
  },
  {
    title:       "Documents",
    description: "Règlements, formulaires et comptes-rendus.",
    icon:        <FileText    className="h-6 w-6" />,
    href:        "/documents",
    color:       "bg-amber-100 text-amber-700",
  },
  {
    title:       "Scrutins",
    description: "Votes et scrutins ouverts.",
    icon:        <Vote        className="h-6 w-6" />,
    href:        "/scrutin",
    color:       "bg-emerald-100 text-emerald-700",
  },
  {
    title:       "Sondages",
    description: "Donnez votre avis sur les projets du BDL.",
    icon:        <BarChart3   className="h-6 w-6" />,
    href:        "/sondage",
    color:       "bg-pink-100 text-pink-700",
  },
  {
    title:       "Journal Officiel",
    description: "Publications officielles du Bureau des Lycéens.",
    icon:        <BookMarked  className="h-6 w-6" />,
    href:        "/jo",
    color:       "bg-yellow-100 text-yellow-700",
  },
  {
    title:       "Le BDL",
    description: "Découvrez les membres et la mission du BDL.",
    icon:        <BookOpen    className="h-6 w-6" />,
    href:        "/bdl",
    color:       "bg-cyan-100 text-cyan-700",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Intranet = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [userRoles,   setUserRoles]   = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<RoleKey>("student");
  const [loading,     setLoading]     = useState(true);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // ── Load profile & roles ────────────────────────────────────────────────
  useEffect(() => {
    document.title = "Intranet – Bureau des Lycéens";
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: profileData }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("full_name, email, avatar_url").eq("id", user!.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);

      if (profileData) setProfile(profileData as any);

      const roles = (rolesData || []).map((r: any) => r.role);
      setUserRoles(roles);
      setPrimaryRole(getPrimaryRole(roles));
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const isBDLMember = rolePrecedence[primaryRole] <= 5 && primaryRole !== "student";
  const isStaff     = rolePrecedence[primaryRole] <= 4;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Loading state ───────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <MaintenanceOverlay>
        <main className="flex-1">

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section className="gradient-institutional text-white py-14">
            <div className="container mx-auto px-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Avatar */}
                <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-elegant ring-4 ring-white/30 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(profile?.full_name ?? "?")
                  )}
                </div>

                {/* Info */}
                <div className="text-center sm:text-left space-y-1">
                  <p className="text-white/70 text-sm uppercase tracking-widest font-medium">
                    Espace Intranet
                  </p>
                  <h1 className="text-3xl font-bold">
                    {getGreeting()}, {profile?.full_name?.split(" ")[0] ?? "—"} 👋
                  </h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {roleLabel(primaryRole)}
                    </Badge>
                    <span className="text-white/60 text-sm">{profile?.email}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="sm:ml-auto flex gap-2 flex-wrap justify-center">
                  <Link to="/profile">
                    <Button variant="outline" className="border-green/40 text-black hover:bg-white/10 gap-2">
                      <UserCircle className="h-4 w-4" />
                      Mon profil
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="border-green/40 text-black hover:bg-white/10 gap-2"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12 max-w-6xl space-y-12">

            {/* ── Support ──────────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  Support & Demandes
                </h2>
              </div>

              <Link to="/support">
                <div className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/50 hover:shadow-elegant transition-all duration-300 cursor-pointer">
                  <div className="p-6 flex items-center gap-5">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Headphones className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        Accéder au support
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Posez une question, signalez un problème ou demandez une audience auprès du BDL.
                        Suivez vos demandes et échangez directement avec le Bureau.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-background rounded-full px-2.5 py-1 border font-medium">
                          💬 Support général
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-background rounded-full px-2.5 py-1 border font-medium">
                          🎤 Demande d'audience
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs bg-background rounded-full px-2.5 py-1 border font-medium">
                          📬 Suivi en temps réel
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </section>

            {/* ── Admin access (BDL staff only) ────────────────────────── */}
            {isBDLMember && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Administration
                  </h2>
                </div>

                <Link to="/admin">
                  <div className="group relative overflow-hidden rounded-2xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-50 to-yellow-50 hover:border-amber-400/70 hover:shadow-elegant transition-all duration-300 cursor-pointer">
                    <div className="p-6 flex items-center gap-5">
                      <div className="h-14 w-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                        <Lock className="h-7 w-7 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-amber-800 transition-colors">
                          Panneau d'administration
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Gérez les actualités, événements, documents, scrutins, sondages, membres du BDL et bien plus.
                        </p>
                        <Badge className="mt-3 bg-amber-100 text-amber-800 border-amber-300">
                          {roleLabel(primaryRole)}
                        </Badge>
                      </div>
                      <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-amber-700 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* ── Quick access grid ────────────────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold mb-5">Accès rapide</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {PUBLIC_CARDS.map((card) => (
                  <Link key={card.href} to={card.href}>
                    <div className="group h-full rounded-xl border bg-card hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 cursor-pointer p-5 flex flex-col gap-3">
                      <div className={`h-10 w-10 rounded-lg ${card.color} flex items-center justify-center`}>
                        {card.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-end">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

          </div>
        </main>
      </MaintenanceOverlay>

      <Footer />
    </div>
  );
};

export default Intranet;