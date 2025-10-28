import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { ChevronRight, Calendar, FileText, Users, MessageCircle, AlertCircle } from "lucide-react";
import logo from "@/assets/logo-bdl.jpeg";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [presidentMessage, setPresidentMessage] = useState("");
  const [latestNews, setLatestNews] = useState<any[]>([]);
  const [latestEvents, setLatestEvents] = useState<any[]>([]);

  useEffect(() => {
    loadPresidentMessage();
    loadLatestContent();
  }, []);

  const loadPresidentMessage = async () => {
    const { data } = await supabase
      .from('president_message')
      .select('content')
      .maybeSingle();

    if (data) {
      setPresidentMessage(data.content);
    }
  };

  const loadLatestContent = async () => {
    const { data: news } = await supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(2);

    const { data: events } = await supabase
      .from('events' as any)
      .select('*')
      .order('start_date', { ascending: false })
      .limit(2);

    if (news) setLatestNews(news);
    if (events) setLatestEvents(events);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
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
              <p className="text-2xl font-light">Lycée d'Enseignement Général Saint-André</p>
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
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white text-black hover:bg-white hover:text-primary">
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
                <span className="font-semibold">Site d'informations disponible à tous.</span>
                {" "}Connexion requise pour accéder à certains contenus.
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
                    <div className="w-24 h-24 rounded-full bg-gradient-institutional flex items-center justify-center text-white text-3xl font-bold shadow-elegant">
                      AL
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Message du Président</h2>
                      <p className="text-muted-foreground font-medium">Alexandre Lejal, Président du BDL</p>
                    </div>
                    <div className="prose prose-lg max-w-none">
                      {presidentMessage.split('\n').map((paragraph, index) => (
                        <p key={index} className="text-foreground leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
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
                <h2 className="text-4xl font-bold mb-4">Actualités & Événements</h2>
                <p className="text-muted-foreground">Restez informés des dernières nouvelles et événements</p>
              </div>

              {(latestNews.length > 0 || latestEvents.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {latestNews.map((article) => (
                    <Card key={article.id} className="shadow-card hover:shadow-elegant transition-all">
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge>{article.category}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(article.published_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold">{article.title}</h3>
                        <p className="text-muted-foreground line-clamp-2">{article.content}</p>
                        {article.author_name && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={article.author_avatar} />
                              <AvatarFallback>{article.author_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              Par {article.author_name}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {latestEvents.map((event) => (
                    <Card key={event.id} className="shadow-card hover:shadow-elegant transition-all border-primary/20">
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">Événement</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.start_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold">{event.title}</h3>
                        <p className="text-muted-foreground line-clamp-2">{event.description}</p>
                        {event.author_name && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={event.author_avatar} />
                              <AvatarFallback>{event.author_name.charAt(0)}</AvatarFallback>
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
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune actualité ou événement pour le moment</p>
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

        {/* Quick Access */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Accès Rapide</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                {
                  title: "Le BDL",
                  description: "Découvrez l'équipe et nos missions",
                  icon: Users,
                  link: "/bdl",
                  gradient: "gradient-institutional"
                },
                {
                  title: "Actualités",
                  description: "Suivez toute l'actualité du lycée",
                  icon: FileText,
                  link: "/actualites",
                  gradient: "gradient-gold"
                },
                {
                  title: "Clubs",
                  description: "Découvrez les clubs de l'établissement",
                  icon: Users,
                  link: "/clubs",
                  gradient: "gradient-institutional"
                },
                {
                  title: "Contact",
                  description: "Contactez-nous ou demandez une audience",
                  icon: MessageCircle,
                  link: "/contact",
                  gradient: "gradient-gold"
                }
              ].map((item, index) => (
                <Link key={index} to={item.link}>
                  <Card className="group h-full hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className={`w-16 h-16 mx-auto rounded-full ${item.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                        <item.icon className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
