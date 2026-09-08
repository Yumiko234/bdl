import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Pin, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const readingTime = (html: string): number => {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { safeHtml } from "@/lib/sanitize";

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

const Actualites = () => {
  useSEO({
    title: "Actualités – Bureau des Lycéens",
    description: "Toutes les actualités du Bureau des Lycéens du Lycée Saint-André.",
    url: "/actualites",
  });
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Toutes");

  useEffect(() => {
    const fetchNews = async () => {
      document.title = "Actualités – Bureau des Lycéens";
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) {
        console.error("Error fetching news:", error);
      } else {
        setNews(data as unknown as NewsArticle[]);
      }
      setLoading(false);
    };

    fetchNews();
  }, []);

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
                      {cat}
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
                filteredNews.map((item) => (
                  <Card
                    key={item.id}
                    id={`article-${item.id}`}
                    className={`shadow-card ${
                      item.is_important || item.is_pinned ? "border-2 border-accent" : ""
                    }`}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary">{item.category}</Badge>
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
                      </div>

                      <h3 className="text-2xl font-bold">{item.title}</h3>
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={safeHtml(item.content)}
                      />

                      <div className="pt-4 border-t flex items-center justify-between gap-3">
                        {item.author_name ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={item.author_avatar || undefined} />
                              <AvatarFallback>
                                {item.author_name.charAt(0).toUpperCase()}
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
                ))
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
