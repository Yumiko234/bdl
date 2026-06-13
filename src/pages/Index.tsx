import { useState, useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { ChevronRight, FileText, Users, MessageCircle, AlertCircle, Vote, X, Headphones, Instagram, ExternalLink, Pin, BookUser } from "lucide-react";
import logo from "@/assets/logo-bdl.jpeg";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

// Fonction pour traduire les rôles
const translateRole = (role: string): string => {
  const roleTranslations: { [key: string]: string } = {
  administrator: "Administrateur",
  president: "Président",
  presidente: "Présidente",
  vice_president: "Vice-Président",
  vice_presidente: "Vice-Présidente",
  secretary_general: "Secrétaire Général",
  secretary_general2: "Secrétaire Générale",
  communication_manager: "Directeur de la Communication et de la Communauté",
  communication_manager2: "Directrice de la Communication et de la Communauté",
  bdl_member: "Membre du BDL",
  };

  return roleTranslations[role] || "Membre du BDL";
};

// ─── Instagram embed ──────────────────────────────────────────────────────────

interface InstagramPost {
  url: string;
  isPinned?: boolean;
}

const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    url: "https://www.instagram.com/bdllgsaintandre/",  // ← Remplacer par l'URL du dernier post
    isPinned: false,
  },
  {
    url: "https://www.instagram.com/bdllgsaintandre/",  // ← Remplacer par l'URL du post épinglé
    isPinned: true,
  },
];

const InstagramEmbed = ({ post }: { post: InstagramPost }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const processEmbeds = () => {
      if (typeof (window as any).instgrm !== "undefined") {
        (window as any).instgrm.Embeds.process();
        // Délai pour laisser l'iframe se monter
        const t = setTimeout(() => {
          if (cancelled) return;
          const iframe = containerRef.current?.querySelector("iframe");
          if (iframe) setLoaded(true);
          else setError(true);
        }, 3500);
        return () => clearTimeout(t);
      }
    };

    const existingScript = document.querySelector(
      'script[src="https://www.instagram.com/embed.js"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.defer = true;
      script.onload = () => { if (!cancelled) processEmbeds(); };
      script.onerror = () => { if (!cancelled) setError(true); };
      document.body.appendChild(script);
    } else {
      processEmbeds();
    }

    return () => { cancelled = true; };
  }, [post.url]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center rounded-xl bg-muted/30 border border-dashed min-h-[200px]">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
          <Instagram className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Aperçu indisponible</p>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Voir sur Instagram <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="relative min-h-[480px]">
      {/* Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full rounded-xl bg-muted/40 animate-pulse h-[460px] border" />
        </div>
      )}

      <div
        ref={containerRef}
        className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      >
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={post.url}
          data-instgrm-version="14"
          style={{
            background: "#FFF",
            border: "0",
            borderRadius: "12px",
            boxShadow: "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)",
            margin: "0 auto",
            maxWidth: "100%",
            minWidth: "326px",
            padding: "0",
            width: "100%",
          }}
        >
          <div style={{ padding: "16px" }}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ backgroundColor: "#F4F4F4", borderRadius: "50%", height: 40, marginRight: 14, width: 40 }} />
                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <div style={{ backgroundColor: "#F4F4F4", borderRadius: 4, height: 14, marginBottom: 6, width: 100 }} />
                  <div style={{ backgroundColor: "#F4F4F4", borderRadius: 4, height: 14, width: 60 }} />
                </div>
              </div>
              <div style={{ padding: "19% 0" }} />
              <p style={{ color: "#3897f0", fontFamily: "Arial,sans-serif", fontSize: 14, fontWeight: 550, lineHeight: "18px", paddingTop: 8 }}>
                Voir cette publication sur Instagram
              </p>
            </a>
            <p style={{ color: "#c9c8cd", fontFamily: "Arial,sans-serif", fontSize: 14, lineHeight: "17px", marginTop: 8, overflow: "hidden", padding: "8px 0 7px", textAlign: "center", whiteSpace: "nowrap" }}>
              <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: "#c9c8cd", fontFamily: "Arial,sans-serif", fontSize: 14, fontWeight: "normal", lineHeight: "17px", textDecoration: "none" }}>
                Une publication partagée par BDL Lycée Saint-André (@bdllgsaintandre)
              </a>
            </p>
          </div>
        </blockquote>
      </div>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

const Index = () => {
  const [presidentMessage, setPresidentMessage] = useState("");
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [latestEvents, setLatestEvents] = useState<any[]>([]);
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    document.title = "Bureau des Lycéens – Lycée Saint-André";
    loadPresidentMessage();
    loadLatestContent();
  }, []);

  const loadPresidentMessage = async () => {
    const { data } = await supabase
      .from("president_message")
      .select("content")
      .maybeSingle();

    if (data) setPresidentMessage(data.content);
  };

  const loadLatestContent = async () => {
    const { data: news } = await supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(2);

    const { data: events } = await supabase
      .from("events" as any)
      .select("*")
      .order("start_date", { ascending: false })
      .limit(2);

    if (news) setLatestNews(news);
    if (events) setLatestEvents(events);
  };

  const openModal = (item: any, type: 'news' | 'event') => {
    setSelectedItem({ ...item, type });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <MaintenanceOverlay>
        {/* Hero Section */}
        <section className="relative py-20 gradient-institutional text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <img
                src={logo}
                alt="Logo BDL"
                className="h-32 w-32 mx-auto rounded-full shadow-elegant ring-4 ring-white/30"
              />
              <h1 className="text-5xl md:text-6xl font-bold">
                Bureau des Lycéens
              </h1>
              <p className="text-2xl font-light">
                Lycée d'Enseignement Général Saint-André
              </p>
              <p className="text-xl italic text-accent font-medium">
                "Là où naît l'ambition, s'élève la grandeur."
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/bdl">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Découvrir le BDL
                  </Button>
                </Link>
                <Link to="/intranet">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 border-white text-black hover:bg-white hover:text-primary"
                  >
                    Accès Intranet
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Alert Banner */}
        <div className="bg-accent/10 border-y border-accent/20 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-sm md:text-base">
              <AlertCircle className="h-5 w-5 text-accent flex-shrink-0" />
              <p className="text-center">
                <span className="font-semibold">
                  Site d'information accessible à tous.
                </span>{" "}
                Une connexion est requise pour consulter certains contenus.
              </p>
            </div>
          </div>
        </div>

        {/* President's Message */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto shadow-card">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gradient-institutional flex items-center justify-center text-gold text-3xl font-bold shadow-elegant">
                      AL
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">
                        Message du Président
                      </h2>
                      <p className="text-muted-foreground font-medium">
                        Alexandre Lejal, Président du BDL
                      </p>
                    </div>
                    <div
                      className="prose prose-lg max-w-none text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: presidentMessage }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Latest News & Events */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-4">
                  Actualités & Événements
                </h2>
                <p className="text-muted-foreground">
                  Restez informés des dernières nouvelles et événements
                </p>
              </div>

              {(latestNews.length > 0 || latestEvents.length > 0) ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {latestNews.map((article) => (
                      <Card
                        key={article.id}
                        className="shadow-card hover:shadow-elegant transition-all cursor-pointer"
                        onClick={() => openModal(article, 'news')}
                      >
                        <CardContent className="p-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge>{article.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(article.published_at).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold">{article.title}</h3>
                          <div
                            className="text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                          />
                          {article.author_name && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={article.author_avatar} />
                                <AvatarFallback>
                                  {article.author_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                Par {article.author_name}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {latestEvents.length > 0 && (
                    <>
                      <h3 className="text-2xl font-bold mt-12 mb-4">Évènements</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {latestEvents.map((event) => (
                          <Card
                            key={event.id}
                            className="shadow-card hover:shadow-elegant transition-all border-primary/20 cursor-pointer"
                            onClick={() => openModal(event, 'event')}
                          >
                            <CardContent className="p-6 space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary">Événement</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(event.start_date).toLocaleDateString("fr-FR")}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold">{event.title}</h3>
                              <div
                                className="text-muted-foreground line-clamp-2"
                                dangerouslySetInnerHTML={{ __html: event.description }}
                              />
                              {event.author_name && (
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={event.author_avatar} />
                                    <AvatarFallback>
                                      {event.author_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    Par {event.author_name}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucune actualité ou événement pour le moment
                </p>
              )}

              <div className="text-center">
                <Link to="/actualites">
                  <Button size="lg">
                    Voir toutes les actualités
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Instagram Section ─────────────────────────────────────────────── */}
        <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-sm flex-shrink-0">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold">Sur Instagram</h2>
                  </div>
                  <p className="text-muted-foreground text-sm pl-12">
                    Suivez-nous sur{" "}
                    <a
                      href="https://www.instagram.com/bdllgsaintandre"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-semibold hover:underline"
                    >
                      @bdllgsaintandre
                    </a>
                  </p>
                </div>

                <a
                  href="https://www.instagram.com/bdllgsaintandre"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 transition-colors"
                  >
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                      <Instagram className="h-2.5 w-2.5 text-white" />
                    </div>
                    Voir le profil
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </a>
              </div>

              {/* Info sur les bloqueurs */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <Instagram className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <p>
                  Les publications sont chargées directement depuis Instagram. Si elles n'apparaissent pas,
                  vérifiez que votre bloqueur de publicités est désactivé ou{" "}
                  <a
                    href="https://www.instagram.com/bdllgsaintandre"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    consultez notre profil directement
                  </a>
                  .
                </p>
              </div>

              {/* Grille des deux posts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {INSTAGRAM_POSTS.map((post, index) => (
                  <Card key={index} className="shadow-card overflow-hidden">
                    <CardContent className="p-5 space-y-3">
                      {/* Badge */}
                      <div className="flex items-center gap-2">
                        {post.isPinned ? (
                          <Badge className="gap-1.5 bg-accent text-secondary font-semibold shadow-sm">
                            <Pin className="h-3 w-3" />
                            Post épinglé
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="gap-1.5 border border-pink-100 bg-pink-50 text-pink-700"
                          >
                            <Instagram className="h-3 w-3" />
                            Dernier post
                          </Badge>
                        )}
                      </div>

                      {/* Embed */}
                      <InstagramEmbed post={post} />
                    </CardContent>
                  </Card>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Accès Rapide</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                {
                  title: "Conférence",
                  description: "Accédez à la salle de conférence du BDL",
                  icon: Headphones,
                  link: "/conference",
                  gradient: "gradient-institutional",
                },
                {
                  title: "Scrutins",
                  description: "Suivez les résultats des votes du Bureau",
                  icon: Vote,
                  link: "/scrutin",
                  gradient: "gradient-gold",
                },
                {
                  title: "JoBDL",
                  description: "Consultez le Journal officiel du Bureau des Lycéens",
                  icon: FileText,
                  link: "/jo",
                  gradient: "gradient-institutional",
                },
                {
                  title: "Certificat",
                  description: "Vérifiez la validité d'un certificat émis par le Bureau",
                  icon: BookUser,
                  link: "/certificat-verif",
                  gradient: "gradient-gold",
                },
              ].map((item, index) => (
                <Link key={index} to={item.link}>
                  <Card className="group h-full hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                    <CardContent className="p-6 text-center space-y-4">
                      <div
                        className={`w-16 h-16 mx-auto rounded-full ${item.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
                      >
                        <item.icon className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
        </MaintenanceOverlay>
      </main>

      <Footer />

      {/* Modal pour afficher le contenu complet */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-2xl font-bold pr-8">
                    {selectedItem.title}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Badge variant={selectedItem.type === 'news' ? 'default' : 'secondary'}>
                    {selectedItem.type === 'news' ? selectedItem.category : 'Événement'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedItem.type === 'news' 
                      ? new Date(selectedItem.published_at).toLocaleDateString("fr-FR", { 
                          day: "2-digit", 
                          month: "long", 
                          year: "numeric" 
                        })
                      : new Date(selectedItem.start_date).toLocaleDateString("fr-FR", { 
                          day: "2-digit", 
                          month: "long", 
                          year: "numeric" 
                        })
                    }
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedItem.type === 'news' 
                      ? selectedItem.content 
                      : selectedItem.description 
                  }}
                />

                {selectedItem.author_name && (
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedItem.author_avatar} />
                      <AvatarFallback>
                        {selectedItem.author_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedItem.author_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {translateRole(selectedItem.author_role)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedItem.type === 'event' && selectedItem.end_date && selectedItem.start_date !== selectedItem.end_date && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Période :</span> Du{" "}
                      {new Date(selectedItem.start_date).toLocaleDateString("fr-FR", { 
                        day: "2-digit", 
                        month: "long" 
                      })}
                      {" "}au{" "}
                      {new Date(selectedItem.end_date).toLocaleDateString("fr-FR", { 
                        day: "2-digit", 
                        month: "long", 
                        year: "numeric" 
                      })}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;