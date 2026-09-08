import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Pin, CalendarDays, CalendarPlus, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { safeHtml } from "@/lib/sanitize";

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

function downloadICS(event: Event) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateStr = (iso: string) => iso.replace(/-/g, "");
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  const uid = `bdl-${event.id}-${Date.now()}@bdl-saintandre.fr`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BDL Saint-André//FR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${toDateStr(event.start_date)}`,
    `DTEND;VALUE=DATE:${toDateStr(event.end_date)}`,
    `SUMMARY:${event.title.replace(/,/g, "\\,")}`,
    event.description ? `DESCRIPTION:${stripHtml(event.description).replace(/\n/g, "\\n").replace(/,/g, "\\,")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function EventCard({ event, getRoleLabel, past = false }: { event: Event; getRoleLabel: (r: string | null) => string; past?: boolean }) {
  const handleShare = async () => {
    const url = `${window.location.origin}/events#event-${event.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: event.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  };

  return (
    <Card id={`event-${event.id}`} className={`shadow-card ${past ? "opacity-70" : ""} ${event.is_pinned && !past ? "border-2 border-accent" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {event.is_pinned && !past && (
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
                  <> - {format(new Date(event.end_date), "dd MMMM yyyy", { locale: fr })}</>
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
          dangerouslySetInnerHTML={safeHtml(event.description)}
        />
        <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-2">
          {event.author_name ? (
            <span className="text-sm text-muted-foreground">
              Par {event.author_name}
              {event.author_role && ` - ${getRoleLabel(event.author_role)}`}
            </span>
          ) : <span />}
          <div className="flex items-center gap-2">
            {!past && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => downloadICS(event)}>
                <CalendarPlus className="h-3.5 w-3.5" />
                Ajouter au calendrier
              </Button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Partager
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Events() {
  useSEO({
    title: "Événements – Bureau des Lycéens",
    description: "Tous les événements à venir et passés organisés par le Bureau des Lycéens du Lycée Saint-André.",
    url: "/events",
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Événements – Bureau des Lycéens";
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Erreur lors du chargement des évènements");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter((e) => new Date(e.end_date) >= today);
  const pastEvents = events.filter((e) => new Date(e.end_date) < today).reverse();

  const getRoleLabel = (role: string | null): string => {
    const roleLabels: { [key: string]: string } = {
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
    return role ? roleLabels[role] || "BDL" : "BDL";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <MaintenanceOverlay>
        {/* En-tête harmonisée avec la page Actualités */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <nav className="text-xs text-white/60 flex items-center gap-1.5 flex-wrap mb-6">
              <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90 font-medium">Événements</span>
            </nav>
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
              {/* Header avec bouton calendrier */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-3xl font-bold">Évènements</h2>
                <Link to="/calendrier">
                  <Button variant="outline" className="gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Voir le calendrier
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-card">
                      <CardHeader>
                        <Skeleton className="h-7 w-2/3" />
                        <div className="flex gap-3 mt-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun évènement pour le moment
                </p>
              ) : (
                <>
                  {/* Évènements à venir */}
                  {upcomingEvents.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-foreground">À venir</h3>
                      {upcomingEvents.map((event) => <EventCard key={event.id} event={event} getRoleLabel={getRoleLabel} />)}
                    </div>
                  )}

                  {/* Évènements passés */}
                  {pastEvents.length > 0 && (
                    <div className="space-y-4 pt-4">
                      <h3 className="text-xl font-semibold text-muted-foreground">Passés</h3>
                      {pastEvents.map((event) => <EventCard key={event.id} event={event} getRoleLabel={getRoleLabel} past />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
}
