import { useState, useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Plus, ChevronLeft, Send, Clock,
  CheckCircle2, XCircle, Loader2, Calendar, User,
  BookOpen, Headphones, RefreshCw
} from "lucide-react";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
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
  handler_name?: string | null;
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
  in_progress: { label: "En cours",    color: "bg-blue-100 text-blue-800 border-blue-300",        icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  resolved:    { label: "Traité",      color: "bg-green-100 text-green-800 border-green-300",     icon: <CheckCircle2 className="h-3 w-3" /> },
  accepted:    { label: "Acceptée",    color: "bg-green-100 text-green-800 border-green-300",     icon: <CheckCircle2 className="h-3 w-3" /> },
  refused:     { label: "Refusée",     color: "bg-red-100 text-red-800 border-red-300",           icon: <XCircle className="h-3 w-3" /> },
  closed:      { label: "Clôturé",     color: "bg-gray-100 text-gray-600 border-gray-300",        icon: <XCircle className="h-3 w-3" /> },
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

// ─── Main Component ───────────────────────────────────────────────────────────

const Support = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Views: 'list' | 'new' | 'detail'
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // New ticket form
  const [form, setForm] = useState({
    subject: "",
    description: "",
    ticket_type: "support" as "support" | "audience",
    requester_class: "",
  });

  // Message reply
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Profile
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // ── Load profile & tickets ───────────────────────────────────────────────────
  useEffect(() => {
    document.title = "Support – Bureau des Lycéens"
    if (user) {
      loadProfile();
      loadTickets();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user!.id)
      .single();
    if (data) setProfile(data as any);
  };

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets" as any)
      .select("*")
      .eq("requester_user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des demandes");
    } else {
      // Enrich with handler name
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
    }
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

  // ── Create ticket ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("support_tickets" as any).insert({
      requester_user_id: user!.id,
      requester_name: profile?.full_name ?? "Utilisateur",
      requester_email: profile?.email ?? user!.email,
      requester_class: form.requester_class || null,
      subject: form.subject,
      description: form.description,
      ticket_type: form.ticket_type,
      status: "pending",
    });

    if (error) {
      toast.error("Erreur lors de l'envoi de la demande");
    } else {
      toast.success("Demande envoyée avec succès !");
      setForm({ subject: "", description: "", ticket_type: "support", requester_class: "" });
      setView("list");
      loadTickets();
    }
    setLoading(false);
  };

  // ── Open ticket detail ───────────────────────────────────────────────────────
  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView("detail");
    await loadMessages(ticket.id);
  };

  // ── Send reply ───────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    if (selectedTicket.status === "resolved" || selectedTicket.status === "closed" || selectedTicket.status === "refused") {
      toast.error("Cette demande est clôturée, vous ne pouvez plus répondre.");
      return;
    }

    setSendingReply(true);
    const { error } = await supabase.from("support_messages" as any).insert({
      ticket_id: selectedTicket.id,
      sender_user_id: user!.id,
      sender_name: profile?.full_name ?? "Utilisateur",
      is_staff: false,
      content: reply.trim(),
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
    } else {
      setReply("");
      await loadMessages(selectedTicket.id);
    }
    setSendingReply(false);
  };

  const isClosed = (ticket: Ticket) =>
    ["resolved", "closed", "refused", "accepted"].includes(ticket.status);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (authLoading) {
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
      <MaintenanceOverlay>
        <main className="flex-1">
          {/* Hero */}
          <section className="gradient-institutional text-white py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <Headphones className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Support & Demandes</h1>
                  <p className="text-white/80 mt-1">
                    Posez vos questions, demandez une audience ou signalez un problème.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-10 max-w-5xl">
            {/* ══ LIST VIEW ══════════════════════════════════════════════════════ */}
            {view === "list" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Mes demandes</h2>
                  <Button onClick={() => setView("new")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvelle demande
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : tickets.length === 0 ? (
                  <Card className="shadow-card">
                    <CardContent className="py-16 text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">Aucune demande</h3>
                      <p className="text-muted-foreground">
                        Vous n'avez pas encore effectué de demande.
                      </p>
                      <Button onClick={() => setView("new")} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Créer une demande
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        className="shadow-card hover:shadow-elegant transition-all cursor-pointer"
                        onClick={() => openTicket(ticket)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-base truncate">
                                  {ticket.subject}
                                </span>
                                <StatusBadge status={ticket.status} />
                                <Badge variant="outline" className="text-xs">
                                  {ticket.ticket_type === "audience" ? "🎤 Audience" : "💬 Support"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {ticket.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(ticket.created_at)}
                                </span>
                                {ticket.handler_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Traité par {ticket.handler_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180 flex-shrink-0 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ NEW TICKET VIEW ════════════════════════════════════════════════ */}
            {view === "new" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setView("list")}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour
                  </Button>
                  <h2 className="text-2xl font-bold">Nouvelle demande</h2>
                </div>

                <Card className="shadow-card">
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Readonly info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nom</Label>
                          <p className="font-medium">{profile?.full_name ?? "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                          <p className="font-medium">{profile?.email ?? user?.email ?? "—"}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="req-class">Classe (optionnel)</Label>
                        <Input
                          id="req-class"
                          value={form.requester_class}
                          onChange={(e) => setForm({ ...form, requester_class: e.target.value })}
                          placeholder="Ex: Terminale A"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket-type">Type de demande *</Label>
                        <Select
                          value={form.ticket_type}
                          onValueChange={(v) => setForm({ ...form, ticket_type: v as any })}
                        >
                          <SelectTrigger id="ticket-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="support">💬 Demande de support / question</SelectItem>
                            <SelectItem value="audience">🎤 Demande d'audience auprès du BDL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Objet de la demande *</Label>
                        <Input
                          id="subject"
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          placeholder="Résumez votre demande en quelques mots"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          rows={6}
                          placeholder="Décrivez votre demande en détail..."
                          required
                        />
                      </div>

                      {form.ticket_type === "audience" && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                          <strong>ℹ️ Demande d'audience</strong> — Votre demande sera examinée par le Président,
                          la Vice-Présidente, la Secrétaire Générale ou le Directeur de la Communication.
                          Vous serez notifié(e) de la décision ici.
                        </div>
                      )}

                      <div className="flex gap-3 justify-end">
                        <Button variant="outline" type="button" onClick={() => setView("list")}>
                          Annuler
                        </Button>
                        <Button type="submit" disabled={loading} className="gap-2">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Envoyer la demande
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ══ DETAIL VIEW ════════════════════════════════════════════════════ */}
            {view === "detail" && selectedTicket && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { setView("list"); loadTickets(); }}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour
                  </Button>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold truncate">{selectedTicket.subject}</h2>
                  </div>
                  <StatusBadge status={selectedTicket.status} />
                </div>

                {/* Ticket info card */}
                <Card className="shadow-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                        <p className="font-medium">
                          {selectedTicket.ticket_type === "audience" ? "🎤 Audience" : "💬 Support"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Envoyé le</p>
                        <p className="font-medium">{formatDate(selectedTicket.created_at)}</p>
                      </div>
                      {selectedTicket.handler_name && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Traité par</p>
                          <p className="font-medium">{selectedTicket.handler_name}</p>
                        </div>
                      )}
                      {selectedTicket.handled_at && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Le</p>
                          <p className="font-medium">{formatDate(selectedTicket.handled_at)}</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description initiale</p>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{selectedTicket.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Messages thread */}
                <Card className="shadow-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Discussion
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => loadMessages(selectedTicket.id)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Messages list */}
                    <div className="px-6 space-y-4 max-h-[500px] overflow-y-auto py-4">
                      {messages.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-8">
                          Aucun message pour le moment. Vous pouvez envoyer un message ci-dessous.
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.is_staff ? "justify-start" : "justify-end"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 space-y-1 ${
                                msg.is_staff
                                  ? "bg-muted text-foreground rounded-tl-sm"
                                  : "bg-primary text-primary-foreground rounded-tr-sm"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold ${msg.is_staff ? "text-primary" : "text-primary-foreground/80"}`}>
                                  {msg.is_staff ? `🛡️ ${msg.sender_name}` : `👤 ${msg.sender_name}`}
                                </span>
                                <span className={`text-xs ${msg.is_staff ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
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

                    {/* Reply box */}
                    {!isClosed(selectedTicket) ? (
                      <div className="px-6 pb-6 pt-3 border-t mt-2">
                        <div className="flex gap-2">
                          <Textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Écrivez votre message..."
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
                      <div className="px-6 pb-6 pt-4 border-t mt-2">
                        <p className="text-sm text-center text-muted-foreground italic">
                          Cette demande est clôturée — la discussion est fermée.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </MaintenanceOverlay>
      <Footer />
    </div>
  );
};

export default Support;