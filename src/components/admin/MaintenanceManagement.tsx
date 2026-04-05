import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, Save, AlertTriangle } from "lucide-react";
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

interface MaintenanceConfig {
  id: string;
  is_active: boolean;
  message: string;
  submessage: string;
  estimated_end: string | null;
}

export const MaintenanceManagement = () => {
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [form, setForm] = useState({
    message: "",
    submessage: "",
    estimated_end: "",
  });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from("maintenance_mode" as any)
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const c = data as unknown as MaintenanceConfig;
      setConfig(c);
      setForm({
        message: c.message,
        submessage: c.submessage || "",
        estimated_end: c.estimated_end
          ? new Date(c.estimated_end).toISOString().slice(0, 16)
          : "",
      });
    }
  };

  const handleSave = async () => {
    if (!config) return;
    if (!form.message.trim()) {
      toast.error("Le message principal est obligatoire");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("maintenance_mode" as any)
      .update({
        message: form.message,
        submessage: form.submessage || null,
        estimated_end: form.estimated_end
          ? new Date(form.estimated_end).toISOString()
          : null,
        updated_by: user?.id,
      })
      .eq("id", config.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Paramètres de maintenance sauvegardés");
      loadConfig();
    }
    setSaving(false);
  };

  const handleToggle = async (newState: boolean) => {
    if (!config) return;
    setToggling(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("maintenance_mode" as any)
      .update({ is_active: newState, updated_by: user?.id })
      .eq("id", config.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(
        newState
          ? "⚠️ Mode maintenance ACTIVÉ — le site est maintenant bloqué pour les visiteurs"
          : "✅ Mode maintenance désactivé — le site est accessible normalement"
      );
      loadConfig();
    }
    setToggling(false);
  };

  if (!config) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Chargement…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          Mode Maintenance
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ── Statut & toggle principal ── */}
        <div
          className={`rounded-xl border-2 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
            config.is_active
              ? "border-destructive/60 bg-destructive/5"
              : "border-border bg-muted/30"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">Statut actuel :</span>
              {config.is_active ? (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  🔴 MAINTENANCE ACTIVE
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1 bg-green-100 text-green-800 border-green-200"
                >
                  🟢 Site accessible normalement
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {config.is_active
                ? "Les visiteurs voient uniquement le message de maintenance. Les membres BDL conservent l'accès."
                : "Le site est entièrement accessible à tous les visiteurs."}
            </p>
          </div>

          {/* Activation → confirmation requise */}
          {!config.is_active ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={toggling} className="gap-2 flex-shrink-0">
                  <Wrench className="h-4 w-4" />
                  Activer la maintenance
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Activer le mode maintenance ?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      Le site sera immédiatement bloqué pour tous les visiteurs non-BDL.
                    </span>
                    <span className="block font-medium text-foreground">
                      Seuls les membres du BDL conserveront l'accès complet.
                    </span>
                    <span className="block">
                      Assurez-vous que le message de maintenance est bien configuré avant de continuer.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleToggle(true)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Oui, activer la maintenance
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleToggle(false)}
              disabled={toggling}
              className="gap-2 flex-shrink-0 border-green-500 text-green-700 hover:bg-green-50"
            >
              ✅ Désactiver la maintenance
            </Button>
          )}
        </div>

        {/* ── Formulaire de configuration ── */}
        <div className="space-y-5">
          <h3 className="font-semibold text-lg border-b pb-2">
            Configuration du message
          </h3>

          <div className="space-y-2">
            <Label htmlFor="maint-message">Message principal *</Label>
            <Textarea
              id="maint-message"
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Le site est actuellement en maintenance…"
            />
            <p className="text-xs text-muted-foreground">
              Ce texte sera affiché en gros au centre de la page.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maint-submessage">
              Message secondaire{" "}
              <span className="text-muted-foreground text-xs">(optionnel)</span>
            </Label>
            <Input
              id="maint-submessage"
              value={form.submessage}
              onChange={(e) => setForm({ ...form, submessage: e.target.value })}
              placeholder="Merci de votre compréhension."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maint-end">
              Retour prévu{" "}
              <span className="text-muted-foreground text-xs">
                (optionnel — s'affiche sous le message)
              </span>
            </Label>
            <Input
              id="maint-end"
              type="datetime-local"
              value={form.estimated_end}
              onChange={(e) => setForm({ ...form, estimated_end: e.target.value })}
            />
          </div>

          {/* Prévisualisation compacte */}
          {form.message && (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center space-y-3 bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-4">
                Aperçu du message affiché aux visiteurs
              </p>
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Site en maintenance</h2>
              <p className="text-muted-foreground">{form.message}</p>
              {form.submessage && (
                <p className="text-sm text-muted-foreground">{form.submessage}</p>
              )}
              {form.estimated_end && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm font-medium">
                  Retour prévu le{" "}
                  <strong>
                    {new Date(form.estimated_end).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde…" : "Sauvegarder la configuration"}
          </Button>
        </div>

        {/* ── Info accès BDL ── */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">ℹ️ Accès pendant la maintenance</p>
          <p>
            Les membres du BDL (tous rôles confondus) conservent l'accès à toutes les pages,
            y compris le panel d'administration.
          </p>
          <p>
            Les visiteurs non-connectés et les élèves sans rôle BDL verront uniquement
            le message de maintenance à la place du contenu des pages.
          </p>
          <p>
            La navigation, le bandeau global et le footer restent visibles pour tous.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};