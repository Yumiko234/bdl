import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, Globe, LayoutList, X, Plus, Info } from "lucide-react";

// Routes disponibles dans l'application
const AVAILABLE_ROUTES = [
  { path: "/",             label: "Accueil" },
  { path: "/etablissement",label: "L'Établissement" },
  { path: "/bdl",          label: "Le BDL" },
  { path: "/clubs",        label: "Clubs" },
  { path: "/actualites",   label: "Actualités" },
  { path: "/events",       label: "Événements" },
  { path: "/calendrier",   label: "Calendrier" },
  { path: "/documents",    label: "Documents" },
  { path: "/jo",           label: "Journal Officiel" },
  { path: "/scrutin",      label: "Scrutins" },
  { path: "/sondage",      label: "Sondages" },
  { path: "/contact",      label: "Contact" },
  { path: "/support",      label: "Support" },
  { path: "/profile",      label: "Profil" },
];

interface MaintenanceConfig {
  id: string;
  is_active: boolean;
  message: string;
  submessage: string | null;
  estimated_end: string | null;
  affected_paths: string[] | null;
}

export const MaintenanceManagement = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mode : "global" = toutes les pages, "specific" = pages ciblées
  const [mode, setMode] = useState<"global" | "specific">("global");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [customPath, setCustomPath] = useState("");

  const [form, setForm] = useState({
    is_active: false,
    message: "",
    submessage: "",
    estimated_end: "",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maintenance_mode" as any)
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Erreur lors du chargement de la configuration");
      setLoading(false);
      return;
    }

    if (data) {
      const cfg = data as unknown as MaintenanceConfig;
      setConfig(cfg);
      setForm({
        is_active: cfg.is_active,
        message: cfg.message ?? "",
        submessage: cfg.submessage ?? "",
        estimated_end: cfg.estimated_end
          ? new Date(cfg.estimated_end).toISOString().slice(0, 16)
          : "",
      });

      // Initialiser le mode et les chemins sélectionnés
      if (cfg.affected_paths && cfg.affected_paths.length > 0) {
        setMode("specific");
        setSelectedPaths(cfg.affected_paths);
      } else {
        setMode("global");
        setSelectedPaths([]);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    const affected_paths =
      mode === "specific" && selectedPaths.length > 0 ? selectedPaths : null;

    const { error } = await supabase
      .from("maintenance_mode" as any)
      .update({
        is_active: form.is_active,
        message: form.message,
        submessage: form.submessage || null,
        estimated_end: form.estimated_end
          ? new Date(form.estimated_end).toISOString()
          : null,
        affected_paths,
        updated_by: user?.id,
      })
      .eq("id", config.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(
        form.is_active
          ? "Maintenance activée"
          : "Maintenance désactivée"
      );
      loadConfig();
    }
    setSaving(false);
  };

  const togglePath = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const addCustomPath = () => {
    const trimmed = customPath.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (!selectedPaths.includes(normalized)) {
      setSelectedPaths((prev) => [...prev, normalized]);
    }
    setCustomPath("");
  };

  const removePath = (path: string) => {
    setSelectedPaths((prev) => prev.filter((p) => p !== path));
  };

  const getRouteLabel = (path: string) => {
    return AVAILABLE_ROUTES.find((r) => r.path === path)?.label ?? path;
  };

  if (loading) {
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

        {/* ── Activation globale ── */}
        <div className={`flex items-center justify-between p-5 rounded-xl border-2 transition-colors ${
          form.is_active
            ? "border-destructive/50 bg-destructive/5"
            : "border-border bg-muted/20"
        }`}>
          <div className="space-y-1">
            <p className="font-semibold text-base">
              {form.is_active ? "🔴 Maintenance active" : "🟢 Site en ligne"}
            </p>
            <p className="text-sm text-muted-foreground">
              {form.is_active
                ? mode === "specific" && selectedPaths.length > 0
                  ? `${selectedPaths.length} page(s) ciblée(s) en maintenance`
                  : "Tout le site est en maintenance (sauf pages bypass)"
                : "Le site est accessible normalement"}
            </p>
          </div>
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm({ ...form, is_active: v })}
          />
        </div>

        {/* ── Portée de la maintenance ── */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Portée de la maintenance</Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option : tout le site */}
            <button
              type="button"
              onClick={() => { setMode("global"); setSelectedPaths([]); }}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                mode === "global"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Globe className={`h-5 w-5 mt-0.5 flex-shrink-0 ${mode === "global" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="font-semibold text-sm">Tout le site</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Affiche la maintenance sur toutes les pages publiques
                </p>
              </div>
            </button>

            {/* Option : pages spécifiques */}
            <button
              type="button"
              onClick={() => setMode("specific")}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                mode === "specific"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <LayoutList className={`h-5 w-5 mt-0.5 flex-shrink-0 ${mode === "specific" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="font-semibold text-sm">Pages spécifiques</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cible uniquement certaines pages du site
                </p>
              </div>
            </button>
          </div>

          {/* Sélecteur de pages (mode specific) */}
          {mode === "specific" && (
            <div className="space-y-4 p-4 rounded-xl border bg-muted/20">
              <p className="text-sm font-medium">Pages ciblées :</p>

              {/* Grille de routes disponibles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_ROUTES.map((route) => {
                  const selected = selectedPaths.includes(route.path);
                  return (
                    <button
                      key={route.path}
                      type="button"
                      onClick={() => togglePath(route.path)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="truncate">{route.label}</span>
                      <span className={`text-xs ml-auto flex-shrink-0 ${selected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {route.path}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chemin personnalisé */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ajouter un chemin personnalisé</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="/ma-page"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomPath(); } }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomPath}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Pages sélectionnées */}
              {selectedPaths.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {selectedPaths.length} page(s) sélectionnée(s) :
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPaths.map((path) => (
                      <Badge
                        key={path}
                        variant="secondary"
                        className="gap-1.5 pr-1.5 text-sm"
                      >
                        {getRouteLabel(path)}
                        <span className="text-muted-foreground text-xs">{path}</span>
                        <button
                          type="button"
                          onClick={() => removePath(path)}
                          className="ml-1 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucune page sélectionnée — sélectionnez au moins une page ou passez en mode "Tout le site".
                </p>
              )}

              {/* Note informative */}
              <div className="flex gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Les pages <strong>/admin</strong>, <strong>/auth</strong>, <strong>/intranet</strong>, <strong>/support</strong> et <strong>/contact</strong> restent toujours accessibles. Le staff BDL n'est jamais bloqué.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Message ── */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Message affiché</Label>

          <div className="space-y-2">
            <Label htmlFor="message">Message principal *</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Le site est actuellement en maintenance. Merci de votre patience."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submessage">Message secondaire (optionnel)</Label>
            <Input
              id="submessage"
              value={form.submessage}
              onChange={(e) => setForm({ ...form, submessage: e.target.value })}
              placeholder="Des améliorations sont en cours..."
            />
          </div>
        </div>

        {/* ── Heure de retour ── */}
        <div className="space-y-2">
          <Label htmlFor="estimated_end" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Retour estimé (optionnel)
          </Label>
          <Input
            id="estimated_end"
            type="datetime-local"
            value={form.estimated_end}
            onChange={(e) => setForm({ ...form, estimated_end: e.target.value })}
          />
        </div>

        {/* ── Bouton sauvegarde ── */}
        <Button
          onClick={handleSave}
          disabled={saving || (mode === "specific" && selectedPaths.length === 0 && form.is_active)}
          className="w-full"
          variant={form.is_active ? "destructive" : "default"}
        >
          {saving
            ? "Enregistrement…"
            : form.is_active
            ? "Activer la maintenance"
            : "Enregistrer"}
        </Button>

        {mode === "specific" && selectedPaths.length === 0 && form.is_active && (
          <p className="text-xs text-destructive text-center -mt-4">
            Sélectionnez au moins une page en mode "Pages spécifiques".
          </p>
        )}
      </CardContent>
    </Card>
  );
};