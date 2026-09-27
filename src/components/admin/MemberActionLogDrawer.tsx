import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, History, ExternalLink } from "lucide-react";
import { useMemberActionLog } from "@/hooks/useMemberActionLog";
import { describeLogEntry, logEntryIcon } from "@/lib/actionLogFormat";

interface Props {
  /** user_id du membre visé ; null = drawer fermé */
  memberId: string | null;
  memberName?: string;
  /** identifiant utilisé dans l'URL /admin/actions/:slug (par défaut = memberId) */
  memberSlugOrId?: string;
  onOpenChange: (open: boolean) => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function MemberActionLogDrawer({ memberId, memberName, memberSlugOrId, onOpenChange }: Props) {
  const { entries, loading, error } = useMemberActionLog(memberId);
  const navigate = useNavigate();

  return (
    <Sheet open={!!memberId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historique — {memberName ?? "Membre"}
          </SheetTitle>
          <SheetDescription>
            Qui a attribué un point, une absence, une note à ce membre, et quand.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && <p className="text-sm text-destructive py-4">Erreur : {error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-4">Aucune activité enregistrée pour ce membre.</p>
          )}

          {entries.slice(0, 15).map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarImage src={entry.actor_avatar ?? undefined} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(entry.actor_name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm">
                  <span className="font-semibold">{entry.actor_name}</span> {describeLogEntry(entry)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {logEntryIcon(entry)}
                  {fmtDateTime(entry.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {entries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full gap-2"
            onClick={() => navigate(`/admin/actions/${memberSlugOrId ?? memberId}`)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Voir tout l'historique
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}