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
        .from('events')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error("Erreur lors du chargement des événements");
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string | null): string => {
    const roleLabels: { [key: string]: string } = {
      'president': 'Le Président',
      'vice_president': 'La Vice-présidente',
      'secretary_general': 'La Secrétaire Générale',
      'communication_manager': 'Le Responsable Communication',
      'bdl_member': 'Membre du BDL',
    };
    return role ? roleLabels[role] || 'BDL' : 'BDL';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Événements</h1>
            <p className="text-muted-foreground">
              Découvrez tous les événements organisés par le BDL
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement des événements...</p>
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun événement pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {events.map((event) => (
                <Card key={event.id} className={event.is_pinned ? "border-primary" : ""}>
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
                            {format(new Date(event.start_date), 'dd MMMM yyyy', { locale: fr })}
                            {event.start_date !== event.end_date && (
                              <> - {format(new Date(event.end_date), 'dd MMMM yyyy', { locale: fr })}</>
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
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
