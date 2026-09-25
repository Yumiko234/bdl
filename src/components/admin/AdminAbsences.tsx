import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { CalendarX2, Users, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AbsenceRow {
  member_id: string;
  reason: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  absences: AbsenceRow[];
  open: boolean;
}

export const AdminAbsences = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const { data: meetingsData } = await supabase
      .from("bdl_meetings")
      .select("id, title, meeting_date")
      .gte("meeting_date", today)
      .order("meeting_date", { ascending: true });

    if (!meetingsData) { setLoading(false); return; }

    const { data: absencesData } = await supabase
      .from("bdl_meeting_absence_requests")
      .select("meeting_id, member_id, reason, profiles(full_name, avatar_url, email)")
      .in("meeting_id", meetingsData.map((m) => m.id));

    const rows = (absencesData ?? []) as Array<{
      meeting_id: string;
      member_id: string;
      reason: string;
      profiles: { full_name: string; avatar_url: string | null; email: string | null } | null;
    }>;

    setMeetings(
      meetingsData.map((m) => ({
        ...m,
        absences: rows.filter((a) => a.meeting_id === m.id),
        open: true,
      }))
    );
    setLoading(false);
  };

  const toggle = (id: string) =>
    setMeetings((prev) => prev.map((m) => m.id === id ? { ...m, open: !m.open } : m));

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) return <p className="text-sm text-muted-foreground p-6">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarX2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Absences aux réunions</h2>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground italic">
            Aucune réunion à venir dans la base.
          </CardContent>
        </Card>
      ) : (
        meetings.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggle(m.id)}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">{fmt(m.meeting_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.absences.length > 0 ? "destructive" : "secondary"}>
                    <Users className="h-3 w-3 mr-1" />
                    {m.absences.length} absence{m.absences.length !== 1 ? "s" : ""}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {m.open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {m.open && (
              <CardContent className="pt-0">
                {m.absences.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">Aucune absence déclarée pour cette réunion.</p>
                ) : (
                  <div className="space-y-3">
                    {m.absences.map((a) => (
                      <div key={a.member_id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <Avatar className="h-9 w-9 shrink-0">
                          {a.profiles?.avatar_url && <AvatarImage src={a.profiles.avatar_url} alt={a.profiles.full_name ?? ""} />}
                          <AvatarFallback>{a.profiles?.full_name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-sm font-medium">{a.profiles?.full_name ?? "Membre inconnu"}</p>
                          {a.profiles?.email && (
                            <p className="text-xs text-muted-foreground">{a.profiles.email}</p>
                          )}
                          {a.reason ? (
                            <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="italic">"{a.reason}"</span>
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic mt-1">Aucun motif fourni.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
};
