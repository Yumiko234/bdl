import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Target, CheckCircle2, Clock, AlertCircle,
  Star, ArrowLeft, StickyNote, Calendar, TrendingUp,
  Award, Loader2, CalendarClock, MessageSquare, Send, UserCheck, UserX,
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
  meeting: { id: string; title: string; meeting_date: string } | null;
}

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string;
}

interface AbsenceRequest {
  meeting_id: string;
  reason: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  petite:  { label: "Petite",  pts: 0.5, color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700" },
  normale: { label: "Normale", pts: 1.0, color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" },
  grande:  { label: "Grande",  pts: 2.0, color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700" },
};

const STATUS_CONFIG = {
  a_faire:  { label: "À faire",  color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",    icon: <AlertCircle className="h-3 w-3" /> },
  en_cours: { label: "En cours", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",    icon: <Clock className="h-3 w-3 animate-spin" /> },
  terminee: { label: "Terminée", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",  icon: <CheckCircle2 className="h-3 w-3" /> },
};

const ATTENDANCE_CONFIG = {
  present: { label: "Présent",  color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700" },
  absent:  { label: "Absent",   color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700" },
  excuse:  { label: "Excusé",   color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

// ─── Component ────────────────────────────────────────────────────────────────

const ProfileBDLSuivi = () => {
  useSEO({ title: "Suivi BDL – Mon Profil", url: "/profile/bdl-suivi" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [actions, setActions] = useState<Action[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [meetingAttendance, setMeetingAttendance] = useState<MeetingAttendance[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "a_faire" | "en_cours" | "terminee">("all");

  // Modal justification d'absence
  const [absenceModal, setAbsenceModal] = useState<{ meetingId: string; meetingTitle: string } | null>(null);
  const [absenceReason, setAbsenceReason] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
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
        .from("bdl_actions")
        .select("*")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      if (aErr) throw aErr;
      setActions((a || []) as unknown as Action[]);

      // Notes about this user (visible to the member)
      const { data: n, error: nErr } = await supabase
        .from("bdl_member_notes")
        .select("*, profiles!bdl_member_notes_author_id_fkey(full_name)")
        .eq("member_id", user!.id)
        .order("created_at", { ascending: false });
      if (nErr) throw nErr;
      const mappedNotes = ((n || []) as any[]).map((note) => ({
        ...note,
        author_name: note.profiles?.full_name ?? "Inconnu",
      }));
      setNotes(mappedNotes);

      // Présences aux réunions + prochaines réunions + justifications existantes
      const today = new Date().toISOString().slice(0, 10);
      const [attRes, upcomingRes, absRes] = await Promise.all([
        supabase.from("bdl_meeting_attendance").select("id, status, meeting:bdl_meetings(id, title, meeting_date)").eq("member_id", user!.id),
        supabase.from("bdl_meetings").select("id, title, meeting_date").gte("meeting_date", today).order("meeting_date", { ascending: true }),
        supabase.from("bdl_meeting_absence_requests").select("meeting_id, reason").eq("member_id", user!.id),
      ]);
      if (attRes.error) throw attRes.error;
      const sortedAttendance = ((attRes.data || []) as unknown as MeetingAttendance[]).sort(
        (a, b) => (b.meeting?.meeting_date ?? "").localeCompare(a.meeting?.meeting_date ?? "")
      );
      setMeetingAttendance(sortedAttendance);
      const upcomingList = (upcomingRes.data || []) as UpcomingMeeting[];
      setUpcomingMeetings(upcomingList);
      setAbsenceRequests((absRes.data || []) as AbsenceRequest[]);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement du suivi.");
    } finally {
      setLoading(false);
    }
  };

  const openAbsenceModal = (meetingId: string, meetingTitle: string) => {
    const existing = absenceRequests.find((r) => r.meeting_id === meetingId);
    setAbsenceReason(existing?.reason ?? "");
    setAbsenceModal({ meetingId, meetingTitle });
  };

  const handleCancelAbsenceDeclaration = async (meetingId: string) => {
    const { error } = await supabase.from("bdl_meeting_absence_requests")
      .delete().eq("meeting_id", meetingId).eq("member_id", user!.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setAbsenceRequests((prev) => prev.filter((r) => r.meeting_id !== meetingId));
    toast.success("Absence annulée, vous serez marqué présent.");
  };

  const handleSubmitAbsence = async () => {
    if (!absenceModal) return;
    setSavingAbsence(true);
    const { error } = await supabase.from("bdl_meeting_absence_requests").upsert({
      meeting_id: absenceModal.meetingId,
      member_id: user!.id,
      reason: absenceReason.trim(),
      submitted_at: new Date().toISOString(),
    }, { onConflict: "meeting_id,member_id" });
    setSavingAbsence(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Absence signalée.");
    setAbsenceRequests((prev) => {
      const filtered = prev.filter((r) => r.meeting_id !== absenceModal.meetingId);
      return [...filtered, { meeting_id: absenceModal.meetingId, reason: absenceReason.trim() }];
    });
    setAbsenceModal(null);
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
                className="border-white/40 bg-white text-black hover:bg-white/90 gap-1"
                onClick={() => navigate("/intranet")}
              >
                <ArrowLeft className="h-4 w-4" />
                Mon profil
              </Button>
            </div>
            <div className="flex items-center gap-5 mt-4">
              <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-elegant ring-4 ring-white/30 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} loading="lazy" className="h-full w-full rounded-full object-cover" />
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

          {/* ── Prochaines réunions ── */}
          {upcomingMeetings.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Prochaines réunions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingMeetings.map((m) => {
                  const absReq = absenceRequests.find((r) => r.meeting_id === m.id);
                  const isAbsent = !!absReq;
                  return (
                    <div key={m.id} className={`p-2.5 rounded-lg border text-sm space-y-2 ${isAbsent ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{m.title}</p>
                            {isAbsent && (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700">
                                Absence signalée
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{fmtDate(m.meeting_date)}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {isAbsent ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-xs"
                              onClick={() => handleCancelAbsenceDeclaration(m.id)}
                            >
                              <UserCheck className="h-3 w-3" />
                              Je serai présent
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => openAbsenceModal(m.id, m.title)}
                            >
                              <UserX className="h-3 w-3" />
                              Signaler une absence
                            </Button>
                          )}
                        </div>
                      </div>
                      {isAbsent && (
                        <div className="flex items-center justify-between gap-2 pl-1">
                          <p className="text-xs text-muted-foreground italic truncate">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            {absReq.reason || "Aucun motif fourni"}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs flex-shrink-0"
                            onClick={() => openAbsenceModal(m.id, m.title)}
                          >
                            Modifier
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
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
                  <div className="rounded-lg border bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 p-3 text-center">
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{presentCount}</p>
                    <p className="text-xs text-green-700/80 dark:text-green-400">Présent(e)</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 p-3 text-center">
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{excusedCount}</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400">Excusé(e)</p>
                  </div>
                  <div className="rounded-lg border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 p-3 text-center">
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">{absentCount}</p>
                    <p className="text-xs text-red-700/80 dark:text-red-400">Absent(e)</p>
                  </div>
                </div>

                {/* Historique */}
                <div className="space-y-1.5">
                  {meetingAttendance.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historique</p>
                  )}
                  {meetingAttendance.map((a) => {
                    const meetingId = a.meeting?.id;
                    const hasRequest = meetingId ? absenceRequests.some((r) => r.meeting_id === meetingId) : false;
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/20 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{a.meeting?.title ?? "Réunion"}</p>
                          {a.meeting?.meeting_date && (
                            <p className="text-xs text-muted-foreground">{fmtDate(a.meeting.meeting_date)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.status === "absent" && meetingId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700"
                              onClick={() => openAbsenceModal(meetingId, a.meeting?.title ?? "Réunion")}
                            >
                              {hasRequest ? "✓ Justif. envoyée" : "Justifier"}
                            </Button>
                          )}
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ATTENDANCE_CONFIG[a.status].color}`}>
                            {ATTENDANCE_CONFIG[a.status].label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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

      {/* Modal justification d'absence */}
      <Dialog open={!!absenceModal} onOpenChange={(open) => { if (!open) setAbsenceModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Signaler une absence
            </DialogTitle>
          </DialogHeader>
          {absenceModal && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Réunion : <span className="font-medium text-foreground">{absenceModal.meetingTitle}</span>
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Motif (optionnel)</label>
                <Textarea
                  rows={4}
                  placeholder="Expliquez brièvement la raison de votre absence…"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceModal(null)}>Annuler</Button>
            <Button onClick={handleSubmitAbsence} disabled={savingAbsence} className="gap-1.5">
              {savingAbsence ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Signaler mon absence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileBDLSuivi;