import { useCallback, useEffect, useRef, useState } from "react";
import {
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import {
  TOPICS,
  encode,
  decode,
  parseHand,
  parsePoll,
  parseReaction,
  parseVote,
  isModeratorRole,
  toRole,
  type ConfRole,
  type FloatingReaction,
  type PollState,
} from "./signals";

// ─────────────────────────────────────────────────────────────────────────────
// Rôle de l'utilisateur courant (attribut posé par le serveur)
// ─────────────────────────────────────────────────────────────────────────────

export function useMyRole(fallback: ConfRole): ConfRole {
  const participants = useParticipants();
  const me = participants.find((p) => p.isLocal);
  const value = me?.attributes?.["role"];
  return value ? toRole(value) : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mains levées
// ─────────────────────────────────────────────────────────────────────────────

const HAND_REFRESH_MS = 5000; // rappel tant que la main est levée
const HAND_EXPIRE_MS = 15000; // sans rappel, la main est considérée baissée

export function useHands(myRole: ConfRole) {
  const { localParticipant } = useLocalParticipant();
  const [handUp, setHandUp] = useState(false);
  const [raised, setRaised] = useState<Record<string, { name: string; ts: number }>>({});

  const publish = useCallback(
    (up: boolean) => {
      localParticipant
        .publishData(encode({ raised: up }), { reliable: true, topic: TOPICS.hand })
        .catch(() => { /* hors ligne : le rappel suivant réessaiera */ });
    },
    [localParticipant],
  );

  const toggle = useCallback(() => {
    const next = !handUp;
    setHandUp(next);
    publish(next);
  }, [handUp, publish]);

  // Un modérateur arrivé en cours de route doit voir les mains déjà levées.
  useEffect(() => {
    if (!handUp) return;
    const t = setInterval(() => publish(true), HAND_REFRESH_MS);
    return () => clearInterval(t);
  }, [handUp, publish]);

  // Dès qu'on obtient la parole, la main retombe.
  useEffect(() => {
    if (handUp && myRole !== "audience") {
      setHandUp(false);
      publish(false);
    }
  }, [myRole, handUp, publish]);

  useDataChannel(TOPICS.hand, (msg) => {
    const from = msg.from;
    if (!from) return;
    const up = parseHand(decode(msg.payload));
    if (up === null) return;
    setRaised((prev) => {
      const next = { ...prev };
      if (up) next[from.identity] = { name: from.name || from.identity, ts: Date.now() };
      else delete next[from.identity];
      return next;
    });
  });

  // Nettoie les mains qui ne sont plus rappelées (personne parti, réseau coupé…).
  useEffect(() => {
    const t = setInterval(() => {
      const limit = Date.now() - HAND_EXPIRE_MS;
      setRaised((prev) => {
        const stale = Object.keys(prev).filter((k) => prev[k].ts < limit);
        if (!stale.length) return prev;
        const next = { ...prev };
        stale.forEach((k) => delete next[k]);
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return { handUp, toggle, raised };
}

// ─────────────────────────────────────────────────────────────────────────────
// Réactions flottantes
// ─────────────────────────────────────────────────────────────────────────────

export function useReactions() {
  const { localParticipant } = useLocalParticipant();
  const [items, setItems] = useState<FloatingReaction[]>([]);
  const lastSent = useRef(0);

  const add = useCallback((emoji: string, name: string) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev.slice(-24), { id, emoji, name, x: 10 + Math.random() * 80 }]);
    setTimeout(() => setItems((prev) => prev.filter((r) => r.id !== id)), 3000);
  }, []);

  useDataChannel(TOPICS.reaction, (msg) => {
    const emoji = parseReaction(decode(msg.payload));
    if (emoji) add(emoji, msg.from?.name || msg.from?.identity || "");
  });

  const send = useCallback(
    (emoji: string) => {
      const now = Date.now();
      if (now - lastSent.current < 400) return; // anti-spam
      lastSent.current = now;
      localParticipant
        .publishData(encode({ emoji }), { reliable: false, topic: TOPICS.reaction })
        .catch(() => {});
      add(emoji, localParticipant.name || "Moi");
    },
    [localParticipant, add],
  );

  return { items, send };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sondages
// ─────────────────────────────────────────────────────────────────────────────
// Le créateur du sondage tient le décompte : il reçoit les votes, les compte
// (1 par personne, identité garantie par LiveKit) et rediffuse l'état complet.
// Les autres affichent simplement le dernier état reçu, à condition qu'il vienne
// bien du créateur ET d'un modérateur.

export function usePoll() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [poll, setPoll] = useState<PollState | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);

  const pollRef = useRef<PollState | null>(null);
  pollRef.current = poll;
  const dismissedRef = useRef<string | null>(null);
  const myId = localParticipant.identity;

  const broadcast = useCallback(
    (p: PollState, to?: string[]) => {
      localParticipant
        .publishData(encode(p), { reliable: true, topic: TOPICS.poll, destinationIdentities: to })
        .catch(() => {});
    },
    [localParticipant],
  );

  // Réception de l'état du sondage
  useDataChannel(TOPICS.poll, (msg) => {
    const from = msg.from;
    if (!from || !isModeratorRole(from.attributes?.["role"])) return;
    const snap = parsePoll(decode(msg.payload));
    if (!snap || snap.creator !== from.identity) return;
    if (dismissedRef.current === snap.id) return;
    const isNew = pollRef.current?.id !== snap.id;
    setPoll(snap);
    if (isNew) setMyVote(null);
    // Retrouve son propre vote (arrivée tardive, rechargement)
    if (snap.votes[myId] !== undefined) setMyVote(snap.votes[myId]);
  });

  // Réception d'un vote (seul le créateur le traite)
  useDataChannel(TOPICS.vote, (msg) => {
    const from = msg.from;
    const cur = pollRef.current;
    if (!from || !cur || cur.closed || cur.creator !== myId) return;
    const vote = parseVote(decode(msg.payload));
    if (!vote || vote.pollId !== cur.id || vote.option >= cur.options.length) return;
    if (cur.votes[from.identity] !== undefined) return; // déjà voté
    const next: PollState = { ...cur, votes: { ...cur.votes, [from.identity]: vote.option } };
    setPoll(next);
    broadcast(next);
  });

  // Un nouvel arrivant reçoit le sondage en cours
  useEffect(() => {
    const onJoin = (p: RemoteParticipant) => {
      const cur = pollRef.current;
      if (!cur || cur.creator !== myId) return;
      setTimeout(() => {
        if (pollRef.current) broadcast(pollRef.current, [p.identity]);
      }, 1500);
    };
    room.on(RoomEvent.ParticipantConnected, onJoin);
    return () => { room.off(RoomEvent.ParticipantConnected, onJoin); };
  }, [room, myId, broadcast]);

  const launch = useCallback(
    (question: string, options: string[]) => {
      const clean = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim() || clean.length < 2) return false;
      const next: PollState = {
        id: crypto.randomUUID(),
        question: question.trim(),
        options: clean.slice(0, 5),
        votes: {},
        closed: false,
        creator: myId,
      };
      dismissedRef.current = null;
      setPoll(next);
      setMyVote(null);
      broadcast(next);
      return true;
    },
    [myId, broadcast],
  );

  const vote = useCallback(
    (option: number) => {
      const cur = pollRef.current;
      if (!cur || cur.closed || myVote !== null) return;
      setMyVote(option);
      if (cur.creator === myId) {
        const next: PollState = { ...cur, votes: { ...cur.votes, [myId]: option } };
        setPoll(next);
        broadcast(next);
      } else {
        localParticipant
          .publishData(encode({ pollId: cur.id, option }), {
            reliable: true,
            topic: TOPICS.vote,
            destinationIdentities: [cur.creator],
          })
          .catch(() => {});
      }
    },
    [myVote, myId, broadcast, localParticipant],
  );

  const close = useCallback(() => {
    const cur = pollRef.current;
    if (!cur || cur.creator !== myId || cur.closed) return;
    const next = { ...cur, closed: true };
    setPoll(next);
    broadcast(next);
  }, [myId, broadcast]);

  const dismiss = useCallback(() => {
    if (pollRef.current) dismissedRef.current = pollRef.current.id;
    setPoll(null);
    setMyVote(null);
  }, []);

  // Si le créateur est parti, plus personne ne peut compter les votes.
  const creatorPresent = poll ? participants.some((p) => p.identity === poll.creator) : false;
  const closed = poll ? poll.closed || !creatorPresent : false;

  return { poll, myVote, closed, isCreator: poll?.creator === myId, launch, vote, close, dismiss };
}