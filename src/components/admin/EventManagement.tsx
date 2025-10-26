import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Pin, Edit, Trash2 } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_pinned: boolean;
  author_name: string | null;
  author_role: string | null;
  author_avatar: string | null;
  created_at: string;
}

interface EventManagementProps {
  isPresident: boolean;
}

export const EventManagement = ({ isPresident }: EventManagementProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: ""
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events' as any)
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des événements");
    } else {
      setEvents(data as unknown as Event[]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.start_date || !formData.end_date) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url' as any)
      .eq('id', user.id)
      .single();

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRole = roles?.[0]?.role || 'bdl_member';

    if (editingEvent) {
      const { error } = await supabase
        .from('events' as any)
        .update({
          title: formData.title,
          description: formData.description,
          start_date: formData.start_date,
          end_date: formData.end_date,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null
        })
        .eq('id', editingEvent);

      if (error) {
        toast.error("Erreur lors de la modification");
      } else {
        toast.success("Événement modifié avec succès");
        resetForm();
        loadEvents();
      }
    } else {
      const { error } = await supabase
        .from('events' as any)
        .insert({
          title: formData.title,
          description: formData.description,
          start_date: formData.start_date,
          end_date: formData.end_date,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          author_id: user.id,
          author_name: (profile as any)?.full_name || null,
          author_role: userRole,
          author_avatar: (profile as any)?.avatar_url || null
        });

      if (error) {
        toast.error("Erreur lors de la création");
      } else {
        toast.success("Événement publié avec succès");
        resetForm();
        loadEvents();
      }
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event.id);
    setFormData({
      title: event.title,
      description: event.description,
      start_date: event.start_date.split('T')[0],
      end_date: event.end_date.split('T')[0],
      start_time: event.start_time || "",
      end_time: event.end_time || ""
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;

    const { error } = await supabase
      .from('events' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Événement supprimé");
      loadEvents();
    }
  };

  const handlePin = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('events' as any)
      .update({ is_pinned: !currentPinned })
      .eq('id', id);

    if (error) {
      toast.error("Erreur lors de l'épinglage");
    } else {
      toast.success(currentPinned ? "Événement désépinglé" : "Événement épinglé");
      loadEvents();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: ""
    });
    setEditingEvent(null);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Gestion des Événements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
          <h3 className="font-semibold">
            {editingEvent ? "Modifier l'événement" : "Nouvel événement"}
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'événement"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Description de l'événement..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_time">Heure de début (optionnel)</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">Heure de fin (optionnel)</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSubmit}>
                {editingEvent ? "Modifier" : "Publier"}
              </Button>
              {editingEvent && (
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Événements publiés</h3>
          
          {events.map((event) => (
            <Card key={event.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{event.title}</h4>
                        {event.is_pinned && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Pin className="h-3 w-3" />
                            Épinglé
                          </Badge>
                        )}
                      </div>
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Du {new Date(event.start_date).toLocaleDateString('fr-FR')}
                          {event.start_time && ` à ${event.start_time}`}
                        </span>
                        <span>
                          au {new Date(event.end_date).toLocaleDateString('fr-FR')}
                          {event.end_time && ` à ${event.end_time}`}
                        </span>
                      </div>
                    </div>
                  
                  <div className="flex gap-2">
                    {isPresident && (
                      <Button 
                        size="sm" 
                        variant={event.is_pinned ? "default" : "outline"}
                        onClick={() => handlePin(event.id, event.is_pinned)}
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};