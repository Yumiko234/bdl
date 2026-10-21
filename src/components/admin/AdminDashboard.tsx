import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { roleLabel, getPrimaryRole, rolePrecedence, type RoleKey } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Vote, Headphones, Newspaper, TrendingUp, Clock, UserPlus, BarChart2 } from "lucide-react";

const getGreeting = () => {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h >= 5.5 && h < 13) return "Bonjour";
  if (h >= 13 && h < 18) return "Bon après-midi";
  return "Bonsoir";
};

interface Stats {
  members: number;
  openScrutins: number;
  pendingTickets: number;
  latestNews: { title: string; published_at: string } | null;
  totalUsers: number;
  openSurveys: number;
  newUsersThisWeek: number;
  openScrutinVotes: number;
  publishedNews: number;
}

interface RecentUser {
  first_name: string | null;
  last_name: string | null;
  class_name: string | null;
  created_at: string;
}

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGreeting, setUserGreeting] = useState<{ firstName: string; role: RoleKey } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data: rolesData }) => {
        const roles = (rolesData ?? []).map((r: { role: string }) => r.role);
        const primary = getPrimaryRole(roles);
        setUserGreeting({ firstName: data?.first_name ?? "", role: primary });
      });
    });
  }, [user]);

  useEffect(() => {
    const load = async () => {
      try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [
          { count: members },
          { count: openScrutins },
          { count: pendingTickets },
          { data: latestNewsData },
          { count: totalUsers },
          { count: openSurveys },
          { count: newUsersThisWeek },
          { count: openScrutinVotes },
          { count: publishedNews },
          { data: recentUsersData },
        ] = await Promise.all([
          supabase.from("bdl_members").select("*", { count: "exact", head: true }),
          supabase.from("scrutins").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("news").select("title, published_at").order("published_at", { ascending: false }).limit(1),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("surveys").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
          supabase.from("scrutin_votes").select("scrutin_id, scrutins!inner(status)", { count: "exact", head: true }).eq("scrutins.status", "open"),
          supabase.from("news").select("*", { count: "exact", head: true }).not("published_at", "is", null),
          supabase.from("profiles").select("first_name, last_name, class_name, created_at").order("created_at", { ascending: false }).not("first_name", "is", null).not("last_name", "is", null).limit(5),
        ]);

        setStats({
          members: members ?? 0,
          openScrutins: openScrutins ?? 0,
          pendingTickets: pendingTickets ?? 0,
          latestNews: latestNewsData?.[0] ?? null,
          totalUsers: totalUsers ?? 0,
          openSurveys: openSurveys ?? 0,
          newUsersThisWeek: newUsersThisWeek ?? 0,
          openScrutinVotes: openScrutinVotes ?? 0,
          publishedNews: publishedNews ?? 0,
        });
        setRecentUsers(recentUsersData ?? []);
      } catch (err) {
        console.error("Erreur chargement dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = stats ? [
    {
      label: "Membres BDL",
      value: stats.members,
      icon: <Users className="h-5 w-5 text-primary" />,
      section: "bdl-members",
      color: "bg-primary/10",
    },
    {
      label: "Comptes inscrits",
      value: stats.totalUsers,
      icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
      section: "users",
      color: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Nouveaux cette semaine",
      value: stats.newUsersThisWeek,
      icon: <UserPlus className="h-5 w-5 text-indigo-600" />,
      section: "users",
      color: "bg-indigo-50 dark:bg-indigo-900/20",
      badge: stats.newUsersThisWeek > 0 ? { label: "+7j", variant: "secondary" as const } : undefined,
    },
    {
      label: "Scrutins ouverts",
      value: stats.openScrutins,
      icon: <Vote className="h-5 w-5 text-green-600" />,
      section: "scrutin",
      color: "bg-green-50 dark:bg-green-900/20",
      badge: stats.openScrutins > 0 ? { label: "En cours", variant: "default" as const } : undefined,
    },
    {
      label: "Votes en cours",
      value: stats.openScrutinVotes,
      icon: <BarChart2 className="h-5 w-5 text-emerald-600" />,
      section: "scrutin",
      color: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Tickets en attente",
      value: stats.pendingTickets,
      icon: <Headphones className="h-5 w-5 text-amber-600" />,
      section: "support",
      color: "bg-amber-50 dark:bg-amber-900/20",
      badge: stats.pendingTickets > 0 ? { label: "À traiter", variant: "secondary" as const } : undefined,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Bloc de bienvenue */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}{userGreeting?.firstName ? `, ${userGreeting.firstName}` : ""} 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {userGreeting ? (
              <Badge variant="secondary">{roleLabel(userGreeting.role)}</Badge>
            ) : (
              <Skeleton className="h-5 w-24" />
            )}
            {user?.email && (
              <span className="text-xs text-muted-foreground">{user.email}</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de l'activité BDL</p>
      </div>

      {userGreeting && rolePrecedence[userGreeting.role] > 5 && (
        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
          Bienvenue dans l'espace d'administration. Les statistiques détaillées sont réservées aux responsables BDL.
        </p>
      )}

      {/* Stat cards — réservés aux rangs ≤ 5 (communication_manager et au-dessus) */}
      {(!userGreeting || rolePrecedence[userGreeting.role] <= 5) && <>{/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          : statCards.map((c) => (
              <Card
                key={c.label}
                className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/${c.section}`)}
              >
                <CardContent className="p-5 space-y-2">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.color}`}>
                    {c.icon}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{c.value}</span>
                    {c.badge && (
                      <Badge variant={c.badge.variant} className="mb-1 text-[10px]">
                        {c.badge.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Actu + sondages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/news")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Dernière actualité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : stats?.latestNews ? (
              <>
                <p className="font-medium line-clamp-2">{stats.latestNews.title}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(stats.latestNews.published_at).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune actualité publiée</p>
            )}
          </CardContent>
        </Card>

        <Card
          className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/news")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Articles publiés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-3xl font-bold">{stats?.publishedNews ?? 0}</span>
            )}
          </CardContent>
        </Card>

        <Card
          className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/surveys")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sondages actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{stats?.openSurveys ?? 0}</span>
                {(stats?.openSurveys ?? 0) > 0 && (
                  <Badge className="mb-1 bg-green-600 text-white text-[10px]">En ligne</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dernières inscriptions */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Dernières inscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun compte enregistré</p>
          ) : (
            <div className="divide-y">
              {recentUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {(u.first_name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {u.first_name ?? "–"} {u.last_name ?? ""}
                    </span>
                    {u.class_name && (
                      <span className="text-xs text-muted-foreground">{u.class_name}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      </>}

      {/* Accès rapides */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Accès rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Publier une actu", section: "news" },
              { label: "Ouvrir un scrutin", section: "scrutin" },
              { label: "Gérer les membres", section: "bdl-members" },
              { label: "Voir le support", section: "support" },
              { label: "Documents", section: "documents" },
            ].map((a) => (
              <button
                key={a.section}
                onClick={() => navigate(`/admin/${a.section}`)}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
