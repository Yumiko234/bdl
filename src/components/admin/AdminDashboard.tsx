import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Vote, Headphones, Newspaper, TrendingUp, Clock } from "lucide-react";

interface Stats {
  members: number;
  openScrutins: number;
  pendingTickets: number;
  latestNews: { title: string; published_at: string } | null;
  totalUsers: number;
  openSurveys: number;
}

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          { count: members },
          { count: openScrutins },
          { count: pendingTickets },
          { data: latestNewsData },
          { count: totalUsers },
          { count: openSurveys },
        ] = await Promise.all([
          supabase.from("bdl_members").select("*", { count: "exact", head: true }),
          supabase.from("scrutins").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("news").select("title, published_at").order("published_at", { ascending: false }).limit(1),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("surveys").select("*", { count: "exact", head: true }).eq("status", "open"),
        ]);

        setStats({
          members: members ?? 0,
          openScrutins: openScrutins ?? 0,
          pendingTickets: pendingTickets ?? 0,
          latestNews: latestNewsData?.[0] ?? null,
          totalUsers: totalUsers ?? 0,
          openSurveys: openSurveys ?? 0,
        });
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
      label: "Scrutins ouverts",
      value: stats.openScrutins,
      icon: <Vote className="h-5 w-5 text-green-600" />,
      section: "scrutin",
      color: "bg-green-50 dark:bg-green-900/20",
      badge: stats.openScrutins > 0 ? { label: "En cours", variant: "default" as const } : undefined,
    },
    {
      label: "Tickets en attente",
      value: stats.pendingTickets,
      icon: <Headphones className="h-5 w-5 text-amber-600" />,
      section: "support",
      color: "bg-amber-50 dark:bg-amber-900/20",
      badge: stats.pendingTickets > 0 ? { label: "À traiter", variant: "secondary" as const } : undefined,
    },
    {
      label: "Comptes inscrits",
      value: stats.totalUsers,
      icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
      section: "users",
      color: "bg-blue-50 dark:bg-blue-900/20",
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de l'activité BDL</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
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

      {/* Dernière actu + sondages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          className="shadow-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/news")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Dernière actualité publiée
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
