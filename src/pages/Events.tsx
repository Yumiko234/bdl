import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Pin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_pinned: boolean;
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
  created_at: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("start_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Erreur lors du chargement des évènements");
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string | null): string => {
    const roleLabels: { [key: string]: string } = {
      president: "Président",
      vice_president: "Vice-Présidente",
      secretary_general: "Secrétaire Générale",
      communication_manager: "Directeur de la Communication et de la Communauté",
      bdl_member: "Membre du BDL",
    };
    return role ? roleLabels[role] || "BDL" : "BDL";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        {/* En-tête harmonisée avec la page Actualités */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Évènements & Activités</h1>
              <p className="text-xl">
                Découvrez tous les évènements organisés par le BDL
              </p>
            </div>
          </div>
        </section>

        {/* Section principale */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Sous-titre ajouté ici, comme dans la page Actualités */}
              <h2 className="text-3xl font-bold">Évènements</h2>

              {loading ? (
                <p className="text-center text-muted-foreground py-8">
                  Chargement des évènements...
                </p>
              ) : events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun évènement pour le moment
                </p>
              ) : (
                events.map((event) => (
                  <Card
                    key={event.id}
                    className={event.is_pinned ? "border-2 border-accent shadow-card" : "shadow-card"}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {event.is_pinned && (
                              <Badge variant="default" className="gap-1">
                                <Pin className="h-3 w-3" />
                                Épinglé
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-2xl">{event.title}</CardTitle>
                          <CardDescription className="mt-2 flex flex-wrap gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(event.start_date), "dd MMMM yyyy", { locale: fr })}
                              {event.start_date !== event.end_date && (
                                <>
                                  {" "}
                                  -{" "}
                                  {format(new Date(event.end_date), "dd MMMM yyyy", {
                                    locale: fr,
                                  })}
                                </>
                              )}
                            </span>
                            {(event.start_time || event.end_time) && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {event.start_time}
                                {event.end_time && <> - {event.end_time}</>}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert mb-4"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                      {event.author_name && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <span className="text-sm text-muted-foreground">
                            Par {event.author_name}
                            {event.author_role && ` - ${getRoleLabel(event.author_role)}`}
                          </span>
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
}
