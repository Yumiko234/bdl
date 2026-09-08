import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, CheckCircle2, Clock, AlertCircle,
  Star, TrendingUp, Users, Target, StickyNote, X, Save,
  ChevronDown, ChevronUp, Award, BarChart2, Calendar,
  UserCheck, UserX, UserMinus, CalendarClock, ClipboardList,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BDLMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role_label: string;
  hasAccount: boolean;
}

interface Action {
  id: string;
  title: string;
  description: string | null;
  category: "petite" | "normale" | "grande";
  points: number;
  status: "a_faire" | "en_cours" | "terminee";
  assigned_to: string;
  assigned_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  member_id: string;
  author_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  author_name?: string;
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  description: string | null;
  created_at: string;
}

type AttendanceStatus = "present" | "absent" | "excuse";

interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: AttendanceStatus;
}

interface MemberStats {
  member: BDLMember;
  totalPoints: number;
  totalActions: number;
  done: number;
  inProgress: number;
  todo: number;
  actions: Action[];
  notes: Note[];
  meetingsPresent: number;
  meetingsExcused: number;
  meetingsAbsent: number;
  attendanceRate: number; // % de présence sur (présent + absent), excusés exclus du calcul
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  petite:  { label: "Petite action",  points: 0.5, color: "bg-blue-100 text-blue-700 border-blue-200",   icon: "⭐" },
  normale: { label: "Action normale", points: 1.0, color: "bg-amber-100 text-amber-700 border-amber-200", icon: "⭐⭐" },
  grande:  { label: "Grande action",  points: 2.0, color: "bg-purple-100 text-purple-700 border-purple-200", icon: "⭐⭐⭐" },
};

const STATUS_CONFIG = {
  a_faire:  { label: "À faire",    color: "bg-gray-100 text-gray-600 border-gray-300",     icon: <AlertCircle className="h-3 w-3" /> },
  en_cours: { label: "En cours",   color: "bg-blue-100 text-blue-700 border-blue-200",      icon: <Clock className="h-3 w-3" /> },
  terminee: { label: "Terminée",   color: "bg-green-100 text-green-700 border-green-200",   icon: <CheckCircle2 className="h-3 w-3" /> },
};

const POINTS_BY_CATEGORY = { petite: 0.5, normale: 1.0, grande: 2.0 };

const ATTENDANCE_CONFIG = {
  present: { label: "Présent",  color: "bg-green-100 text-green-700 border-green-200",  icon: <UserCheck className="h-3 w-3" /> },
  absent:  { label: "Absent",   color: "bg-red-100 text-red-700 border-red-200",        icon: <UserX className="h-3 w-3" /> },
  excuse:  { label: "Excusé",   color: "bg-amber-100 text-amber-700 border-amber-200",  icon: <UserMinus className="h-3 w-3" /> },
};

const BAR_COLORS = [
  "#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444",
  "#EC4899","#14B8A6","#F97316","#6366F1","#84CC16",
];

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Action["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: Action["category"] }) {
  const cfg = CATEGORY_CONFIG[category];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.icon} {cfg.label} • {cfg.points} pt{cfg.points > 1 ? "s" : ""}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SuiviActionsManagement = () => {
  const [members, setMembers] = useState<BDLMember[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [showNoteForm, setShowNoteForm] = useState<string | null>(null); // member id
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState({ title: "", meeting_date: "", description: "" });

  // Forms
  const [actionForm, setActionForm] = useState({
    title: "",
    description: "",
    category: "normale" as Action["category"],
    points: 1.0,
    status: "a_faire" as Action["status"],
    assigned_to: "",
    due_date: "",
  });
  const [noteForm, setNoteForm] = useState({ content: "", is_private: false });

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setCurrentUser({ id: user.id, name: (p as any)?.full_name ?? "Staff" });
      }
      await Promise.all([loadMembers(), loadActions(), loadNotes(), loadMeetings(), loadAttendance()]);
      setLoading(false);
    })();
  }, []);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("bdl_members")
      .select("id, user_id, full_name, role_label, avatar_url")
      .order("display_order");
    if (!error && data) {
      // Map to use user_id as the primary key for linking with actions
      const mapped = (data as any[]).map((m) => ({
        id: m.user_id ?? m.id,
        full_name: m.full_name,
        email: "",
        avatar_url: m.avatar_url,
        role_label: m.role_label,
        hasAccount: !!m.user_id,
      }));
      setMembers(mapped);
    }
  };

  const loadActions = async () => {
    const { data, error } = await supabase
      .from("bdl_actions" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setActions(data as unknown as Action[]);
  };

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("bdl_member_notes" as any)
      .select("*, profiles!bdl_member_notes_author_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const mapped = (data as any[]).map((n) => ({
        ...n,
        author_name: n.profiles?.full_name ?? "Inconnu",
      }));
      setNotes(mapped);
    }
  };

  const loadMeetings = async () => {
    const { data, error } = await supabase
      .from("bdl_meetings" as any)
      .select("*")
      .order("meeting_date", { ascending: false });
    if (!error && data) setMeetings(data as unknown as Meeting[]);
  };

  const loadAttendance = async () => {
    const { data, error } = await supabase
      .from("bdl_meeting_attendance" as any)
      .select("id, meeting_id, member_id, status");
    if (!error && data) setAttendance(data as unknown as Attendance[]);
  };

  // ── Stats computation ────────────────────────────────────────────────────────

  const getMemberStats = (): MemberStats[] => {
    return members.map((member) => {
      const memberActions = actions.filter((a) => a.assigned_to === member.id);
      const memberNotes = notes.filter((n) => n.member_id === member.id);
      const doneActions = memberActions.filter((a) => a.status === "terminee");
      const totalPoints = doneActions.reduce((sum, a) => sum + a.points, 0);

      const memberAttendance = attendance.filter((a) => a.member_id === member.id);
      const meetingsPresent = memberAttendance.filter((a) => a.status === "present").length;
      const meetingsAbsent = memberAttendance.filter((a) => a.status === "absent").length;
      const meetingsExcused = memberAttendance.filter((a) => a.status === "excuse").length;
      const attendanceBase = meetingsPresent + meetingsAbsent; // excusés hors calcul du taux
      const attendanceRate = attendanceBase > 0 ? Math.round((meetingsPresent / attendanceBase) * 100) : 0;

      return {
        member,
        totalPoints,
        totalActions: memberActions.length,
        done: doneActions.length,
        inProgress: memberActions.filter((a) => a.status === "en_cours").length,
        todo: memberActions.filter((a) => a.status === "a_faire").length,
        actions: memberActions,
        notes: memberNotes,
        meetingsPresent,
        meetingsAbsent,
        meetingsExcused,
        attendanceRate,
      };
    });
  };

  const memberStats = getMemberStats();
  const sortedStats = [...memberStats].sort((a, b) => b.totalPoints - a.totalPoints);

  // ── Action CRUD ──────────────────────────────────────────────────────────────

  const openCreateAction = (memberId?: string) => {
    setEditingAction(null);
    setActionForm({
      title: "",
      description: "",
      category: "normale",
      points: 1.0,
      status: "a_faire",
      assigned_to: memberId ?? "",
      due_date: "",
    });
    setShowActionForm(true);
  };

  const openEditAction = (action: Action) => {
    setEditingAction(action);
    setActionForm({
      title: action.title,
      description: action.description ?? "",
      category: action.category,
      points: action.points,
      status: action.status,
      assigned_to: action.assigned_to,
      due_date: action.due_date ?? "",
    });
    setShowActionForm(true);
  };

  const handleSaveAction = async () => {
    if (!actionForm.title.trim() || !actionForm.assigned_to) {
      toast.error("Titre et membre assigné requis.");
      return;
    }
    const target = members.find((m) => m.id === actionForm.assigned_to);
    if (!target?.hasAccount) {
      toast.error(
        "Ce membre n'a pas de compte lié. Liez sa fiche à un compte dans « Membres du Bureau » avant de lui assigner une action."
      );
      return;
    }
    const payload: any = {
      title: actionForm.title.trim(),
      description: actionForm.description.trim() || null,
      category: actionForm.category,
      points: actionForm.points,
      status: actionForm.status,
      assigned_to: actionForm.assigned_to,
      assigned_by: currentUser?.id ?? null,
      due_date: actionForm.due_date || null,
      updated_at: new Date().toISOString(),
      completed_at: actionForm.status === "terminee" ? new Date().toISOString() : null,
    };

    let error: any;
    if (editingAction) {
      ({ error } = await (supabase.from("bdl_actions" as any).update(payload).eq("id", editingAction.id)));
    } else {
      ({ error } = await (supabase.from("bdl_actions" as any).insert(payload)));
    }

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(editingAction ? "Action mise à jour !" : "Action créée !");
      setShowActionForm(false);
      setEditingAction(null);
      await loadActions();
    }
  };

  const handleDeleteAction = async (id: string) => {
    const { error } = await (supabase.from("bdl_actions" as any).delete().eq("id", id));
    if (error) toast.error("Erreur suppression");
    else { toast.success("Action supprimée."); await loadActions(); }
  };

  const handleStatusChange = async (id: string, newStatus: Action["status"]) => {
    const { error } = await (supabase.from("bdl_actions" as any).update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      completed_at: newStatus === "terminee" ? new Date().toISOString() : null,
    }).eq("id", id));
    if (error) toast.error("Erreur mise à jour");
    else { await loadActions(); }
  };

  // ── Note CRUD ────────────────────────────────────────────────────────────────

  const handleSaveNote = async (memberId: string) => {
    if (!noteForm.content.trim()) { toast.error("Note vide."); return; }
    const { error } = await (supabase.from("bdl_member_notes" as any).insert({
      member_id: memberId,
      author_id: currentUser!.id,
      content: noteForm.content.trim(),
      is_private: noteForm.is_private,
    }));
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Note ajoutée.");
      setNoteForm({ content: "", is_private: false });
      setShowNoteForm(null);
      await loadNotes();
    }
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await (supabase.from("bdl_member_notes" as any).delete().eq("id", id));
    if (error) toast.error("Erreur suppression");
    else { toast.success("Note supprimée."); await loadNotes(); }
  };

  // ── Meeting CRUD ─────────────────────────────────────────────────────────────

  const openCreateMeeting = () => {
    setMeetingForm({ title: "", meeting_date: new Date().toISOString().slice(0, 10), description: "" });
    setShowMeetingForm(true);
  };

  const handleSaveMeeting = async () => {
    if (!meetingForm.title.trim() || !meetingForm.meeting_date) {
      toast.error("Titre et date requis.");
      return;
    }
    const { data, error } = await (supabase.from("bdl_meetings" as any).insert({
      title: meetingForm.title.trim(),
      meeting_date: meetingForm.meeting_date,
      description: meetingForm.description.trim() || null,
      created_by: currentUser?.id ?? null,
    }).select().single());

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Réunion créée !");
    setShowMeetingForm(false);
    await loadMeetings();
    if (data) setExpandedMeeting((data as any).id); // ouvre direct la feuille de présence
  };

  const handleDeleteMeeting = async (id: string) => {
    const { error } = await (supabase.from("bdl_meetings" as any).delete().eq("id", id));
    if (error) toast.error("Erreur suppression");
    else {
      toast.success("Réunion supprimée.");
      await Promise.all([loadMeetings(), loadAttendance()]);
    }
  };

  // ── Attendance CRUD (upsert du statut d'un membre pour une réunion) ────────

  const setMemberAttendance = async (meetingId: string, memberId: string, status: AttendanceStatus) => {
    const existing = attendance.find((a) => a.meeting_id === meetingId && a.member_id === memberId);

    // Mise à jour optimiste de l'UI
    if (existing) {
      setAttendance((prev) => prev.map((a) => (a.id === existing.id ? { ...a, status } : a)));
    } else {
      setAttendance((prev) => [...prev, { id: `temp-${meetingId}-${memberId}`, meeting_id: meetingId, member_id: memberId, status }]);
    }

    const { error } = await (supabase.from("bdl_meeting_attendance" as any).upsert(
      {
        meeting_id: meetingId,
        member_id: memberId,
        status,
        recorded_by: currentUser?.id ?? null,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "meeting_id,member_id" }
    ));

    if (error) {
      toast.error("Erreur : " + error.message);
      await loadAttendance(); // rollback en rechargeant l'état réel
    }
  };

  // ── Chart data ───────────────────────────────────────────────────────────────

  const barData = sortedStats
    .filter((s) => s.totalActions > 0)
    .map((s, i) => ({
      name: s.member.full_name.split(" ")[0],
      fullName: s.member.full_name,
      points: s.totalPoints,
      actions: s.done,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));

  const radarData = sortedStats
    .filter((s) => s.totalActions > 0)
    .slice(0, 6)
    .map((s) => ({
      member: s.member.full_name.split(" ")[0],
      petites: s.actions.filter((a) => a.category === "petite" && a.status === "terminee").length,
      normales: s.actions.filter((a) => a.category === "normale" && a.status === "terminee").length,
      grandes: s.actions.filter((a) => a.category === "grande" && a.status === "terminee").length,
    }));

  const globalStats = {
    totalActions: actions.length,
    done: actions.filter((a) => a.status === "terminee").length,
    inProgress: actions.filter((a) => a.status === "en_cours").length,
    todo: actions.filter((a) => a.status === "a_faire").length,
    totalPoints: actions.filter((a) => a.status === "terminee").reduce((s, a) => s + a.points, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Suivi des Actions BDL
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Attribuez et suivez les actions de chaque membre du Bureau.
          </p>
        </div>
        <Button onClick={() => openCreateAction()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle action
        </Button>
      </div>

      {/* ── Global stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Actions totales", value: globalStats.totalActions, icon: <Target className="h-5 w-5" />, color: "text-primary" },
          { label: "Terminées", value: globalStats.done, icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-600" },
          { label: "En cours", value: globalStats.inProgress, icon: <Clock className="h-5 w-5" />, color: "text-blue-600" },
          { label: "À faire", value: globalStats.todo, icon: <AlertCircle className="h-5 w-5" />, color: "text-gray-500" },
          { label: "Points distribués", value: globalStats.totalPoints.toFixed(1), icon: <Star className="h-5 w-5" />, color: "text-amber-500" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex-shrink-0 ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts ── */}
      {barData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart - points par membre */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Points par membre (actions terminées)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: any, _: any, props: any) => [
                      `${v} pts — ${props.payload.actions} action(s)`,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar - répartition par catégorie */}
          {radarData.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Répartition par catégorie (top 6)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="member" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="Petites" dataKey="petites" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    <Radar name="Normales" dataKey="normales" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                    <Radar name="Grandes" dataKey="grandes" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Classement rapide ── */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Classement des membres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedStats.map((s, i) => (
              <div key={s.member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                  #{i + 1}
                </span>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {s.member.avatar_url && <img src={s.member.avatar_url} alt={s.member.full_name} loading="lazy" className="h-8 w-8 rounded-full object-cover" />}
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{getInitials(s.member.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.member.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.member.role_label}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                  <span className="hidden sm:block">{s.done}/{s.totalActions} terminées</span>
                  <span className="font-bold text-amber-600">{s.totalPoints.toFixed(1)} pts</span>
                </div>
                <Button size="sm" variant="outline" disabled={!s.member.hasAccount} title={s.member.hasAccount ? undefined : "Fiche sans compte lié"} onClick={() => openCreateAction(s.member.id)} className="hidden sm:flex gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Action
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Réunions et présences ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Présence aux réunions
          </h3>
          <Button size="sm" onClick={openCreateMeeting} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle réunion
          </Button>
        </div>

        {meetings.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucune réunion enregistrée pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {meetings.map((meeting) => {
              const meetingAttendance = attendance.filter((a) => a.meeting_id === meeting.id);
              const presentCount = meetingAttendance.filter((a) => a.status === "present").length;
              const isOpen = expandedMeeting === meeting.id;

              return (
                <Card key={meeting.id} className="shadow-card overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpandedMeeting(isOpen ? null : meeting.id)}
                  >
                    <div className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{meeting.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {fmtDate(meeting.meeting_date)}
                          </span>
                          <span>{presentCount}/{members.length} présent(s)</span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette réunion ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Les présences enregistrées pour « {meeting.title} » seront aussi supprimées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMeeting(meeting.id)}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-1.5">
                      {members.map((member) => {
                        const current = meetingAttendance.find((a) => a.member_id === member.id)?.status;
                        return (
                          <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              {member.avatar_url && <img src={member.avatar_url} alt={member.full_name} loading="lazy" className="h-7 w-7 rounded-full object-cover" />}
                              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{getInitials(member.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 min-w-0 text-sm truncate">{member.full_name}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(["present", "excuse", "absent"] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => setMemberAttendance(meeting.id, member.id, status)}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-all ${
                                    current === status
                                      ? ATTENDANCE_CONFIG[status].color + " ring-1 ring-offset-1 ring-current"
                                      : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                                  }`}
                                >
                                  {ATTENDANCE_CONFIG[status].icon}
                                  <span className="hidden sm:inline">{ATTENDANCE_CONFIG[status].label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Member detail cards ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Suivi individuel
        </h3>
        {sortedStats.map((s) => {
          const isExpanded = expandedMembers.has(s.member.id);
          return (
            <Card key={s.member.id} className="shadow-card overflow-hidden">
              {/* Member header */}
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  const next = new Set(expandedMembers);
                  isExpanded ? next.delete(s.member.id) : next.add(s.member.id);
                  setExpandedMembers(next);
                }}
              >
                <div className="flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    {s.member.avatar_url && <img src={s.member.avatar_url} alt={s.member.full_name} loading="lazy" className="h-12 w-12 rounded-full object-cover" />}
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">{getInitials(s.member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base">{s.member.full_name}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{s.member.role_label}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="text-amber-600 font-bold">{s.totalPoints.toFixed(1)} pts</span>
                      <span>{s.done} terminée(s)</span>
                      <span>{s.inProgress} en cours</span>
                      <span>{s.todo} à faire</span>
                      <span>{s.notes.length} note(s)</span>
                      {(s.meetingsPresent + s.meetingsAbsent) > 0 && (
                        <span className={`flex items-center gap-1 font-medium ${s.attendanceRate >= 75 ? "text-green-600" : s.attendanceRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          <CalendarClock className="h-3 w-3" />
                          {s.attendanceRate}% de présence ({s.meetingsPresent}/{s.meetingsPresent + s.meetingsAbsent})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      disabled={!s.member.hasAccount}
                      title={s.member.hasAccount ? undefined : "Fiche sans compte lié"}
                      onClick={(e) => { e.stopPropagation(); openCreateAction(s.member.id); }}
                    >
                      <Plus className="h-3 w-3" /> Action
                    </Button>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t px-5 pb-5 space-y-5">

                  {/* Progress bar */}
                  {s.totalActions > 0 && (
                    <div className="pt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progression</span>
                        <span>{Math.round((s.done / s.totalActions) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${(s.done / s.totalActions) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Présences aux réunions */}
                  {(s.meetingsPresent + s.meetingsAbsent + s.meetingsExcused) > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-green-50 border-green-200 p-2.5 text-center">
                        <p className="text-lg font-bold text-green-700">{s.meetingsPresent}</p>
                        <p className="text-xs text-green-700/80">Présent(s)</p>
                      </div>
                      <div className="rounded-lg border bg-amber-50 border-amber-200 p-2.5 text-center">
                        <p className="text-lg font-bold text-amber-700">{s.meetingsExcused}</p>
                        <p className="text-xs text-amber-700/80">Excusé(s)</p>
                      </div>
                      <div className="rounded-lg border bg-red-50 border-red-200 p-2.5 text-center">
                        <p className="text-lg font-bold text-red-700">{s.meetingsAbsent}</p>
                        <p className="text-xs text-red-700/80">Absent(s)</p>
                      </div>
                    </div>
                  )}

                  {/* Actions list */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions ({s.actions.length})
                    </p>
                    {s.actions.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">Aucune action assignée.</p>
                    ) : (
                      s.actions.map((action) => (
                        <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{action.title}</p>
                              <StatusBadge status={action.status} />
                              <CategoryBadge category={action.category} />
                            </div>
                            {action.description && (
                              <p className="text-xs text-muted-foreground">{action.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {action.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Échéance : {fmtDate(action.due_date)}
                                </span>
                              )}
                              <span>Créée le {fmtDate(action.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Quick status change */}
                            <Select
                              value={action.status}
                              onValueChange={(v) => handleStatusChange(action.id, v as Action["status"])}
                            >
                              <SelectTrigger className="h-7 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="a_faire">À faire</SelectItem>
                                <SelectItem value="en_cours">En cours</SelectItem>
                                <SelectItem value="terminee">Terminée</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" onClick={() => openEditAction(action)} className="h-7 w-7 p-0">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer l'action ?</AlertDialogTitle>
                                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAction(action.id)}>Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Notes ({s.notes.length})
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => setShowNoteForm(showNoteForm === s.member.id ? null : s.member.id)}
                      >
                        <StickyNote className="h-3 w-3" />
                        {showNoteForm === s.member.id ? "Annuler" : "Ajouter une note"}
                      </Button>
                    </div>

                    {showNoteForm === s.member.id && (
                      <div className="space-y-2 p-3 rounded-lg border bg-yellow-50/50 border-yellow-200">
                        <Textarea
                          rows={3}
                          placeholder="Rédigez votre note sur ce membre..."
                          value={noteForm.content}
                          onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                          className="text-sm"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={noteForm.is_private}
                              onChange={(e) => setNoteForm({ ...noteForm, is_private: e.target.checked })}
                              className="rounded"
                            />
                            Note privée (visible seulement par vous et le membre)
                          </label>
                          <Button size="sm" className="gap-1 text-xs" onClick={() => handleSaveNote(s.member.id)}>
                            <Save className="h-3 w-3" /> Enregistrer
                          </Button>
                        </div>
                      </div>
                    )}

                    {s.notes.map((note) => (
                      <div key={note.id} className={`p-3 rounded-lg border text-sm space-y-1 ${note.is_private ? "bg-yellow-50 border-yellow-200" : "bg-muted/20"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1">{note.content}</p>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive">
                                <X className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer la note ?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Par {note.author_name}</span>
                          <span>{fmtDate(note.created_at)}</span>
                          {note.is_private && <span className="text-yellow-600 font-medium">🔒 Privée</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Action Form Modal ── */}
      {showActionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">
                {editingAction ? "Modifier l'action" : "Nouvelle action"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowActionForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {/* Assigné à */}
              <div className="space-y-2">
                <Label>Membre assigné *</Label>
                <Select value={actionForm.assigned_to} onValueChange={(v) => setActionForm({ ...actionForm, assigned_to: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un membre…" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id} disabled={!m.hasAccount}>
                        {m.full_name} — {m.role_label}
                        {!m.hasAccount && " (pas de compte lié)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titre */}
              <div className="space-y-2">
                <Label>Titre de l'action *</Label>
                <Input
                  value={actionForm.title}
                  onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                  placeholder="Ex : Rédiger le compte-rendu de réunion"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea
                  rows={3}
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  placeholder="Détails supplémentaires…"
                />
              </div>

              {/* Catégorie */}
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={actionForm.category}
                  onValueChange={(v: Action["category"]) => {
                    setActionForm({ ...actionForm, category: v, points: POINTS_BY_CATEGORY[v] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petite">⭐ Petite action — 0,5 pt</SelectItem>
                    <SelectItem value="normale">⭐⭐ Action normale — 1 pt</SelectItem>
                    <SelectItem value="grande">⭐⭐⭐ Grande action — 2 pts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Points (override manuel) */}
              <div className="space-y-2">
                <Label>Points attribués</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={actionForm.points}
                  onChange={(e) => setActionForm({ ...actionForm, points: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Points auto-calculés selon la catégorie, modifiables si besoin.</p>
              </div>

              {/* Statut */}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={actionForm.status} onValueChange={(v: Action["status"]) => setActionForm({ ...actionForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_faire">À faire</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Échéance */}
              <div className="space-y-2">
                <Label>Date d'échéance (optionnel)</Label>
                <Input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowActionForm(false)}>Annuler</Button>
              <Button onClick={handleSaveAction}>
                {editingAction ? "Mettre à jour" : "Créer l'action"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Meeting Form Modal ── */}
      {showMeetingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">Nouvelle réunion</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMeetingForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Titre de la réunion *</Label>
                <Input
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="Ex : Réunion hebdomadaire du Bureau"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={meetingForm.meeting_date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea
                  rows={3}
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                  placeholder="Ordre du jour, contexte…"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Une fois créée, vous pourrez pointer la présence de chaque membre directement depuis la liste des réunions.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowMeetingForm(false)}>Annuler</Button>
              <Button onClick={handleSaveMeeting}>Créer la réunion</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};