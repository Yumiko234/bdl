import { useEffect, useState, type MutableRefObject } from "react";
import { useChat, useParticipants } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart2, Hand, Loader2, MicOff, Shield, UserCheck, Users, VolumeX, X,
} from "lucide-react";
import { callLivekit } from "./api";
import {
  REACTIONS, isModeratorRole, tally, toRole,
  type ConfRole, type FloatingReaction, type PollState,
} from "./signals";

// ─────────────────────────────────────────────────────────────────────────────
// Statistiques de session (pour le résumé de fin)
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionStats {
  start: number;
  maxParticipants: number;
  messages: number;
}

/** Composant invisible : suit le nombre de participants et de messages. */
export function StatsTracker({ statsRef }: { statsRef: MutableRefObject<SessionStats> }) {
  const participants = useParticipants();
  const { chatMessages } = useChat();

  useEffect(() => {
    statsRef.current.maxParticipants = Math.max(statsRef.current.maxParticipants, participants.length);
  }, [participants.length, statsRef]);

  useEffect(() => {
    statsRef.current.messages = Math.max(statsRef.current.messages, chatMessages.length);
  }, [chatMessages.length, statsRef]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Réactions flottantes
// ─────────────────────────────────────────────────────────────────────────────

export function ReactionsLayer({ items }: { items: FloatingReaction[] }) {
  if (!items.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {items.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-24"
          style={{ left: `${r.x}%`, animation: "floatUp 3s ease-out forwards" }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-3xl drop-shadow-lg select-none">{r.emoji}</span>
            {r.name && (
              <span className="text-white text-xs font-medium bg-black/40 rounded-full px-2 py-0.5 backdrop-blur-sm">
                {r.name.split(" ")[0]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Barre d'outils (en haut à droite de la zone vidéo)
// ─────────────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  role: ConfRole;
  handUp: boolean;
  handsCount: number;
  pollActive: boolean;
  showPeople: boolean;
  showPoll: boolean;
  onReact: (emoji: string) => void;
  onToggleHand: () => void;
  onTogglePeople: () => void;
  onTogglePoll: () => void;
}

export function Toolbar(p: ToolbarProps) {
  const canModerate = isModeratorRole(p.role);
  const iconBtn =
    "relative h-9 w-9 rounded-lg flex items-center justify-center bg-neutral-800/90 text-white hover:bg-neutral-700 transition-colors";

  return (
    <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1.5 max-w-[calc(100%-1.5rem)]">
      <div className="flex items-center gap-0.5 bg-neutral-800/90 rounded-lg px-1.5 h-9">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => p.onReact(emoji)}
            className="text-lg leading-none p-0.5 rounded hover:scale-125 active:scale-110 transition-transform"
            title={`Réaction ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {p.role === "audience" && (
        <button
          onClick={p.onToggleHand}
          className={`${iconBtn} ${p.handUp ? "!bg-amber-500 !text-black" : ""}`}
          title={p.handUp ? "Baisser la main" : "Demander la parole"}
        >
          <Hand className="h-4 w-4" />
        </button>
      )}

      {(canModerate || p.pollActive) && (
        <button
          onClick={p.onTogglePoll}
          className={`${iconBtn} ${p.showPoll ? "!bg-primary" : ""}`}
          title="Sondage"
        >
          <BarChart2 className="h-4 w-4" />
          {p.pollActive && !p.showPoll && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-400" />
          )}
        </button>
      )}

      <button
        onClick={p.onTogglePeople}
        className={`${iconBtn} ${p.showPeople ? "!bg-primary" : ""}`}
        title="Participants"
      >
        <Users className="h-4 w-4" />
        {canModerate && p.handsCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
            {p.handsCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panneau des participants + modération
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<ConfRole, string> = {
  moderator: "Modérateur",
  comoderator: "Co-modérateur",
  speaker: "Speaker",
  audience: "Auditeur",
};

interface PeoplePanelProps {
  conferenceId: string;
  myRole: ConfRole;
  raised: Record<string, { name: string; ts: number }>;
  onClose: () => void;
}

export function PeoplePanel({ conferenceId, myRole, raised, onClose }: PeoplePanelProps) {
  const participants = useParticipants();
  const [busy, setBusy] = useState<string | null>(null);
  const canModerate = isModeratorRole(myRole);
  const isHostLevel = myRole === "moderator"; // seul lui nomme un co-modérateur

  const run = async (key: string, body: Record<string, unknown>, okMsg?: string) => {
    setBusy(key);
    try {
      await callLivekit({ conferenceId, ...body });
      if (okMsg) toast.success(okMsg);
    } catch (e: any) {
      toast.error(e.message ?? "Action impossible.");
    } finally {
      setBusy(null);
    }
  };

  const groups: { role: ConfRole; title: string }[] = [
    { role: "moderator", title: "Modérateurs" },
    { role: "comoderator", title: "Co-modérateur" },
    { role: "speaker", title: "Speakers" },
    { role: "audience", title: "Auditeurs" },
  ];

  return (
    <div className="rounded-xl bg-background text-foreground shadow-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Participants ({participants.length})
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {canModerate && (
        <div className="px-3 py-2 border-b">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 h-8 text-xs"
            disabled={busy === "mute_all"}
            onClick={() => run("mute_all", { action: "mute_all" }, "Tous les micros ont été coupés.")}
          >
            {busy === "mute_all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <VolumeX className="h-3.5 w-3.5" />}
            Couper tous les micros
          </Button>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto px-3 py-2 space-y-3">
        {groups.map(({ role, title }) => {
          const list = participants.filter((p) => toRole(p.attributes?.["role"]) === role);
          if (!list.length) return null;
          return (
            <div key={role}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                {title} ({list.length})
              </p>
              <div className="space-y-1">
                {list.map((p) => {
                  const hand = role === "audience" && !!raised[p.identity];
                  const isGuest = p.identity.startsWith("guest-");
                  const target = !p.isLocal && role !== "moderator";
                  return (
                    <div key={p.identity} className="flex items-center gap-2 text-sm">
                      <span className="truncate flex-1">
                        {p.name || p.identity}
                        {p.isLocal && <span className="text-muted-foreground"> (vous)</span>}
                        {isGuest && <span className="text-muted-foreground"> · invité</span>}
                      </span>
                      {hand && <Hand className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      {role === "comoderator" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Co-mod</Badge>
                      )}

                      {canModerate && target && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {role === "audience" && (
                            <IconAction
                              title="Donner la parole"
                              busy={busy === `promote:${p.identity}`}
                              className={hand ? "text-green-600" : "text-muted-foreground hover:text-green-600"}
                              onClick={() => run(`promote:${p.identity}`, { action: "promote", identity: p.identity }, "Parole accordée.")}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </IconAction>
                          )}
                          {role !== "audience" && p.isMicrophoneEnabled && (
                            <IconAction
                              title="Couper le micro"
                              busy={busy === `mute:${p.identity}`}
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => run(`mute:${p.identity}`, { action: "mute", identity: p.identity })}
                            >
                              <MicOff className="h-3.5 w-3.5" />
                            </IconAction>
                          )}
                          {role === "speaker" && (
                            <IconAction
                              title="Retirer la parole"
                              busy={busy === `demote:${p.identity}`}
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => run(`demote:${p.identity}`, { action: "demote", identity: p.identity }, "Parole retirée.")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </IconAction>
                          )}
                          {isHostLevel && !isGuest && role !== "comoderator" && (
                            <IconAction
                              title="Nommer co-modérateur"
                              busy={busy === `comod:${p.identity}`}
                              className="text-purple-500 hover:text-purple-600"
                              onClick={() => run(`comod:${p.identity}`, { action: "set_comoderator", identity: p.identity }, "Co-modérateur nommé.")}
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </IconAction>
                          )}
                          {isHostLevel && role === "comoderator" && (
                            <IconAction
                              title="Retirer le co-modérateur"
                              busy={busy === "revoke"}
                              className="text-purple-700 hover:text-purple-800"
                              onClick={() => run("revoke", { action: "revoke_comoderator" }, "Co-modérateur retiré.")}
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </IconAction>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconAction(props: {
  title: string; busy: boolean; className: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      title={props.title}
      aria-label={props.title}
      disabled={props.busy}
      onClick={props.onClick}
      className={`p-1 rounded hover:bg-muted disabled:opacity-50 ${props.className}`}
    >
      {props.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : props.children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sondage : création (modérateurs) + carte de vote
// ─────────────────────────────────────────────────────────────────────────────

interface PollPanelProps {
  canCreate: boolean;
  poll: PollState | null;
  myVote: number | null;
  closed: boolean;
  isCreator: boolean;
  onLaunch: (question: string, options: string[]) => boolean;
  onVote: (option: number) => void;
  onClose: () => void;
  onDismiss: () => void;
  onHide: () => void;
}

export function PollPanel(p: PollPanelProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);

  const filled = options.filter((o) => o.trim()).length;
  const canSubmit = question.trim().length > 0 && filled >= 2;
  const showForm = p.canCreate && (creating || !p.poll);

  const launch = () => {
    if (p.onLaunch(question, options)) {
      setQuestion("");
      setOptions(["", ""]);
      setCreating(false);
      toast.success("📊 Sondage lancé !");
    }
  };

  const poll = p.poll;
  const counts = poll ? tally(poll) : [];
  const total = counts.reduce((a, b) => a + b, 0);
  const hasVoted = p.myVote !== null;

  return (
    <div className="rounded-xl bg-background text-foreground shadow-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <BarChart2 className="h-4 w-4 text-primary" /> Sondage
        </span>
        <button onClick={p.onHide} className="text-muted-foreground hover:text-foreground" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[55vh] overflow-y-auto">
        {poll && !showForm && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-primary">
              {p.closed ? "Sondage terminé" : "Sondage en cours"}
            </span>
            <p className="text-sm font-medium">{poll.question}</p>
            <div className="space-y-1.5">
              {poll.options.map((opt, i) => {
                const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                const mine = p.myVote === i;
                const reveal = hasVoted || p.closed;
                return (
                  <button
                    key={i}
                    onClick={() => p.onVote(i)}
                    disabled={hasVoted || p.closed}
                    className={`w-full text-left text-xs rounded-xl px-3 py-1.5 border transition-all disabled:cursor-default ${
                      mine ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/40 hover:bg-muted"
                    }`}
                  >
                    <div className="flex justify-between mb-1">
                      <span>{opt}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {reveal ? `${counts[i]} (${pct}%)` : ""}
                      </span>
                    </div>
                    {reveal && (
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${mine ? "bg-primary" : "bg-muted-foreground/30"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs text-muted-foreground">{total} vote(s)</span>
              <div className="flex gap-3">
                {p.isCreator && !p.closed && (
                  <button onClick={p.onClose} className="text-xs text-destructive hover:underline">Clore</button>
                )}
                {p.closed && (
                  <button onClick={p.onDismiss} className="text-xs text-muted-foreground hover:underline">Masquer</button>
                )}
                {p.canCreate && (
                  <button onClick={() => setCreating(true)} className="text-xs text-primary hover:underline">
                    Nouveau
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!poll && !p.canCreate && (
          <p className="text-sm text-muted-foreground">Aucun sondage en cours.</p>
        )}

        {showForm && (
          <div className="space-y-2">
            <span className="text-xs font-semibold">Nouveau sondage</span>
            <Input
              placeholder="Question…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              className="text-xs h-8"
            />
            {options.map((opt, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                  maxLength={100}
                  className="text-xs h-7"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Supprimer l'option"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              {options.length < 5 && (
                <button onClick={() => setOptions((prev) => [...prev, ""])} className="text-xs text-primary hover:underline">
                  + Option
                </button>
              )}
              {poll && (
                <button onClick={() => setCreating(false)} className="text-xs text-muted-foreground hover:underline">
                  Annuler
                </button>
              )}
              <Button size="sm" className="ml-auto h-7 text-xs" onClick={launch} disabled={!canSubmit}>
                Lancer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}