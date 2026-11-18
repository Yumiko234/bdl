import { useEffect, useState } from "react";
import { Lock, LockOpen, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TrackingLockState } from "@/hooks/useTrackingLock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : null;

/** Bandeau visible par tous quand le verrou est actif. */
export const TrackingLockBanner = ({ lock }: { lock: TrackingLockState }) => {
  if (!lock.locked) return null;
  const date = formatDate(lock.lockedAt);
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
      <ShieldAlert className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">Suivi des actions verrouillé : consultation uniquement.</p>
        <p>Aucune modification n'est possible tant qu'un administrateur n'a pas levé le verrou{date ? ` (activé le ${date})` : ""}.</p>
        {lock.reason && <p className="mt-1 italic">Motif : {lock.reason}</p>}
      </div>
    </div>
  );
};

/** Bouton rouge réservé aux administrateurs : verrouille / déverrouille l'écriture. */
export const TrackingLockButton = ({ lock }: { lock: TrackingLockState }) => {
  const { user, hasRole } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (user) hasRole("administrator").then((v) => active && setIsAdmin(v));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!isAdmin) return null;

  const apply = async (locked: boolean) => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("set_tracking_lock", { _locked: locked, _reason: reason });
    setBusy(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(locked ? "Écriture verrouillée pour tout le monde." : "Écriture déverrouillée.");
    setOpen(false);
    setReason("");
    await lock.refresh();
  };

  return (
    <>
      {lock.locked ? (
        <Button variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => apply(false)}>
          <LockOpen className="h-4 w-4" />
          Déverrouiller l'écriture
        </Button>
      ) : (
        <Button variant="destructive" className="gap-2 bg-red-600 hover:bg-red-700 text-white" onClick={() => setOpen(true)}>
          <Lock className="h-4 w-4" />
          Verrouiller l'écriture
        </Button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verrouiller le suivi des actions ?</AlertDialogTitle>
            <AlertDialogDescription>
              Plus personne, administrateurs compris, ne pourra créer, modifier ni supprimer d'actions,
              notes, réunions, présences ou justificatifs d'absence. La lecture reste possible.
              Seul un administrateur pourra lever le verrou.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motif (facultatif, visible par tous)"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" disabled={busy} onClick={() => apply(true)}>
              <Lock className="h-4 w-4" />
              Verrouiller
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
