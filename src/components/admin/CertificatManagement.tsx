import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Award, Plus, Trash2, RefreshCw, Search,
  Copy, CheckCircle2, Loader2, Shield, Calendar,
  ExternalLink, QrCode, Download, X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Certificate {
  id: string;
  certificate_id: string;
  first_name: string;
  last_name: string;
  role_label: string | null;
  year_label: string | null;
  issued_by: string | null;
  created_at: string;
}

// ─── Rôles disponibles ────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "president",             label: "Président",                             prefix: "PBDL"  },
  { value: "vice_president",        label: "Vice-Présidente",                       prefix: "VBDL"  },
  { value: "secretary_general",     label: "Secrétaire Générale",                   prefix: "SBDL"  },
  { value: "communication_manager", label: "Directeur Communauté & Communication",  prefix: "DCBDL" },
  { value: "bdl_member",            label: "Membre BDL",                            prefix: "BDL"   },
] as const;

type RoleValue = typeof ROLE_OPTIONS[number]["value"];

const getPrefixForRole = (roleValue: RoleValue): string =>
  ROLE_OPTIONS.find((r) => r.value === roleValue)?.prefix ?? "BDL";

const getLabelForRole = (roleValue: RoleValue): string =>
  ROLE_OPTIONS.find((r) => r.value === roleValue)?.label ?? roleValue;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Génère un identifiant structuré : [PRÉFIXE]-[AA]-[6 chars aléatoires]
 * Ex : PBDL-25-K3MX7P  /  DCBDL-25-AB4NQ2  /  BDL-25-Z8LX3M
 */
const generateCertId = (roleValue: RoleValue = "bdl_member"): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = getPrefixForRole(roleValue);
  const yy = String(new Date().getFullYear()).slice(-2);
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${yy}-${random}`;
};

/**
 * Construit l'URL de vérification pour un ID donné.
 * Ex : https://bdl-saintandre.fr/certificat-verif?id=PBDL-25-K3MX7P
 */
const verifUrl = (certId: string): string =>
  `${window.location.origin}/certificat-verif?id=${encodeURIComponent(certId)}`;

/**
 * Renvoie l'URL de l'image QR code via l'API publique qrserver.com
 * Pas de clé nécessaire, retourne un PNG.
 */
const qrImgUrl = (certId: string, size = 220): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(verifUrl(certId))}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

// ─── QR Modal ─────────────────────────────────────────────────────────────────

interface QrModalProps {
  cert: Certificate | null;
  onClose: () => void;
}

const QrModal = ({ cert, onClose }: QrModalProps) => {
  if (!cert) return null;

  const imgSrc = qrImgUrl(cert.certificate_id, 240);
  const url = verifUrl(cert.certificate_id);

  const handleDownload = async () => {
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qr-${cert.certificate_id}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Impossible de télécharger le QR code.");
    }
  };

  return (
    <Dialog open={!!cert} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Code de vérification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Infos du certificat */}
          <div className="text-center space-y-1">
            <p className="font-bold text-lg">{cert.first_name} {cert.last_name}</p>
            {cert.role_label && (
              <Badge variant="secondary" className="text-xs">{cert.role_label}</Badge>
            )}
            {cert.year_label && (
              <p className="text-xs text-muted-foreground">{cert.year_label}</p>
            )}
          </div>

          {/* QR image */}
          <div className="flex justify-center">
            <div className="p-3 border-2 border-primary/20 rounded-xl bg-white shadow-sm">
              <img
                src={imgSrc}
                alt={`QR code pour ${cert.certificate_id}`}
                width={240}
                height={240}
                className="block"
              />
            </div>
          </div>

          {/* ID + URL */}
          <div className="space-y-2 text-center">
            <code className="text-sm font-mono font-bold text-primary tracking-wider bg-muted px-3 py-1 rounded block">
              {cert.certificate_id}
            </code>
            <p className="text-xs text-muted-foreground break-all">{url}</p>
          </div>

          {/* Instructions */}
          <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">À imprimer sur le certificat papier</p>
            <p>
              Le scan de ce QR code amène directement sur la page de vérification
              et affiche automatiquement le résultat — aucune saisie nécessaire.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Télécharger le PNG
            </Button>
            <Button variant="outline" onClick={onClose} size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const CertificateManagement = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrCert, setQrCert] = useState<Certificate | null>(null);

  const defaultYear =
    new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    role_value: "bdl_member" as RoleValue,
    year_label: defaultYear,
    certificate_id: generateCertId("bdl_member"),
  });

  // ── Regénère l'ID quand le rôle change ────────────────────────────────────

  const handleRoleChange = (roleValue: RoleValue) => {
    setForm((prev) => ({
      ...prev,
      role_value: roleValue,
      certificate_id: generateCertId(roleValue),
    }));
  };

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => { fetchCertificates(); }, []);

  const fetchCertificates = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);

    const { data, error } = await supabase
      .from("bdl_certificates" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement : " + error.message);
    } else {
      setCertificates((data as Certificate[]) ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Le nom et le prénom sont obligatoires.");
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("bdl_certificates" as any).insert({
      certificate_id: form.certificate_id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      role_label: getLabelForRole(form.role_value),
      year_label: form.year_label.trim() || null,
      issued_by: user?.id ?? null,
    });

    if (error) {
      toast.error("Erreur lors de la création : " + error.message);
    } else {
      toast.success("Certificat créé avec succès !");
      setForm({
        first_name: "",
        last_name: "",
        role_value: "bdl_member",
        year_label: defaultYear,
        certificate_id: generateCertId("bdl_member"),
      });
      fetchCertificates(true);
    }

    setSaving(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("bdl_certificates" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression : " + error.message);
    } else {
      toast.success("Certificat supprimé.");
      fetchCertificates(true);
    }
  };

  // ── Copy ID ────────────────────────────────────────────────────────────────

  const copyId = (certId: string) => {
    navigator.clipboard.writeText(certId).then(() => {
      setCopiedId(certId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = certificates.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.certificate_id.toLowerCase().includes(q) ||
      (c.role_label ?? "").toLowerCase().includes(q)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── QR Modal ── */}
      <QrModal cert={qrCert} onClose={() => setQrCert(null)} />

      {/* ── Create form ── */}
      <Card className="shadow-card border-2 border-primary/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Award className="h-5 w-5 text-amber-500" />
            Émettre un nouveau certificat
          </CardTitle>
          <CardDescription>
            L'identifiant est généré automatiquement selon le rôle.
            Format&nbsp;: <code className="text-xs bg-muted px-1 rounded">[PRÉFIXE]-[AA]-[ALÉATOIRE]</code>
            &nbsp;— ex&nbsp;: <code className="text-xs bg-muted px-1 rounded">PBDL-25-K3MX7P</code>.
            Un QR code téléchargeable est disponible sur chaque certificat émis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="cert-fn">Prénom *</Label>
              <Input
                id="cert-fn"
                placeholder="Prénom du membre"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="cert-ln">Nom *</Label>
              <Input
                id="cert-ln"
                placeholder="Nom du membre"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>

            {/* Rôle */}
            <div className="space-y-2">
              <Label htmlFor="cert-role">Rôle *</Label>
              <Select
                value={form.role_value}
                onValueChange={(v) => handleRoleChange(v as RoleValue)}
              >
                <SelectTrigger id="cert-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-primary">
                          {r.prefix}
                        </code>
                        {r.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Année scolaire */}
            <div className="space-y-2">
              <Label htmlFor="cert-year">Année scolaire</Label>
              <Input
                id="cert-year"
                placeholder="2025-2026"
                value={form.year_label}
                onChange={(e) => setForm({ ...form, year_label: e.target.value })}
              />
            </div>
          </div>

          {/* ID preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-mono font-bold tracking-widest text-primary flex-1">
              {form.certificate_id}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setForm({ ...form, certificate_id: generateCertId(form.role_value) })
              }
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Régénérer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Identifiant unique utilisé pour la vérification publique. Il change automatiquement avec le rôle.
          </p>

          <Button onClick={handleCreate} disabled={saving} className="w-full sm:w-auto">
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Plus className="h-4 w-4 mr-2" />}
            Émettre le certificat
          </Button>
        </CardContent>
      </Card>

      {/* ── Legend ── */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Légende des préfixes d'identifiants
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <div
                key={r.value}
                className="flex items-center gap-1.5 bg-background border rounded-full px-3 py-1 text-xs"
              >
                <code className="font-mono font-bold text-primary">{r.prefix}-</code>
                <span className="text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── List ── */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="h-5 w-5" />
              Certificats émis ({certificates.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/certificat-verif", "_blank")}
                className="gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Page de vérification
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchCertificates(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, prénom, rôle ou identifiant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Award className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {search
                  ? "Aucun certificat ne correspond à la recherche."
                  : "Aucun certificat émis pour le moment."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((cert) => (
                <Card key={cert.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4 flex-wrap">

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Award className="h-5 w-5 text-amber-600" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">
                            {cert.first_name} {cert.last_name}
                          </span>
                          {cert.role_label && (
                            <Badge variant="secondary" className="text-xs">
                              {cert.role_label}
                            </Badge>
                          )}
                          {cert.year_label && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {cert.year_label}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-background border rounded px-2 py-0.5 text-primary font-bold tracking-wider">
                            {cert.certificate_id}
                          </code>
                          <button
                            onClick={() => copyId(cert.certificate_id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copier l'identifiant"
                          >
                            {copiedId === cert.certificate_id
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Émis le {fmtDate(cert.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {/* QR Code button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQrCert(cert)}
                          title="Afficher le QR code"
                          className="gap-1.5"
                        >
                          <QrCode className="h-4 w-4" />
                          QR
                        </Button>

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce certificat ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Le certificat de{" "}
                                <strong>{cert.first_name} {cert.last_name}</strong>{" "}
                                (ID&nbsp;: {cert.certificate_id}) sera définitivement supprimé.
                                Toute vérification ultérieure renverra «&nbsp;invalide&nbsp;».
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(cert.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};