import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Trash2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_date: string;       // ISO date string  "2025-06-10"
  end_date: string;
  start_time: string | null; // "14:30" or null
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
};

// ---------------------------------------------------------------------------
// Helper – format a date string ("2025-06-10") to "10 juin 2025"
// ---------------------------------------------------------------------------
const fmtDate = (iso: string) => {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const CalendarManagement = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- form / modal state ----
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ---- validation helper ----
  const [formError, setFormError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Load
  // -----------------------------------------------------------------------
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des événements");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  // -----------------------------------------------------------------------
  // Open modal – create or edit
  // -----------------------------------------------------------------------
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsOpen(true);
  };

  const openEdit = (evt: CalendarEvent) => {
    setEditingId(evt.id);
    setForm({
      title: evt.title,
      description: evt.description,
      start_date: evt.start_date,
      end_date: evt.end_date,
      start_time: evt.start_time ?? "",
      end_time: evt.end_time ?? "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setFormError(null);
  };

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------
  const validate = (): boolean => {
    if (!form.title.trim()) {
      setFormError("Le titre est obligatoire.");
      return false;
    }
    if (!form.start_date || !form.end_date) {
      setFormError("Les dates de début et de fin sont obligatoires.");
      return false;
    }
    if (form.end_date < form.start_date) {
      setFormError("La date de fin doit être après ou égale à la date de début.");
      return false;
    }
    // If only one of start/end time is filled → warn but allow
    setFormError(null);
    return true;
  };

  // -----------------------------------------------------------------------
  // Save (create | update)
  // -----------------------------------------------------------------------
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    };

    let error: any;

    if (editingId !== null) {
      // UPDATE
      ({ error } = await supabase
        .from("calendar_events")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId));
    } else {
      // INSERT
      ({ error } = await supabase
        .from("calendar_events")
        .insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    }

    if (error) {
      toast.error("Erreur lors de la sauvegarde de l'événement");
    } else {
      toast.success(editingId !== null ? "Événement mis à jour" : "Événement créé avec succès");
      closeModal();
      await fetchEvents();
    }
    setSaving(false);
  };

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------
  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet événement ?")) return;

    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Événement supprimé");
      await fetchEvents();
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <Card className="shadow-card">
      {/* ---- Header ---- */}
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Gestion Calendrier ({events.length})
          </CardTitle>
          <Button onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Nouvel événement
          </Button>
        </div>
      </CardHeader>

      {/* ---- Event list ---- */}
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Chargement…</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun événement pour le moment. Créez-en un avec le bouton ci-dessus.
          </p>
        ) : (
          events.map((evt) => (
            <Card key={evt.id} className="bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-bold text-lg truncate">{evt.title}</h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {fmtDate(evt.start_date)}
                        {evt.start_date !== evt.end_date && ` – ${fmtDate(evt.end_date)}`}
                      </span>
                      {(evt.start_time || evt.end_time) && (
                        <Badge variant="secondary">
                          {evt.start_time || "—"}
                          {evt.end_time && ` – ${evt.end_time}`}
                        </Badge>
                      )}
                    </div>

                    {/* description preview – strip HTML tags for the admin list */}
                    {evt.description && (
                      <p
                        className="text-sm text-muted-foreground line-clamp-2 mt-1"
                        dangerouslySetInnerHTML={{ __html: evt.description }}
                      />
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(evt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(evt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>

      {/* ---- Modal (create / edit) ---- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* modal header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingId !== null ? "Modifier l'événement" : "Créer un événement"}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* modal body */}
            <div className="p-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="cal-title">Titre <span className="text-destructive">*</span></Label>
                <Input
                  id="cal-title"
                  placeholder="Titre de l'événement"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={form.description}
                  onChange={(val) => setForm({ ...form, description: val })}
                  placeholder="Description de l'événement…"
                />
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cal-start-date">Date de début <span className="text-destructive">*</span></Label>
                  <Input
                    id="cal-start-date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        start_date: val,
                        // auto-advance end_date if it falls behind
                        end_date: prev.end_date && prev.end_date < val ? val : prev.end_date,
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cal-end-date">Date de fin <span className="text-destructive">*</span></Label>
                  <Input
                    id="cal-end-date"
                    type="date"
                    value={form.end_date}
                    min={form.start_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Times row (optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cal-start-time">Heure de début <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                  <Input
                    id="cal-start-time"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cal-end-time">Heure de fin <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                  <Input
                    id="cal-end-time"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Validation error */}
              {formError && (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              )}
            </div>

            {/* modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={closeModal}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement…" : editingId !== null ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};