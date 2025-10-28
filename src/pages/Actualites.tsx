import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  "president": "Président",
  "vice_president": "Vice-Présidente",
  "secretary_general": "Secrétaire Générale",
  "communication_manager": "Responsable Communication",
};

const Actualites = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
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

  const getRoleLabel = (role: string | null): string | null => {
    if (!role) return null;
    return roleLabels[role] || role;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
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
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Chargement...</p>
              ) : news.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune actualité pour le moment</p>
              ) : (
                news.map((item) => (
                  <Card
                    key={item.id}
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
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />

                      {item.author_name && (
                        <div className="pt-4 border-t flex items-center gap-3">
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
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Actualites;
