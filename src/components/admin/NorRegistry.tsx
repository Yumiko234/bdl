import { useCallback, useEffect, useMemo, useState } from "react";
import { BookLock, FilePlus2, Gavel, Search, Stamp, GitBranchPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Registre Central des NOR — Annexe organique n°2, art. 4.
// Lecture : membres du Bureau (RLS). Écriture : Secrétaire général uniquement,
// imposée par la base (fonctions SECURITY DEFINER). Ce composant ne fait que
// masquer les boutons pour les autres rôles : ce n'est PAS la sécurité.

const ORGS = [
  { value: "PBDL", label: "PBDL — Présidence" },
  { value: "BDL", label: "BDL — Bureau (décisions collégiales)" },
  { value: "RCBDL", label: "RCBDL — Direction Communication & Communauté" },
  { value: "JOBDL", label: "JOBDL — Journal Officiel" },
];

const TYPES = [
  { value: "AR", label: "AR — Arrêté" },
  { value: "CI", label: "CI — Circulaire" },
  { value: "CM", label: "CM — Communiqué" },
  { value: "CR", label: "CR — Compte-rendu" },
  { value: "DC", label: "DC — Décret" },
  { value: "DE", label: "DE — Délibération" },
  { value: "NO", label: "NO — Note interne" },
  { value: "PU", label: "PU — Publication JOBDL" },
  { value: "PV", label: "PV — Procès-verbal" },
];

const SG_ROLES = ["secretary_general", "secretary_general2"];

interface RegistryRow {
  nor: string;
  act_id: string;
  version_id: string;
  org: string;
  typ: string;
  version: string;
  title: string;
  status: "EN_VIGUEUR" | "ABROGE";
  abrogated_at: string | null;
  abrogation_reason: string | null;
  sha256: string;
  note: string | null;
  visa_at: string | null;
  visa_note: string | null;
  created_at: string;
}

type Action =
  | { kind: "register" }
  | { kind: "version"; row: RegistryRow }
  | { kind: "abrogate"; row: RegistryRow }
  | { kind: "visa"; row: RegistryRow }
  | null;

const sha256Hex = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : "—";

export const NorRegistry = () => {
  const { user } = useAuth();
  const [isSG, setIsSG] = useState(false);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);

  // formulaire
  const [org, setOrg] = useState("PBDL");
  const [typ, setTyp] = useState("AR");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [visaAt, setVisaAt] = useState("");
  const [visaNote, setVisaNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("nor_registry_view" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Lecture du registre impossible : " + error.message);
    setRows((data as unknown as RegistryRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setIsSG((data ?? []).some((r: { role: string }) => SG_ROLES.includes(r.role)));
    });
  }, [user]);

  const resetForm = () => {
    setTitle(""); setNote(""); setReason(""); setVisaAt(""); setVisaNote(""); setFile(null); setHash("");
  };
  const close = () => { setAction(null); resetForm(); };

  const onFile = async (f: File | null) => {
    setFile(f);
    setHash(f ? await sha256Hex(f) : "");
  };

  // Seule la dernière version d'un acte propose « nouvelle version ».
  const latestByAct = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const cur = m.get(r.act_id);
      if (!cur || r.version > cur) m.set(r.act_id, r.version);
    }
    return m;
  }, [rows]);

  const filtered = rows.filter((r) =>
    (r.nor + " " + r.title).toLowerCase().includes(query.trim().toLowerCase()),
  );

  const submit = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "register") {
        if (!title.trim() || !hash) throw new Error("Titre et fichier du document obligatoires.");
        const { data, error } = await supabase.rpc("register_nor" as any, {
          p_org: org, p_typ: typ, p_title: title.trim(), p_sha256: hash,
          p_visa_at: visaAt || null, p_visa_note: visaNote.trim() || null,
        });
        if (error) throw error;
        toast.success(`NOR attribué : ${data}`);
      } else if (action.kind === "version") {
        if (!hash) throw new Error("Fichier de la nouvelle version obligatoire.");
        const { data, error } = await supabase.rpc("add_nor_version" as any, {
          p_act_id: action.row.act_id, p_sha256: hash, p_note: note.trim() || null,
          p_visa_at: visaAt || null, p_visa_note: visaNote.trim() || null,
        });
        if (error) throw error;
        toast.success(`Version enregistrée : ${data}`);
      } else if (action.kind === "abrogate") {
        const { error } = await supabase.rpc("abrogate_nor" as any, {
          p_act_id: action.row.act_id, p_reason: reason.trim() || null,
        });
        if (error) throw error;
        toast.success("Acte abrogé : le numéro reste au registre (art. 5).");
      } else if (action.kind === "visa") {
        if (!visaAt) throw new Error("Date du visa obligatoire.");
        const { error } = await supabase.rpc("record_nor_visa" as any, {
          p_version_id: action.row.version_id, p_visa_at: visaAt, p_visa_note: visaNote.trim() || null,
        });
        if (error) throw error;
        toast.success("Visa de la Vie Scolaire enregistré.");
      }
      close();
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Opération refusée.");
    } finally {
      setBusy(false);
    }
  };

  const fileField = (
    <div className="space-y-1.5">
      <Label>Document signé (PDF)</Label>
      <Input type="file" accept="application/pdf" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {hash && (
        <p className="text-xs font-mono text-muted-foreground break-all">SHA-256 : {hash}</p>
      )}
      <p className="text-xs text-muted-foreground">
        L'empreinte est calculée dans ton navigateur ; le fichier n'est pas envoyé.
      </p>
    </div>
  );

  const visaFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Visa Vie Scolaire (date, si nécessaire)</Label>
        <Input type="date" value={visaAt} onChange={(e) => setVisaAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Mention du visa</Label>
        <Input value={visaNote} onChange={(e) => setVisaNote(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookLock className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Registre Central des NOR</h3>
        </div>
        {isSG && (
          <Button onClick={() => setAction({ kind: "register" })}>
            <FilePlus2 className="h-4 w-4 mr-2" /> Attribuer un NOR
          </Button>
        )}
      </div>

      {!isSG && (
        <p className="text-sm text-muted-foreground">
          Consultation uniquement : seul le Secrétaire général tient le registre (Annexe 2, art. 4).
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher un NOR ou un titre…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{filtered.length} entrée(s)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NOR</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Visa VS</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Empreinte</TableHead>
                {isSG && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucune entrée.</TableCell></TableRow>
              )}
              {filtered.map((r) => {
                const isLatest = latestByAct.get(r.act_id) === r.version;
                return (
                  <TableRow key={r.version_id}>
                    <TableCell className="font-mono font-semibold whitespace-nowrap">{r.nor}</TableCell>
                    <TableCell className="max-w-[260px] truncate" title={r.note ?? r.title}>{r.title}</TableCell>
                    <TableCell>
                      {r.status === "ABROGE"
                        ? <Badge variant="destructive" title={r.abrogation_reason ?? ""}>ABROGÉ</Badge>
                        : <Badge variant="secondary">En vigueur</Badge>}
                    </TableCell>
                    <TableCell>{r.visa_at ? fmt(r.visa_at) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs" title={r.sha256}>{r.sha256.slice(0, 10)}…</TableCell>
                    {isSG && (
                      <TableCell className="text-right whitespace-nowrap">
                        {!r.visa_at && (
                          <Button size="icon" variant="ghost" title="Enregistrer le visa"
                            onClick={() => { resetForm(); setAction({ kind: "visa", row: r }); }}>
                            <Stamp className="h-4 w-4" />
                          </Button>
                        )}
                        {r.status === "EN_VIGUEUR" && isLatest && (
                          <>
                            <Button size="icon" variant="ghost" title="Nouvelle version"
                              onClick={() => { resetForm(); setAction({ kind: "version", row: r }); }}>
                              <GitBranchPlus className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Abroger"
                              onClick={() => { resetForm(); setAction({ kind: "abrogate", row: r }); }}>
                              <Gavel className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!action} onOpenChange={(o) => { if (!o && !busy) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.kind === "register" && "Attribuer un NOR"}
              {action?.kind === "version" && `Nouvelle version de ${action.row.nor.slice(0, -1)}`}
              {action?.kind === "abrogate" && `Abroger ${action.row.nor.slice(0, -1)}`}
              {action?.kind === "visa" && `Visa pour ${action.row.nor}`}
            </DialogTitle>
            <DialogDescription>
              {action?.kind === "abrogate"
                ? "Le numéro reste définitivement au registre avec la mention « ABROGÉ ». Action irréversible."
                : "L'enregistrement est définitif : aucune modification ni suppression n'est possible ensuite (Annexe 2, art. 4 et 5)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action?.kind === "register" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Organisme émetteur</Label>
                    <Select value={org} onValueChange={setOrg}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ORGS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type d'acte</Label>
                    <Select value={typ} onValueChange={setTyp}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Intitulé de l'acte</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                {fileField}
                {visaFields}
              </>
            )}
            {action?.kind === "version" && (
              <>
                {fileField}
                <div className="space-y-1.5">
                  <Label>Motif de la révision</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                {visaFields}
              </>
            )}
            {action?.kind === "abrogate" && (
              <div className="space-y-1.5">
                <Label>Motif de l'abrogation</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
            {action?.kind === "visa" && {visaFields}}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>Annuler</Button>
            <Button onClick={submit} disabled={busy} variant={action?.kind === "abrogate" ? "destructive" : "default"}>
              {busy ? "En cours…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};