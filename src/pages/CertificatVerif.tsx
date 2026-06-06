import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Award, Search, CheckCircle2, XCircle,
  Shield, Calendar, Loader2, RotateCcw, QrCode,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Certificate {
  certificate_id: string;
  first_name: string;
  last_name: string;
  role_label: string | null;
  year_label: string | null;
  created_at: string;
}

type VerifState = "idle" | "loading" | "valid" | "invalid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

// ─── Component ────────────────────────────────────────────────────────────────

export default function CertificatVerif() {
  const [searchParams] = useSearchParams();

  // Pré-remplir depuis le paramètre URL ?id=... (venant du QR code)
  const [query, setQuery] = useState(searchParams.get("id") ?? "");
  const [state, setState] = useState<VerifState>("idle");
  const [result, setResult] = useState<Certificate | null>(null);
  const [multipleFound, setMultipleFound] = useState(false);
  // true si la vérif a été déclenchée automatiquement par QR code
  const [autoTriggered, setAutoTriggered] = useState(false);

  // ── Core verify logic — accepte une valeur forcée (utile pour l'auto-trigger) ──

  const runVerify = useCallback(async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;

    setState("loading");
    setResult(null);
    setMultipleFound(false);

    // Détecter si ça ressemble à un ID (contient un tiret et pas d'espace,
    // ou commence par un préfixe connu)
    const looksLikeId = /^(P|V|S|DC)?BDL-/i.test(q) || (!/\s/.test(q) && q.includes("-"));

    let data: Certificate[] | null = null;
    let error: any = null;

    if (looksLikeId) {
      const res = await (supabase as any)
        .from("bdl_certificates")
        .select("certificate_id, first_name, last_name, role_label, year_label, created_at")
        .ilike("certificate_id", q);
      data = res.data;
      error = res.error;
    }

    // Fallback : recherche par nom si rien trouvé par ID
    if ((!data || data.length === 0) && !error) {
      const parts = q.split(/\s+/);
      if (parts.length >= 2) {
        const [a, ...rest] = parts;
        const b = rest.join(" ");
        const [res1, res2] = await Promise.all([
          (supabase as any)
            .from("bdl_certificates")
            .select("certificate_id, first_name, last_name, role_label, year_label, created_at")
            .ilike("first_name", a)
            .ilike("last_name", b),
          (supabase as any)
            .from("bdl_certificates")
            .select("certificate_id, first_name, last_name, role_label, year_label, created_at")
            .ilike("first_name", b)
            .ilike("last_name", a),
        ]);
        const combined: Certificate[] = [...(res1.data ?? []), ...(res2.data ?? [])];
        const seen = new Set<string>();
        data = combined.filter((c) => {
          if (seen.has(c.certificate_id)) return false;
          seen.add(c.certificate_id);
          return true;
        });
        error = res1.error ?? res2.error;
      } else {
        const [res1, res2] = await Promise.all([
          (supabase as any)
            .from("bdl_certificates")
            .select("certificate_id, first_name, last_name, role_label, year_label, created_at")
            .ilike("first_name", `%${q}%`),
          (supabase as any)
            .from("bdl_certificates")
            .select("certificate_id, first_name, last_name, role_label, year_label, created_at")
            .ilike("last_name", `%${q}%`),
        ]);
        const combined: Certificate[] = [...(res1.data ?? []), ...(res2.data ?? [])];
        const seen = new Set<string>();
        data = combined.filter((c) => {
          if (seen.has(c.certificate_id)) return false;
          seen.add(c.certificate_id);
          return true;
        });
        error = res1.error ?? res2.error;
      }
    }

    if (error) { setState("invalid"); return; }

    if (!data || data.length === 0) {
      setState("invalid");
    } else if (data.length === 1) {
      setResult(data[0]);
      setState("valid");
    } else {
      setResult(data[0]);
      setMultipleFound(true);
      setState("valid");
    }
  }, []);

  // ── Auto-trigger si ?id= présent dans l'URL (scan QR code) ────────────────

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setAutoTriggered(true);
      runVerify(idFromUrl);
    }
  }, []); // une seule fois au montage

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleVerify = () => runVerify(query);

  const handleReset = () => {
    setQuery("");
    setState("idle");
    setResult(null);
    setMultipleFound(false);
    setAutoTriggered(false);
    // Nettoyer le paramètre URL sans recharger la page
    window.history.replaceState({}, "", "/certificat-verif");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <Award className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Vérification de Certificat</h1>
              <p className="text-xl text-white/90">
                Vérifiez l'authenticité d'un certificat du Bureau des Lycéens
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto space-y-6">

              {/* Bannière QR si déclenchement automatique */}
              {autoTriggered && state === "loading" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary">
                  <QrCode className="h-5 w-5 flex-shrink-0" />
                  <span>QR code détecté — vérification en cours…</span>
                  <Loader2 className="h-4 w-4 animate-spin ml-auto flex-shrink-0" />
                </div>
              )}

              {/* Comment ça marche — masqué si QR auto-trigger et résultat déjà là */}
              {!(autoTriggered && state !== "idle") && (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-5 flex items-start gap-3 text-sm text-muted-foreground">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Comment vérifier ?</p>
                      <p>
                        Saisissez le{" "}
                        <span className="font-medium text-foreground">prénom et nom</span>{" "}
                        du titulaire ou son{" "}
                        <span className="font-medium text-foreground">identifiant de certificat</span>{" "}
                        (ex : <code className="text-xs bg-muted px-1 rounded">PBDL-25-K3MX7P</code>).
                        Le scan d'un QR code imprimé sur le certificat lance la vérification automatiquement.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Champ de saisie — affiché même après QR pour permettre une nouvelle recherche */}
              <Card className="shadow-card">
                <CardContent className="p-8 space-y-5">
                  {autoTriggered && state !== "idle" && state !== "loading" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                      <QrCode className="h-3.5 w-3.5" />
                      Vérification lancée automatiquement via QR code
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="verif-input">
                      Prénom Nom ou identifiant du certificat
                    </Label>
                    <Input
                      id="verif-input"
                      placeholder="Ex : Marie Dupont  ou  PBDL-25-K3MX7P"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                      disabled={state === "loading"}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleVerify}
                      disabled={state === "loading" || !query.trim()}
                      size="lg"
                      className="flex-1 gap-2"
                    >
                      {state === "loading"
                        ? <Loader2 className="h-5 w-5 animate-spin" />
                        : <Search className="h-5 w-5" />}
                      Vérifier
                    </Button>
                    {state !== "idle" && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleReset}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Résultat valide ── */}
              {state === "valid" && result && (
                <Card className="shadow-card border-2 border-green-300 bg-green-50/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CardContent className="p-8 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-7 w-7 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-800">Certificat valide ✓</p>
                        <p className="text-sm text-green-700">
                          Ce certificat est authentique et a été émis par le BDL du Lycée Saint-André.
                        </p>
                      </div>
                    </div>

                    {multipleFound && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Plusieurs certificats correspondent. Premier résultat affiché.
                        Utilisez l'identifiant exact pour une vérification précise.
                      </p>
                    )}

                    {/* Certificat visuel */}
                    <div className="rounded-xl border-2 border-amber-300 bg-white p-6 space-y-4 shadow-sm">
                      <div className="text-center space-y-1 border-b border-amber-200 pb-4">
                        <Award className="h-10 w-10 text-amber-500 mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                          Certificat de Participation
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bureau des Lycéens — Lycée Saint-André
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">
                            {result.first_name} {result.last_name}
                          </p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                          {result.role_label && (
                            <Badge className="text-sm py-1 px-3">
                              {result.role_label}
                            </Badge>
                          )}
                          {result.year_label && (
                            <Badge variant="outline" className="text-sm py-1 px-3 gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {result.year_label}
                            </Badge>
                          )}
                        </div>

                        <div className="text-center space-y-1 pt-2 border-t border-amber-100">
                          <p className="text-xs text-muted-foreground">Identifiant unique</p>
                          <code className="text-sm font-mono font-bold tracking-widest text-primary bg-muted px-3 py-1 rounded">
                            {result.certificate_id}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">
                            Émis le {fmtDate(result.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Résultat invalide ── */}
              {state === "invalid" && (
                <Card className="shadow-card border-2 border-red-300 bg-red-50/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CardContent className="p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <XCircle className="h-7 w-7 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-red-800">Certificat invalide ✗</p>
                        <p className="text-sm text-red-700">
                          Aucun certificat authentique ne correspond à cette recherche.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-red-200 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Raisons possibles :</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li>Le nom ou l'identifiant est incorrect.</li>
                        <li>Ce certificat n'a pas été émis par le BDL de Saint-André.</li>
                        <li>Le certificat a été révoqué.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}