import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Target, CheckCircle2, Clock, AlertCircle,
  Star, ArrowLeft, StickyNote, Calendar, TrendingUp,
  Award, Loader2, CalendarClock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Action {
  id: string;
  title: string;
  description: string | null;
  category: "petite" | "normale" | "grande";
  points: number;
  status: "a_faire" | "en_cours" | "terminee";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  author_name?: string;
}

interface MeetingAttendance {
  id: string;
  status: "present" | "absent" | "excuse";
  meeting: { title: string; meeting_date: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  petite:  { label: "Petite",  pts: 0.5, color: "bg-blue-100 text-blue-700 border-blue-200" },
  normale: { label: "Normale", pts: 1.0, color: "bg-amber-100 text-amber-700 border-amber-200" },
  grande:  { label: "Grande",  pts: 2.0, color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const STATUS_CONFIG = {
  a_faire:  { label: "À faire",  color: "bg-gray-100 text-gray-600",    icon: <AlertCircle className="h-3 w-3" /> },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-700",    icon: <Clock className="h-3 w-3 animate-spin" /> },
  terminee: { label: "Terminée", color: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3 w-3" /> },
};

const ATTENDANCE_CONFIG = {
  present: { label: "Présent",  color: "bg-green-100 text-green-700 border-green-200" },
  absent:  { label: "Absent",   color: "bg-red-100 text-red-700 border-red-200" },
  excuse:  { label: "Excusé",   color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

// ─── Component ────────────────────────────────────────────────────────────────

const ProfileBDLSuivi = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [actions, setActions] = useState<Action[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [meetingAttendance, setMeetingAttendance] = useState<MeetingAttendance[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "a_faire" | "en_cours" | "terminee">("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    document.title = "Suivi BDL – Mon Profil";
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Profile
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (p) setProfile(p as any);

      // Actions assigned to this user
      const { data: a, error: aErr } = await supabase
        .from("bdl_actions" as any)
        .select("*")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      if (aErr) throw aErr;
      setActions((a || []) as unknown as Action[]);

      // Notes about this user (visible to the member)
      const { data: n, error: nErr } = await supabase
        .from("bdl_member_notes" as any)
        .select("*, profiles!bdl_member_notes_author_id_fkey(full_name)")
        .eq("member_id", user!.id)
        .order("created_at", { ascending: false });
      if (nErr) throw nErr;
      const mappedNotes = ((n || []) as any[]).map((note) => ({
        ...note,
        author_name: note.profiles?.full_name ?? "Inconnu",
      }));
      setNotes(mappedNotes);

      // Présences aux réunions
      const { data: att, error: attErr } = await supabase
        .from("bdl_meeting_attendance" as any)
        .select("id, status, meeting:bdl_meetings(title, meeting_date)")
        .eq("member_id", user!.id);
      if (attErr) throw attErr;
      const sortedAttendance = ((att || []) as unknown as MeetingAttendance[]).sort(
        (a, b) => (b.meeting?.meeting_date ?? "").localeCompare(a.meeting?.meeting_date ?? "")
      );
      setMeetingAttendance(sortedAttendance);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement du suivi.");
    } finally {
      setLoading(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────

  const doneActions = actions.filter((a) => a.status === "terminee");
  const totalPoints = doneActions.reduce((s, a) => s + a.points, 0);
  const completionRate = actions.length > 0 ? Math.round((doneActions.length / actions.length) * 100) : 0;

  const filteredActions = activeTab === "all" ? actions : actions.filter((a) => a.status === activeTab);

  const presentCount = meetingAttendance.filter((a) => a.status === "present").length;
  const absentCount = meetingAttendance.filter((a) => a.status === "absent").length;
  const excusedCount = meetingAttendance.filter((a) => a.status === "excuse").length;
  const attendanceRate = presentCount + absentCount > 0
    ? Math.round((presentCount / (presentCount + absentCount)) * 100)
    : null;

  const monthlyData = (() => {
    const map: Record<string, number> = {};
    doneActions.forEach((a) => {
      const d = new Date(a.completed_at ?? a.updated_at ?? a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + a.points;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, pts]) => ({
        month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        pts,
      }));
  })();

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-institutional text-white py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-white/40 text-black hover:bg-white/10 gap-1"
                onClick={() => navigate("/profile")}
              >
                <ArrowLeft className="h-4 w-4" />
                Mon profil
              </Button>
            </div>
            <div className="flex items-center gap-5 mt-4">
              <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-elegant ring-4 ring-white/30 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  getInitials(profile?.full_name ?? "?")
                )}
              </div>
              <div>
                <p className="text-white/70 text-sm uppercase tracking-widest font-medium">Suivi des Actions BDL</p>
                <h1 className="text-3xl font-bold mt-1">{profile?.full_name}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge className="bg-white/20 text-white border-white/30 gap-1">
                    <Star className="h-3 w-3 text-amber-300" />
                    {totalPoints.toFixed(1)} pts gagnés
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {doneActions.length} / {actions.length} actions terminées
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">

          {/* ── Stats cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Points totaux", value: totalPoints.toFixed(1), icon: <Star className="h-5 w-5 text-amber-500" />, highlight: true },
              { label: "Terminées", value: doneActions.length, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
              { label: "En cours", value: actions.filter((a) => a.status === "en_cours").length, icon: <Clock className="h-5 w-5 text-blue-600" /> },
              { label: "Taux de complétion", value: `${completionRate}%`, icon: <TrendingUp className="h-5 w-5 text-primary" /> },
            ].map((stat) => (
              <Card key={stat.label} className={`shadow-card ${stat.highlight ? "border-amber-200 bg-amber-50/30" : ""}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-shrink-0">{stat.icon}</div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Progress bar ── */}
          {actions.length > 0 && (
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">Progression globale</p>
                  <span className="text-sm font-bold text-primary">{completionRate}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completionRate}%`,
                      background: completionRate >= 75 ? "#22c55e" : completionRate >= 40 ? "#3b82f6" : "#f59e0b",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{doneActions.length} terminée(s)</span>
                  <span>{actions.filter((a) => a.status === "en_cours").length} en cours</span>
                  <span>{actions.filter((a) => a.status === "a_faire").length} à faire</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Monthly chart ── */}
          {monthlyData.length > 1 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Points gagnés par mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`${v} pt(s)`, "Points"]} />
                    <Bar dataKey="pts" radius={[4, 4, 0, 0]}>
                      {monthlyData.map((_, i) => (
                        <Cell key={i} fill="#3B82F6" opacity={0.7 + i * 0.05} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ── Category breakdown ── */}
          {doneActions.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {(["petite", "normale", "grande"] as const).map((cat) => {
                const count = doneActions.filter((a) => a.category === cat).length;
                const pts = doneActions.filter((a) => a.category === cat).reduce((s, a) => s + a.points, 0);
                return (
                  <Card key={cat} className="shadow-card text-center">
                    <CardContent className="p-4 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{CATEGORY_CONFIG[cat].label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{pts.toFixed(1)} pts</p>
                      <Badge variant="outline" className={`text-xs ${CATEGORY_CONFIG[cat].color}`}>
                        {cat === "petite" ? "0,5 pt" : cat === "normale" ? "1 pt" : "2 pts"} / action
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Présence aux réunions ── */}
          {meetingAttendance.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Ma présence aux réunions
                  {attendanceRate !== null && (
                    <span className={`ml-auto text-sm font-bold ${attendanceRate >= 75 ? "text-green-600" : attendanceRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {attendanceRate}%
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-green-50 border-green-200 p-3 text-center">
                    <p className="text-xl font-bold text-green-700">{presentCount}</p>
                    <p className="text-xs text-green-700/80">Présent(e)</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-center">
                    <p className="text-xl font-bold text-amber-700">{excusedCount}</p>
                    <p className="text-xs text-amber-700/80">Excusé(e)</p>
                  </div>
                  <div className="rounded-lg border bg-red-50 border-red-200 p-3 text-center">
                    <p className="text-xl font-bold text-red-700">{absentCount}</p>
                    <p className="text-xs text-red-700/80">Absent(e)</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {meetingAttendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/20 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.meeting?.title ?? "Réunion"}</p>
                        {a.meeting?.meeting_date && (
                          <p className="text-xs text-muted-foreground">{fmtDate(a.meeting.meeting_date)}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${ATTENDANCE_CONFIG[a.status].color}`}>
                        {ATTENDANCE_CONFIG[a.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Actions list ── */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Mes actions ({actions.length})
                </CardTitle>
                {/* Filter tabs */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  {([
                    ["all", "Toutes"],
                    ["a_faire", "À faire"],
                    ["en_cours", "En cours"],
                    ["terminee", "Terminées"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setActiveTab(val)}
                      className={`px-3 py-1.5 transition-colors ${activeTab === val ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredActions.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    {activeTab === "all" ? "Aucune action assignée pour le moment." : `Aucune action « ${STATUS_CONFIG[activeTab as keyof typeof STATUS_CONFIG]?.label} ».`}
                  </p>
                </div>
              ) : (
                filteredActions.map((action) => {
                  const statusCfg = STATUS_CONFIG[action.status];
                  const catCfg = CATEGORY_CONFIG[action.category];
                  return (
                    <div key={action.id} className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm">{action.title}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                              {statusCfg.icon} {statusCfg.label}
                            </span>
                          </div>
                        </div>
                        {action.description && (
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${catCfg.color}`}>
                            {catCfg.label} — {action.points} pt{action.points > 1 ? "s" : ""}
                          </span>
                          {action.due_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Échéance : {fmtDate(action.due_date)}
                            </span>
                          )}
                          {action.status === "terminee" && action.completed_at && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Terminée le {fmtDate(action.completed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* ── Notes from staff ── */}
          {notes.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  Notes du Bureau ({notes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-lg border space-y-2 ${note.is_private ? "bg-yellow-50 border-yellow-200" : "bg-muted/20"}`}
                  >
                    <p className="text-sm">{note.content}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>De : {note.author_name}</span>
                      <span>{fmtDate(note.created_at)}</span>
                      {note.is_private && <span className="text-yellow-600 font-medium">🔒 Note privée</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {actions.length === 0 && notes.length === 0 && meetingAttendance.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-16 text-center space-y-4">
                <Award className="h-16 w-16 mx-auto text-muted-foreground/30" />
                <h3 className="text-xl font-semibold text-muted-foreground">Aucun suivi pour le moment</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Aucune action ne vous a encore été assignée par le Bureau.
                  Ce tableau de bord se remplira au fur et à mesure de votre participation.
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfileBDLSuivi;