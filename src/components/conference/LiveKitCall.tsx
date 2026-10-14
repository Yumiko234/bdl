import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  StartAudio,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, PhoneOff, AlertCircle } from "lucide-react";
import { callLivekit } from "./api";
import { useHands, useMyRole, usePoll, useReactions } from "./hooks";
import {
  PeoplePanel, PollPanel, ReactionsLayer, StatsTracker, Toolbar,
  type SessionStats,
} from "./panels";
import SummaryModal from "./SummaryModal";
import {
  formatDuration, isModeratorRole, toRole,
  type ConfRole, type SessionSummary,
} from "./signals";

interface LiveKitCallProps {
  conferenceId: string;
  title: string;
  /** Prénom saisi par un invité (non connecté). */
  guestName?: string;
  /** L'utilisateur quitte seul (la conférence continue). */
  onLeave: () => void;
  /** La conférence est terminée pour tout le monde. */
  onEnded: () => void;
}

interface TokenResponse {
  token: string;
  url: string;
  role: "moderator" | "audience";
  identity: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contenu de la salle (doit être à l'intérieur de <LiveKitRoom>)
// ─────────────────────────────────────────────────────────────────────────────

function RoomUI({
  conferenceId, initialRole, statsRef,
}: {
  conferenceId: string;
  initialRole: ConfRole;
  statsRef: React.MutableRefObject<SessionStats>;
}) {
  const role = useMyRole(initialRole);
  const canModerate = isModeratorRole(role);
  const participants = useParticipants();
  const hands = useHands(role);
  const polls = usePoll();
  const reactions = useReactions();
  const [showPeople, setShowPeople] = useState(false);
  const [showPoll, setShowPoll] = useState(false);

  // Mains levées par de vrais auditeurs (le rôle vient du serveur)
  const handsCount = participants.filter(
    (p) => toRole(p.attributes?.["role"]) === "audience" && hands.raised[p.identity],
  ).length;

  // Prévient quand le rôle change
  const prevRole = useRef(role);
  useEffect(() => {
    const old = prevRole.current;
    if (old === role) return;
    prevRole.current = role;
    if (role === "speaker" && old === "audience") toast.success("🎙️ Vous avez la parole : activez votre micro !");
    else if (role === "speaker" && old === "comoderator") toast.info("Vos droits de co-modérateur ont été retirés.");
    else if (role === "comoderator") toast.success("🛡️ Vous êtes maintenant co-modérateur.");
    else if (role === "audience" && old !== "audience") toast.info("La parole vous a été retirée.");
  }, [role]);

  // Ouvre le sondage quand un nouveau arrive
  const seenPoll = useRef<string | null>(null);
  const pollId = polls.poll?.id ?? null;
  useEffect(() => {
    if (!pollId || seenPoll.current === pollId) return;
    seenPoll.current = pollId;
    if (!polls.isCreator) {
      toast.info("📊 Un sondage vient d'être lancé.");
      setShowPoll(true);
    }
  }, [pollId, polls.isCreator]);

  return (
    <>
      <VideoConference />
      <ReactionsLayer items={reactions.items} />

      <Toolbar
        role={role}
        handUp={hands.handUp}
        handsCount={handsCount}
        pollActive={!!polls.poll && !polls.closed}
        showPeople={showPeople}
        showPoll={showPoll}
        onReact={reactions.send}
        onToggleHand={hands.toggle}
        onTogglePeople={() => setShowPeople((v) => !v)}
        onTogglePoll={() => setShowPoll((v) => !v)}
      />

      {(showPoll || showPeople) && (
        <div className="absolute top-14 right-3 z-20 flex flex-col gap-2 w-[min(320px,calc(100%-1.5rem))] max-h-[calc(100%-4.5rem)] overflow-y-auto">
          {showPoll && (
            <PollPanel
              canCreate={canModerate}
              poll={polls.poll}
              myVote={polls.myVote}
              closed={polls.closed}
              isCreator={polls.isCreator}
              onLaunch={polls.launch}
              onVote={polls.vote}
              onClose={polls.close}
              onDismiss={polls.dismiss}
              onHide={() => setShowPoll(false)}
            />
          )}
          {showPeople && (
            <PeoplePanel
              conferenceId={conferenceId}
              myRole={role}
              raised={hands.raised}
              onClose={() => setShowPeople(false)}
            />
          )}
        </div>
      )}

      {/* Le son des autres participants est déjà joué par <VideoConference />.
          Safari, iOS et Android bloquent le son tant qu'on n'a pas touché l'écran. */}
      <StartAudio
        label="Appuyer pour activer le son"
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg"
      />
      <StatsTracker statsRef={statsRef} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveKitCall({
  conferenceId, title, guestName, onLeave, onEnded,
}: LiveKitCallProps) {
  const [conn, setConn] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [summary, setSummary] = useState<{ data: SessionSummary; ended: boolean } | null>(null);

  const statsRef = useRef<SessionStats>({ start: Date.now(), maxParticipants: 0, messages: 0 });
  const finished = useRef(false);

  // Callbacks gardés dans des refs : le parent en recrée de nouveaux à chaque rendu.
  const onLeaveRef = useRef(onLeave);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onLeaveRef.current = onLeave; onEndedRef.current = onEnded; });

  // Fin d'appel : affiche le récapitulatif (une seule fois).
  const finish = useCallback((ended: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const s = statsRef.current;
    const now = Date.now();
    setSummary({
      ended,
      data: {
        duration: formatDuration((now - s.start) / 1000),
        maxParticipants: s.maxParticipants,
        messageCount: s.messages,
        startTime: new Date(s.start),
        endTime: new Date(now),
      },
    });
  }, []);

  // 1) Récupère le jeton auprès de l'Edge Function
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await callLivekit<TokenResponse>({ action: "token", conferenceId, guestName });
        if (!cancelled) {
          statsRef.current.start = Date.now();
          setConn(res);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Connexion impossible.");
      }
    })();
    return () => { cancelled = true; };
  }, [conferenceId, guestName]);

  // 2) Si l'hôte termine la conférence, tout le monde est déconnecté
  useEffect(() => {
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("conferences").select("status").eq("id", conferenceId).maybeSingle();
      if (data && (data as any).status === "ended") {
        toast.info("La conférence est terminée.");
        finish(true);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [conferenceId, finish]);

  const endForAll = useCallback(async () => {
    if (!window.confirm("Terminer la conférence pour tous les participants ?")) return;
    setEnding(true);
    try {
      await callLivekit({ action: "end", conferenceId });
      finish(true);
    } catch (e: any) {
      toast.error(e.message ?? "Impossible de terminer la conférence.");
    } finally {
      setEnding(false);
    }
  }, [conferenceId, finish]);

  const leave = () => (conn ? finish(false) : onLeaveRef.current());
  const closeSummary = () => (summary?.ended ? onEndedRef.current() : onLeaveRef.current());

  const isModerator = conn?.role === "moderator";

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-lk-theme="default">
      {/* Barre du haut */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-neutral-900 text-white">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-neutral-400">{isModerator ? "Modérateur" : "Participant"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isModerator && !summary && (
            <Button size="sm" variant="destructive" onClick={endForAll} disabled={ending} className="gap-1.5">
              {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
              <span className="hidden sm:inline">Terminer pour tous</span>
            </Button>
          )}
          {!summary && (
            <Button size="sm" variant="secondary" onClick={leave} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Quitter</span>
            </Button>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="relative flex-1 min-h-0">
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm max-w-sm">{error}</p>
            <Button variant="secondary" onClick={() => onLeaveRef.current()}>Retour</Button>
          </div>
        )}

        {!error && !conn && (
          <div className="absolute inset-0 flex items-center justify-center text-white gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Connexion à la conférence…
          </div>
        )}

        {conn && !summary && (
          <LiveKitRoom
            token={conn.token}
            serverUrl={conn.url}
            connect
            // Les modérateurs démarrent avec le micro ; les auditeurs écoutent.
            audio={isModerator}
            video={false}
            options={{ adaptiveStream: true, dynacast: true }}
            onDisconnected={() => finish(false)}
            onError={(e) => {
              console.error("LiveKit:", e);
              toast.error("Erreur de connexion : " + e.message);
            }}
            style={{ height: "100%" }}
          >
            <RoomUI
              conferenceId={conferenceId}
              initialRole={toRole(conn.role)}
              statsRef={statsRef}
            />
          </LiveKitRoom>
        )}

        {summary && (
          <SummaryModal
            summary={summary.data}
            title={title}
            ended={summary.ended}
            onClose={closeSummary}
          />
        )}
      </div>
    </div>
  );
}