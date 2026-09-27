import { ReactNode } from "react";
import { Plus, Edit2, Trash2, StickyNote, UserX, UserCheck, CalendarClock } from "lucide-react";
import type { ActionLogEntry } from "@/hooks/useMemberActionLog";

const CATEGORY_LABEL: Record<string, string> = {
  petite: "petite action",
  normale: "action normale",
  grande: "grande action",
};

const STATUS_LABEL: Record<string, string> = {
  a_faire: "à faire",
  en_cours: "en cours",
  terminee: "terminée",
};

const ATTENDANCE_LABEL: Record<string, string> = {
  present: "Présent",
  absent: "Absent",
  excuse: "Excusé",
};

/** Transforme une entrée de journal en phrase lisible, ex: "a assigné une action normale « X » (1 pt)" */
export function describeLogEntry(entry: ActionLogEntry): string {
  const n = entry.new_data ?? {};
  const o = entry.old_data ?? {};

  switch (entry.action_type) {
    case "action_created":
      return `a assigné une ${CATEGORY_LABEL[n.category] ?? "action"} « ${n.title} » (${n.points} pt${n.points > 1 ? "s" : ""})`;

    case "action_updated": {
      if (o.status && n.status && o.status !== n.status) {
        return `a changé le statut de « ${n.title} » : ${STATUS_LABEL[o.status] ?? o.status} → ${STATUS_LABEL[n.status] ?? n.status}`;
      }
      if (o.points !== undefined && n.points !== undefined && o.points !== n.points) {
        return `a modifié les points de « ${n.title} » : ${o.points} → ${n.points}`;
      }
      return `a modifié l'action « ${n.title ?? o.title} »`;
    }

    case "action_deleted":
      return `a supprimé l'action « ${o.title} »`;

    case "note_added":
      return `a ajouté une note${n.is_private ? " (privée)" : ""}`;

    case "note_deleted":
      return `a supprimé une note`;

    case "attendance_set":
      return `a marqué "${ATTENDANCE_LABEL[n.status] ?? n.status}" à une réunion`;

    case "absence_requested":
      return n.reason ? `a signalé une absence : « ${n.reason} »` : `a signalé une absence`;

    default:
      return entry.action_type;
  }
}

export function logEntryIcon(entry: ActionLogEntry): ReactNode {
  switch (entry.action_type) {
    case "action_created":
      return <Plus className="h-3.5 w-3.5" />;
    case "action_updated":
      return <Edit2 className="h-3.5 w-3.5" />;
    case "action_deleted":
      return <Trash2 className="h-3.5 w-3.5" />;
    case "note_added":
    case "note_deleted":
      return <StickyNote className="h-3.5 w-3.5" />;
    case "attendance_set":
      return <CalendarClock className="h-3.5 w-3.5" />;
    case "absence_requested":
      return <UserX className="h-3.5 w-3.5" />;
    default:
      return <UserCheck className="h-3.5 w-3.5" />;
  }
}

export const LOG_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "action_created", label: "Actions créées" },
  { value: "action_updated", label: "Actions modifiées" },
  { value: "action_deleted", label: "Actions supprimées" },
  { value: "note_added", label: "Notes ajoutées" },
  { value: "note_deleted", label: "Notes supprimées" },
  { value: "attendance_set", label: "Présences" },
  { value: "absence_requested", label: "Absences signalées" },
];