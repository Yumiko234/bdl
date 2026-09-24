import { useState, useEffect, useCallback } from "react";
import { useSEO } from "@/hooks/useSEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Pin, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { safeHtml } from "@/lib/sanitize";

const CATEGORY_LABELS: Record<string, string> = {
  actualites: "Actualités",
  evenements: "Événements",
  bdl: "BDL",
  public: "Public",
  authenticated: "Connectés",
  bdl_only: "BDL seulement",
};
const catLabel = (c: string) => CATEGORY_LABELS[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

const readingTime = (html: string): number => {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const EMOJIS = ["👍", "❤️", "🎉", "😮"] as const;
type Emoji = typeof EMOJIS[number];

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  is_important: boolean;
  is_pinned: boolean;
  published_at: string;
  author_name: string | null;
  author_role: string | null;
  author_avatar: string | null;
}

// reactions[newsId][emoji] = [prénom1, prénom2, ...]
type ReactionsMap = Record<string, Record<string, string[]>>;
// myReactions[newsId] = Set des emojis posés par l'utilisateur connecté
type MyReactionsMap = Record<string, Set<string>>;

const roleLabels: Record<string, string> = {
  "administrator": "Administrateur",
  "president": "Président",
  "presidente": "Présidente",
  "vice_president": "Vice-Président",
  "vice_presidente": "Vice-Présidente",
  "secretary_general": "Secrétaire Général",
  "secretary_general2": "Secrétaire Générale",
  "communication_manager": "Directeur de la Communication et de la Communauté",
  "communication_manager2": "Directrice de la Communication et de la Communauté",
};

// ─── Barre de réactions ────────────────────────────────────────────────────────

function ReactionBar({
  newsId,
  reactions,
  myReactions,
  onToggle,
  connected,
}: {
  newsId: string;
  reactions: ReactionsMap;
  myReactions: MyReactionsMap;
  onToggle: (newsId: string, emoji: Emoji) => void;
  connected: boolean;
}) {
  const articleReactions = reactions[newsId] ?? {};
  const mySet = myReactions[newsId] ?? new Set<string>();

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJIS.map((emoji) => {
        const names = articleReactions[emoji] ?? [];
        const count = names.length;
        const isMine = mySet.has(emoji);

        const btn = (
          <button
            key={emoji}
            onClick={() => connected && onToggle(newsId, emoji)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm transition-all select-none
              ${isMine
                ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                : count > 0
                  ? "bg-muted border-border text-foreground hover:bg-muted/70"
                  : "bg-transparent border-border/50 text-muted-foreground hover:bg-muted/40"
              }
              ${!connected ? "cursor-default" : "cursor-pointer active:scale-90"}
            `}
            aria-label={`${emoji} ${count}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
          </button>
        );

        if (!connected) {
          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Connectez-vous pour réagir</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        if (count === 0) return btn;

        const label = names.length <= 3
          ? names.join(", ")
          : `${names.slice(0, 3).join(", ")} +${names.length - 3}`;

        return (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs max-w-[200px] text-center">{label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const Actualites = () => {
  useSEO({
    title: "Actualités – Bureau des Lycéens",
    description: "Toutes les actualités du Bureau des Lycéens du Lycée Saint-André.",
    url: "/actualites",
  });
  const { user } = useAuth();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Toutes");
  const [reactions, setReactions] = useState<ReactionsMap>({});
  const [myReactions, setMyReactions] = useState<MyReactionsMap>({});

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) {
        toast.error("Erreur lors du chargement des actualités");
      } else {
        setNews((data ?? []) as NewsArticle[]);
      }
      setLoading(false);
    };

    fetchNews();
  }, []);

  // Charge les réactions une fois les articles connus
  const loadReactions = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    const [{ data: rawReactions }, { data: myRaw }] = await Promise.all([
      supabase.from("news_reactions").select("news_id, emoji, user_id").in("news_id", ids),
      user
        ? supabase.from("news_reactions").select("news_id, emoji").in("news_id", ids).eq("user_id", user.id)
        : Promise.resolve({ data: [] as { news_id: string; emoji: string }[] }),
    ]);

    // Récupère les prénoms de tous les réacteurs
    const userIds = Array.from(new Set((rawReactions ?? []).map((r: { user_id: string }) => r.user_id)));
    const nameById: Record<string, string> = {};
    if (userIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      (profiles ?? []).forEach((p: { id: string; full_name: string }) => { nameById[p.id] = p.full_name; });
    }

    // Construit la map reactions[newsId][emoji] = [prénom…]
    const map: ReactionsMap = {};
    (rawReactions ?? []).forEach((r: { news_id: string; emoji: string; user_id: string }) => {
      if (!map[r.news_id]) map[r.news_id] = {};
      if (!map[r.news_id][r.emoji]) map[r.news_id][r.emoji] = [];
      map[r.news_id][r.emoji].push(nameById[r.user_id] ?? "Quelqu'un");
    });
    setReactions(map);

    // Construit myReactions[newsId] = Set<emoji>
    const mine: MyReactionsMap = {};
    (myRaw ?? []).forEach((r: { news_id: string; emoji: string }) => {
      if (!mine[r.news_id]) mine[r.news_id] = new Set();
      mine[r.news_id].add(r.emoji);
    });
    setMyReactions(mine);
  }, [user]);

  useEffect(() => {
    if (!loading && news.length) {
      loadReactions(news.map((n) => n.id));
    }
  }, [loading, news, loadReactions]);

  useEffect(() => {
    if (!loading && window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading]);

  const handleToggleReaction = async (newsId: string, emoji: Emoji) => {
    if (!user) return;
    const isMine = myReactions[newsId]?.has(emoji);

    // Optimistic update
    setReactions((prev) => {
      const updated = { ...prev };
      if (!updated[newsId]) updated[newsId] = {};
      const names = updated[newsId][emoji] ? [...updated[newsId][emoji]] : [];
      const myName = user.user_metadata?.full_name ?? "Vous";
      if (isMine) {
        updated[newsId] = { ...updated[newsId], [emoji]: names.filter((n) => n !== myName) };
      } else {
        updated[newsId] = { ...updated[newsId], [emoji]: [...names, myName] };
      }
      return updated;
    });
    setMyReactions((prev) => {
      const set = new Set(prev[newsId] ?? []);
      isMine ? set.delete(emoji) : set.add(emoji);
      return { ...prev, [newsId]: set };
    });

    if (isMine) {
      const { error } = await supabase
        .from("news_reactions")
        .delete()
        .eq("news_id", newsId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
      if (error) { toast.error("Erreur"); loadReactions([newsId]); }
    } else {
      const { error } = await supabase
        .from("news_reactions")
        .insert({ news_id: newsId, user_id: user.id, emoji });
      if (error) { toast.error("Erreur"); loadReactions([newsId]); }
    }
  };

  const categories = ["Toutes", ...Array.from(new Set(news.map((n) => n.category).filter(Boolean)))];
  const filteredNews = activeCategory === "Toutes" ? news : news.filter((n) => n.category === activeCategory);

  const getRoleLabel = (role: string | null): string | null => {
    if (!role) return null;
    return roleLabels[role] || role;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <MaintenanceOverlay>
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <nav className="text-xs text-white/60 flex items-center gap-1.5 flex-wrap mb-6">
              <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90 font-medium">Actualités</span>
            </nav>
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Actualités & Communications</h1>
              <p className="text-xl">Restez informé de la vie du lycée et du BDL</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold">Dernières Actualités</h2>

              {/* Filtres catégories */}
              {!loading && categories.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {cat === "Toutes" ? "Toutes" : catLabel(cat)}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-card">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-20 rounded-full" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-7 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredNews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune actualité pour le moment</p>
              ) : (
                <TooltipProvider delayDuration={200}>
                  {filteredNews.map((item) => (
                    <Card
                      key={item.id}
                      id={`article-${item.id}`}
                      className={`shadow-card mb-6 ${
                        item.is_important || item.is_pinned ? "border-2 border-accent" : ""
                      }`}
                    >
                      <CardContent className="p-6 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="secondary">{catLabel(item.category)}</Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(item.published_at).toLocaleDateString("fr-FR")}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {readingTime(item.content)} min de lecture
                          </div>
                          {item.is_pinned && (
                            <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                              <Pin className="h-3 w-3" />
                              Épinglé
                            </Badge>
                          )}
                          {item.is_important && (
                            <Badge className="bg-accent text-secondary">Important</Badge>
                          )}
                          {(Date.now() - new Date(item.published_at).getTime()) < 7 * 24 * 60 * 60 * 1000 && (
                            <Badge className="bg-green-600 text-white">Nouveau</Badge>
                          )}
                        </div>

                        <h3 className="text-2xl font-bold">{item.title}</h3>
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={safeHtml(item.content)}
                        />

                        {/* Réactions */}
                        <ReactionBar
                          newsId={item.id}
                          reactions={reactions}
                          myReactions={myReactions}
                          onToggle={handleToggleReaction}
                          connected={!!user}
                        />

                        <div className="pt-4 border-t flex items-center justify-between gap-3">
                          {item.author_name ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={item.author_avatar || undefined} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                  {item.author_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{item.author_name}</div>
                                {item.author_role && (
                                  <div className="text-sm text-muted-foreground">
                                    {getRoleLabel(item.author_role)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : <span />}
                          <button
                            onClick={async () => {
                              const url = `${window.location.origin}/actualites#article-${item.id}`;
                              if (navigator.share) {
                                try { await navigator.share({ title: item.title, url }); } catch {}
                              } else {
                                await navigator.clipboard.writeText(url);
                                toast.success("Lien copié !");
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Partager
                          </button>
                        </div>

                      </CardContent>
                    </Card>
                  ))}
                </TooltipProvider>
              )}
            </div>
          </div>
        </section>
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
};

export default Actualites;
