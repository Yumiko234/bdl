// Messages échangés entre participants (via le canal de données LiveKit) et
// vérifications associées. Tout ce qui arrive du réseau est traité comme non
// fiable : on valide la forme et la taille avant de l'utiliser.

export type ConfRole = "moderator" | "comoderator" | "speaker" | "audience";

export const TOPICS = {
  hand: "bdl.hand",
  reaction: "bdl.reaction",
  poll: "bdl.poll",
  vote: "bdl.vote",
} as const;

export const REACTIONS = ["👍", "❤️", "🎉", "🙌"] as const;

export interface PollState {
  id: string;
  question: string;
  options: string[];
  /** identité du votant → index de l'option choisie (1 vote par personne) */
  votes: Record<string, number>;
  closed: boolean;
  /** identité du créateur : seul lui tient le décompte et peut clore le sondage */
  creator: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  name: string;
  x: number; // % horizontal, 10–90
}

export interface SessionSummary {
  duration: string;
  maxParticipants: number;
  messageCount: number;
  startTime: Date;
  endTime: Date;
}

/** Le rôle est posé par le serveur (attribut LiveKit) : fiable. */
export function toRole(value: string | undefined): ConfRole {
  return value === "moderator" || value === "comoderator" || value === "speaker"
    ? value
    : "audience";
}

export const isModeratorRole = (r: string | undefined) =>
  r === "moderator" || r === "comoderator";

// ─── encodage ───────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

export const encode = (value: unknown): Uint8Array<ArrayBuffer> =>
  enc.encode(JSON.stringify(value));

export function decode(payload: Uint8Array): unknown {
  try {
    return JSON.parse(dec.decode(payload));
  } catch {
    return null;
  }
}

// ─── validation ─────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseHand(raw: unknown): boolean | null {
  return isRecord(raw) && typeof raw.raised === "boolean" ? raw.raised : null;
}

export function parseReaction(raw: unknown): string | null {
  if (!isRecord(raw) || typeof raw.emoji !== "string") return null;
  return (REACTIONS as readonly string[]).includes(raw.emoji) ? raw.emoji : null;
}

export function parseVote(raw: unknown): { pollId: string; option: number } | null {
  if (!isRecord(raw)) return null;
  const { pollId, option } = raw;
  if (typeof pollId !== "string" || pollId.length > 64) return null;
  if (typeof option !== "number" || !Number.isInteger(option) || option < 0) return null;
  return { pollId, option };
}

export function parsePoll(raw: unknown): PollState | null {
  if (!isRecord(raw)) return null;
  const { id, question, options, votes, closed, creator } = raw;
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  if (typeof question !== "string" || !question.trim() || question.length > 200) return null;
  if (!Array.isArray(options) || options.length < 2 || options.length > 5) return null;
  if (!options.every((o) => typeof o === "string" && o.trim() && o.length <= 100)) return null;
  if (typeof closed !== "boolean" || typeof creator !== "string") return null;
  if (!isRecord(votes)) return null;

  const clean: Record<string, number> = {};
  for (const [voter, choice] of Object.entries(votes)) {
    if (typeof choice === "number" && Number.isInteger(choice) && choice >= 0 && choice < options.length) {
      clean[voter] = choice;
    }
  }
  return { id, question, options: options as string[], votes: clean, closed, creator };
}

/** Nombre de voix par option. */
export function tally(poll: PollState): number[] {
  const counts = poll.options.map(() => 0);
  for (const choice of Object.values(poll.votes)) counts[choice] += 1;
  return counts;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}