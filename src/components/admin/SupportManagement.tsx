import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Headphones, ChevronLeft, Send, Clock, CheckCircle2, XCircle,
  Loader2, User, Filter, RefreshCw, MessageCircle, Calendar,
  ThumbsUp, ThumbsDown, AlertCircle, Search
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  requester_user_id: string | null;
  requester_name: string;
  requester_email: string;
  requester_class: string | null;
  subject: string;
  description: string;
  ticket_type: "support" | "audience";
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
  handler_name?: string | null;
  unread?: boolean;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_user_id: string | null;
  sender_name: string;
  is_staff: boolean;
  content: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "En attente",   color: "bg-amber-100 text-amber-800 border-amber-300",    icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "En cours",     color: "bg-blue-100 text-blue-800 border-blue-300",       icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  resolved:    { label: "Traité",       color: "bg-green-100 text-green-800 border-green-300",    icon: <CheckCircle2 className="h-3 w-3" /> },
  accepted:    { label: "Acceptée",     color: "bg-green-100 text-green-800 border-green-300",    icon: <CheckCircle2 className="h-3 w-3" /> },
  refused:     { label: "Refusée",      color: "bg-red-100 text-red-800 border-red-300",          icon: <XCircle className="h-3 w-3" /> },
  closed:      { label: "Clôturé",      color: "bg-gray-100 text-gray-600 border-gray-300",       icon: <XCircle className="h-3 w-3" /> },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-300", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ─── Roles that can handle audience requests ──────────────────────────────────
const AUDIENCE_ROLES = ["administrator","president", "vice_president", "secretary_general", "communication_manager"];

// ─── Component ────────────────────────────────────────────────────────────────

interface SupportManagementProps {
  currentUserRole?: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const SupportManagement = ({
  currentUserRole = "bdl_member",
  currentUserId = "",
  currentUserName = "Staff BDL",
}: SupportManagementProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "support" | "audience">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canHandleAudience = AUDIENCE_ROLES.includes(currentUserRole);

  // ── Load tickets ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des tickets");
      setLoading(false);
      return;
    }

    // Enrich with handler names
    const enriched = await Promise.all(
      (data || []).map(async (t: any) => {
        if (t.handled_by) {
          const { data: hp } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", t.handled_by)
            .single();
          return { ...t, handler_name: (hp as any)?.full_name ?? null };
        }
        return { ...t, handler_name: null };
      })
    );
    setTickets(enriched as Ticket[]);
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_messages" as any)
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ── Status update ─────────────────────────────────────────────────────────────
  const updateStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase
      .from("support_tickets" as any)
      .update({
        status: newStatus,
        handled_by: currentUserId || null,
        handled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du statut");
    } else {
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) =>
          prev ? { ...prev, status: newStatus, handled_by: currentUserId, handled_at: new Date().toISOString() } : prev
        );
      }
    }
  };

  // ── Send staff reply ──────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;

    const isClosed = ["resolved", "closed", "refused"].includes(selectedTicket.status);
    if (isClosed) {
      toast.error("Ce ticket est clôturé.");
      return;
    }

    setSendingReply(true);
    const { error } = await supabase.from("support_messages" as any).insert({
      ticket_id: selectedTicket.id,
      sender_user_id: currentUserId || null,
      sender_name: currentUserName,
      is_staff: true,
      content: reply.trim(),
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
    } else {
      // Auto mark as in_progress if still pending
      if (selectedTicket.status === "pending") {
        await updateStatus(selectedTicket.id, "in_progress");
      }
      setReply("");
      await loadMessages(selectedTicket.id);
    }
    setSendingReply(false);
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filteredTickets = tickets.filter((t) => {
    const matchType = filterType === "all" || t.ticket_type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSearch =
      !search ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.requester_name.toLowerCase().includes(search.toLowerCase()) ||
      t.requester_email.toLowerCase().includes(search.toLowerCase());
    const canView = t.ticket_type === "audience" ? canHandleAudience : true;
    return matchType && matchStatus && matchSearch && canView;
  });

  // Stats
  const stats = {
    total: tickets.filter((t) => t.ticket_type === "audience" ? canHandleAudience : true).length,
    pending: tickets.filter((t) => t.status === "pending" && (t.ticket_type === "audience" ? canHandleAudience : true)).length,
    inProgress: tickets.filter((t) => t.status === "in_progress" && (t.ticket_type === "audience" ? canHandleAudience : true)).length,
    resolved: tickets.filter((t) => ["resolved", "accepted", "refused", "closed"].includes(t.status) && (t.ticket_type === "audience" ? canHandleAudience : true)).length,
  };

  const isClosed = (ticket: Ticket) =>
    ["resolved", "closed", "refused", "accepted"].includes(ticket.status);

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────────
  if (selectedTicket) {
    const isAudience = selectedTicket.ticket_type === "audience";
    const canHandleThis = isAudience ? canHandleAudience : true;
    const closed = isClosed(selectedTicket);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setSelectedTicket(null); loadTickets(); }}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{selectedTicket.subject}</h3>
          </div>
          <StatusBadge status={selectedTicket.status} />
          <Badge variant="outline">
            {isAudience ? "🎤 Audience" : "💬 Support"}
          </Badge>
        </div>

        {/* Requester info */}
        <Card className="bg-muted/30">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Demandeur</p>
                <p className="font-semibold">{selectedTicket.requester_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                <p className="font-medium">{selectedTicket.requester_email}</p>
              </div>
              {selectedTicket.requester_class && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Classe</p>
                  <p className="font-medium">{selectedTicket.requester_class}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Envoyé le</p>
                <p className="font-medium">{formatDate(selectedTicket.created_at)}</p>
              </div>
            </div>

            {selectedTicket.handler_name && (
              <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Traité par</p>
                  <p className="font-medium">{selectedTicket.handler_name}</p>
                </div>
                {selectedTicket.handled_at && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Le</p>
                    <p className="font-medium">{formatDate(selectedTicket.handled_at)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{selectedTicket.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status actions */}
        {canHandleThis && (
          <Card className="bg-muted/20">
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Changer le statut :</p>
              <div className="flex flex-wrap gap-2">
                {isAudience ? (
                  <>
                    <Button
                      size="sm"
                      variant={selectedTicket.status === "pending" ? "default" : "outline"}
                      onClick={() => updateStatus(selectedTicket.id, "pending")}
                      disabled={selectedTicket.status === "pending"}
                    >
                      <Clock className="h-4 w-4 mr-1" /> En attente
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => updateStatus(selectedTicket.id, "accepted")}
                      disabled={selectedTicket.status === "accepted"}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" /> Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-700 hover:bg-red-50"
                      onClick={() => updateStatus(selectedTicket.id, "refused")}
                      disabled={selectedTicket.status === "refused"}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" /> Refuser
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(selectedTicket.id, "pending")}
                      disabled={selectedTicket.status === "pending"}
                    >
                      <Clock className="h-4 w-4 mr-1" /> En attente
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500 text-blue-700 hover:bg-blue-50"
                      onClick={() => updateStatus(selectedTicket.id, "in_progress")}
                      disabled={selectedTicket.status === "in_progress"}
                    >
                      <Loader2 className="h-4 w-4 mr-1" /> En cours
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => updateStatus(selectedTicket.id, "resolved")}
                      disabled={selectedTicket.status === "resolved"}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Traité
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-400 text-gray-600 hover:bg-gray-50"
                  onClick={() => updateStatus(selectedTicket.id, "closed")}
                  disabled={selectedTicket.status === "closed"}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Clôturer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Discussion
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => loadMessages(selectedTicket.id)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 space-y-4 max-h-[450px] overflow-y-auto py-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Aucun message pour le moment.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_staff ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 space-y-1 ${
                        msg.is_staff
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${msg.is_staff ? "text-primary-foreground/80" : "text-primary"}`}>
                          {msg.is_staff ? `🛡️ ${msg.sender_name}` : `👤 ${msg.sender_name}`}
                        </span>
                        <span className={`text-xs ${msg.is_staff ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {!closed ? (
              <div className="px-6 pb-6 pt-3 border-t mt-2">
                <div className="flex gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Répondre au demandeur..."
                    rows={3}
                    className="resize-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={sendingReply || !reply.trim()}
                    size="icon"
                    className="h-auto self-end aspect-square"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Ctrl+Entrée pour envoyer</p>
              </div>
            ) : (
              <div className="px-6 pb-5 pt-4 border-t mt-2">
                <p className="text-sm text-center text-muted-foreground italic">
                  Ticket clôturé — la discussion est fermée.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-6 w-6" />
          Gestion du Support
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "bg-muted/50", icon: <MessageCircle className="h-5 w-5 text-muted-foreground" /> },
            { label: "En attente", value: stats.pending, color: "bg-amber-50 border border-amber-200", icon: <Clock className="h-5 w-5 text-amber-600" /> },
            { label: "En cours", value: stats.inProgress, color: "bg-blue-50 border border-blue-200", icon: <Loader2 className="h-5 w-5 text-blue-600" /> },
            { label: "Traités", value: stats.resolved, color: "bg-green-50 border border-green-200", icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 flex items-center gap-3`}>
              {s.icon}
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="support">💬 Support</SelectItem>
              {canHandleAudience && <SelectItem value="audience">🎤 Audience</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="resolved">Traité</SelectItem>
              <SelectItem value="accepted">Acceptée</SelectItem>
              <SelectItem value="refused">Refusée</SelectItem>
              <SelectItem value="closed">Clôturé</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadTickets} title="Actualiser">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Ticket list */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Aucun ticket ne correspond à vos critères.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className={`bg-muted/20 hover:shadow-md transition-all cursor-pointer border ${
                  ticket.status === "pending" ? "border-amber-300" : "border-transparent"
                }`}
                onClick={async () => {
                  setSelectedTicket(ticket);
                  await loadMessages(ticket.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{ticket.subject}</span>
                        <StatusBadge status={ticket.status} />
                        <Badge variant="outline" className="text-xs">
                          {ticket.ticket_type === "audience" ? "🎤 Audience" : "💬 Support"}
                        </Badge>
                        {ticket.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                            <AlertCircle className="h-3 w-3" /> À traiter
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.requester_name}
                          {ticket.requester_class && ` — ${ticket.requester_class}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(ticket.created_at)}
                        </span>
                        {ticket.handler_name && (
                          <span>Traité par {ticket.handler_name}</span>
                        )}
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};