import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette, Play, RotateCcw, Calendar, Zap,
  Eye, Sun, Moon, Monitor,
} from "lucide-react";
import { useEventTheme } from "@/themes/EventThemeProvider";
import { CATALOGUE, CATALOGUE_ORDER } from "@/themes/catalogue";
import { getEffectiveSettings, resolveActiveTheme, isInRange } from "@/themes/resolver";
import type { EventThemeId, GlobalMode, ThemeSettings } from "@/themes/types";

// ─── Preview modal ────────────────────────────────────────────────────────────

function ThemePreview({
  themeId,
  onClose,
}: {
  themeId: EventThemeId;
  onClose: () => void;
}) {
  const [previewDark, setPreviewDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const cat = CATALOGUE[themeId];

  // We apply the preview by temporarily setting data-event-theme and toggling .dark
  // on the preview iframe's document — instead we just show a styled mock panel
  // with the event-theme CSS vars already declared globally.

  // Temporarily force the theme on <html> while modal is open
  const applyPreview = useCallback((dark: boolean) => {
    setPreviewDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.setAttribute("data-event-theme", themeId);
  }, [themeId]);

  const handleClose = () => {
    // Restore original dark-mode state
    const stored = localStorage.getItem("theme");
    const orig = stored === "dark" || stored === "light" ? stored : "system";
    if (orig === "dark") document.documentElement.classList.add("dark");
    else if (orig === "light") document.documentElement.classList.remove("dark");
    // EventThemeProvider will re-apply the correct data-event-theme on next render
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cat.icon}</span>
            <span className="font-semibold">Prévisualisation — {cat.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle inside preview */}
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {([
                { value: false, icon: <Sun className="h-3.5 w-3.5" />, label: "Clair" },
                { value: true,  icon: <Moon className="h-3.5 w-3.5" />, label: "Sombre" },
              ] as const).map(({ value, icon, label }) => (
                <button
                  key={String(value)}
                  onClick={() => applyPreview(value)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    previewDark === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={handleClose}>✕</Button>
          </div>
        </div>

        {/* Mock page layout */}
        <div className="p-6 space-y-4">
          {/* Nav mock */}
          <div className="rounded-lg border bg-card p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded bg-primary/20" />
              <div className="font-semibold text-sm text-foreground">Bureau des Lycéens</div>
            </div>
            <div className="flex gap-2">
              {["Accueil", "BDL", "Actualités"].map((l) => (
                <div key={l} className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-muted cursor-default">{l}</div>
              ))}
            </div>
          </div>

          {/* Hero mock */}
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <div className="h-3 w-2/3 rounded bg-foreground/20" />
            <div className="h-2 w-full rounded bg-muted-foreground/20" />
            <div className="h-2 w-5/6 rounded bg-muted-foreground/20" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-24 rounded-md bg-primary/80 flex items-center justify-center text-primary-foreground text-xs font-medium">Découvrir</div>
              <div className="h-8 w-24 rounded-md border text-xs text-muted-foreground flex items-center justify-center">En savoir +</div>
            </div>
          </div>

          {/* Cards mock */}
          <div className="grid grid-cols-3 gap-3">
            {["Actualité", "Événement", "Document"].map((label) => (
              <div key={label} className="rounded-lg border bg-card p-4 space-y-2 shadow-sm">
                <div className="h-2 w-3/4 rounded bg-foreground/15" />
                <div className="h-2 w-full rounded bg-muted-foreground/15" />
                <div className="h-2 w-5/6 rounded bg-muted-foreground/15" />
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Event accent indicator */}
          <div
            className="rounded-lg p-4 text-sm font-medium text-center"
            style={{
              background: `hsl(var(--event-primary) / 0.12)`,
              border: `1px solid hsl(var(--event-primary) / 0.3)`,
              color: `hsl(var(--event-accent))`,
            }}
          >
            {cat.icon} Thème actif : {cat.name} — {previewDark ? "mode sombre" : "mode clair"}
          </div>

          {/* Footer mock */}
          <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground text-center">
            © Bureau des Lycéens
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Per-theme config panel ───────────────────────────────────────────────────

function ThemeConfigPanel({ themeId }: { themeId: EventThemeId }) {
  const { store, updateTheme, resetTheme } = useEventTheme();
  const cat = CATALOGUE[themeId];
  const settings = getEffectiveSettings(store, themeId);
  const [showPreview, setShowPreview] = useState(false);

  const today = new Date();
  const activeNow = isInRange(today, settings.dateRange);

  const pad = (n: number) => String(n).padStart(2, "0");

  const handleDateChange = (
    field: "startDay" | "startMonth" | "endDay" | "endMonth",
    raw: string
  ) => {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    updateTheme(themeId, {
      dateRange: { ...settings.dateRange, [field]: val },
    });
  };

  const handleEffectToggle = (key: string, checked: boolean) => {
    updateTheme(themeId, {
      effects: { ...settings.effects, [key]: checked },
    });
  };

  return (
    <>
      {showPreview && (
        <ThemePreview themeId={themeId} onClose={() => setShowPreview(false)} />
      )}

      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label={cat.name}>{cat.icon}</span>
            <div>
              <h2 className="text-xl font-bold">{cat.name}</h2>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={activeNow ? "default" : "secondary"}
              className={activeNow ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : ""}
            >
              {activeNow ? "Actif aujourd'hui" : "Hors période"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Prévisualiser
            </Button>
            <Button size="sm" variant="ghost" onClick={() => resetTheme(themeId)}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Réinitialiser
            </Button>
          </div>
        </div>

        {/* Activation */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={`enable-${themeId}`} className="font-medium">Thème actif</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Désactiver ignore complètement ce thème, même s'il est dans sa période.
                </p>
              </div>
              <Switch
                id={`enable-${themeId}`}
                checked={settings.enabled}
                onCheckedChange={(checked) => updateTheme(themeId, { enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Period */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Période
            </CardTitle>
            <CardDescription>
              Format JJ/MM. Le thème s'active automatiquement dans cette plage de dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Début</Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={1} max={31}
                    value={pad(settings.dateRange.startDay)}
                    onChange={(e) => handleDateChange("startDay", e.target.value)}
                    className="w-14 rounded-md border bg-background px-2 py-1.5 text-sm text-center"
                    aria-label="Jour de début"
                  />
                  <span className="text-muted-foreground">/</span>
                  <input
                    type="number" min={1} max={12}
                    value={pad(settings.dateRange.startMonth)}
                    onChange={(e) => handleDateChange("startMonth", e.target.value)}
                    className="w-14 rounded-md border bg-background px-2 py-1.5 text-sm text-center"
                    aria-label="Mois de début"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Fin</Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={1} max={31}
                    value={pad(settings.dateRange.endDay)}
                    onChange={(e) => handleDateChange("endDay", e.target.value)}
                    className="w-14 rounded-md border bg-background px-2 py-1.5 text-sm text-center"
                    aria-label="Jour de fin"
                  />
                  <span className="text-muted-foreground">/</span>
                  <input
                    type="number" min={1} max={12}
                    value={pad(settings.dateRange.endMonth)}
                    onChange={(e) => handleDateChange("endMonth", e.target.value)}
                    className="w-14 rounded-md border bg-background px-2 py-1.5 text-sm text-center"
                    aria-label="Mois de fin"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Priorité
            </CardTitle>
            <CardDescription>
              En cas de chevauchement de périodes, le thème avec la priorité la plus haute l'emporte.
              Octobre Rose : 80 — Halloween : 90 par défaut.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valeur actuelle</span>
              <span className="font-semibold tabular-nums">{settings.priority}</span>
            </div>
            <Slider
              min={1} max={100} step={1}
              value={[settings.priority]}
              onValueChange={([v]) => updateTheme(themeId, { priority: v })}
              aria-label="Priorité du thème"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Basse (1)</span>
              <span>Haute (100)</span>
            </div>
          </CardContent>
        </Card>

        {/* Effects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Effets visuels
            </CardTitle>
            <CardDescription>
              Choisissez les décorations à afficher. Tous les effets sont discrets et n'interfèrent
              pas avec la navigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cat.availableEffects.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={`fx-${themeId}-${key}`} className="cursor-pointer">
                  {cat.effectLabels[key] ?? key}
                </Label>
                <Switch
                  id={`fx-${themeId}-${key}`}
                  checked={settings.effects[key] ?? false}
                  onCheckedChange={(checked) => handleEffectToggle(key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Global mode panel ────────────────────────────────────────────────────────

function GlobalModePanel() {
  const { store, resolved, setMode } = useEventTheme();
  const { mode } = store;
  const today = new Date();

  const modes: Array<{ value: GlobalMode; label: string; desc: string; icon: React.ReactNode }> = [
    {
      value: "auto",
      label: "Automatique",
      desc: "Le système active le thème selon les dates et priorités configurées.",
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      value: "normal",
      label: "Aucun thème",
      desc: "Aucun thème événementiel n'est appliqué, quelle que soit la date.",
      icon: <Palette className="h-4 w-4" />,
    },
    ...CATALOGUE_ORDER.map((id) => ({
      value: `force:${id}` as GlobalMode,
      label: `Forcer — ${CATALOGUE[id].icon} ${CATALOGUE[id].name}`,
      desc: `Active ${CATALOGUE[id].name} immédiatement pour prévisualiser ou tester, sans modifier les dates.`,
      icon: <Play className="h-4 w-4" />,
    })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Mode global</h2>
        <p className="text-sm text-muted-foreground">
          Contrôle comment les thèmes sont sélectionnés à l'échelle du site.
        </p>
      </div>

      {/* Active theme status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
              {resolved.id ? CATALOGUE[resolved.id].icon : "🔘"}
            </div>
            <div>
              <p className="font-medium text-sm">
                Thème actif : {resolved.id ? `${CATALOGUE[resolved.id].name}` : "Aucun"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === "auto"
                  ? `Mode automatique — ${today.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
                  : mode === "normal"
                  ? "Thèmes désactivés manuellement"
                  : `Forcé manuellement`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode selector */}
      <div className="space-y-2">
        {modes.map(({ value, label, desc, icon }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              mode === value
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
            }`}
          >
            <div className={`mt-0.5 ${mode === value ? "text-primary" : "text-muted-foreground"}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${mode === value ? "text-primary" : "text-foreground"}`}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
            {mode === value && (
              <div className="ml-auto mt-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EventThemesManagement() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6" />
          Thèmes événementiels
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personnalisez l'ambiance du site selon les périodes de l'année.
          Les thèmes s'adaptent automatiquement au mode clair/sombre choisi par chaque visiteur.
        </p>
      </div>

      <Tabs defaultValue="mode">
        <TabsList>
          <TabsTrigger value="mode">Mode global</TabsTrigger>
          {CATALOGUE_ORDER.map((id) => (
            <TabsTrigger key={id} value={id}>
              {CATALOGUE[id].icon} {CATALOGUE[id].name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="mode" className="mt-6">
          <GlobalModePanel />
        </TabsContent>

        {CATALOGUE_ORDER.map((id) => (
          <TabsContent key={id} value={id} className="mt-6">
            <ThemeConfigPanel themeId={id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
