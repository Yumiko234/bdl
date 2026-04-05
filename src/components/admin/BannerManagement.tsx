import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  HelpCircle,
  Megaphone,
  Bell,
  AlertCircle,
  CheckCircle,
  Zap,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Megaphone as BannerIcon,
  X,
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

interface Banner {
  id: string;
  message: string;
  color: string;
  text_color: string;
  icon: string;
  font_style: string;
  is_bold: boolean;
  is_italic: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: "none", label: "Aucun", icon: <X className="h-4 w-4" /> },
  { value: "alert_triangle", label: "Attention", icon: <AlertTriangle className="h-4 w-4" /> },
  { value: "alert_circle", label: "Alerte", icon: <AlertCircle className="h-4 w-4" /> },
  { value: "info", label: "Information", icon: <Info className="h-4 w-4" /> },
  { value: "lightbulb", label: "Idée / Ampoule", icon: <Lightbulb className="h-4 w-4" /> },
  { value: "help_circle", label: "Question", icon: <HelpCircle className="h-4 w-4" /> },
  { value: "megaphone", label: "Annonce", icon: <Megaphone className="h-4 w-4" /> },
  { value: "bell", label: "Cloche", icon: <Bell className="h-4 w-4" /> },
  { value: "check_circle", label: "Succès", icon: <CheckCircle className="h-4 w-4" /> },
  { value: "zap", label: "Urgence / Éclair", icon: <Zap className="h-4 w-4" /> },
];

const COLOR_PRESETS = [
  { bg: "#FFF9C4", text: "#1a1a00", label: "Jaune doux" },
  { bg: "#DBEAFE", text: "#1e3a5f", label: "Bleu info" },
  { bg: "#DCFCE7", text: "#14532d", label: "Vert succès" },
  { bg: "#FEE2E2", text: "#7f1d1d", label: "Rouge alerte" },
  { bg: "#F3E8FF", text: "#4a1772", label: "Violet" },
  { bg: "#07419e", text: "#ffffff", label: "BDL (bleu)" },
  { bg: "#FFB800", text: "#1a1000", label: "Or BDL" },
  { bg: "#111827", text: "#f9fafb", label: "Sombre" },
];

const ICON_RENDER_MAP: Record<string, React.ReactNode> = {
  alert_triangle: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
  alert_circle: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
  info: <Info className="h-5 w-5 flex-shrink-0" />,
  lightbulb: <Lightbulb className="h-5 w-5 flex-shrink-0" />,
  help_circle: <HelpCircle className="h-5 w-5 flex-shrink-0" />,
  megaphone: <Megaphone className="h-5 w-5 flex-shrink-0" />,
  bell: <Bell className="h-5 w-5 flex-shrink-0" />,
  check_circle: <CheckCircle className="h-5 w-5 flex-shrink-0" />,
  zap: <Zap className="h-5 w-5 flex-shrink-0" />,
  none: null,
};

const DEFAULT_FORM = {
  message: "",
  color: "#FFF9C4",
  text_color: "#1a1a00",
  icon: "alert_circle",
  font_style: "default",
  is_bold: false,
  is_italic: false,
  expires_at: "",
  is_active: true,
};

export const BannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    const { data, error } = await supabase
      .from("global_banners" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBanners(data as unknown as Banner[]);
    } else if (error) {
      toast.error("Erreur lors du chargement des bandeaux");
    }
  };

  const handleCreate = async () => {
    if (!form.message.trim()) {
      toast.error("Le message est obligatoire");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload: any = {
      message: form.message,
      color: form.color,
      text_color: form.text_color,
      icon: form.icon,
      font_style: form.font_style,
      is_bold: form.is_bold,
      is_italic: form.is_italic,
      is_active: form.is_active,
      created_by: user?.id,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    // If activating this banner, deactivate all others first
    if (form.is_active) {
      await supabase
        .from("global_banners" as any)
        .update({ is_active: false })
        .eq("is_active", true);
    }

    const { error } = await supabase
      .from("global_banners" as any)
      .insert(payload);

    if (error) {
      toast.error("Erreur lors de la création du bandeau");
    } else {
      toast.success("Bandeau créé avec succès");
      setForm({ ...DEFAULT_FORM });
      setShowForm(false);
      loadBanners();
    }
    setLoading(false);
  };

  const handleToggleActive = async (banner: Banner) => {
    if (!banner.is_active) {
      // Activating: deactivate all others first
      await supabase
        .from("global_banners" as any)
        .update({ is_active: false })
        .eq("is_active", true);
    }

    const { error } = await supabase
      .from("global_banners" as any)
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(banner.is_active ? "Bandeau désactivé" : "Bandeau activé");
      loadBanners();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("global_banners" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Bandeau supprimé");
      loadBanners();
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // Live preview
  const previewIcon = ICON_RENDER_MAP[form.icon] ?? null;
  const previewTextStyle: React.CSSProperties = {
    fontWeight: form.is_bold ? 700 : 400,
    fontStyle: form.is_italic ? "italic" : "normal",
    fontFamily: form.font_style === "serif" ? "'Times New Roman', serif" : "inherit",
    color: form.text_color,
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <BannerIcon className="h-6 w-6" />
            Gestion du Bandeau Global
          </CardTitle>
          <Button
            onClick={() => setShowForm((v) => !v)}
            variant={showForm ? "outline" : "default"}
            className="gap-1"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Annuler" : "Nouveau bandeau"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Création ── */}
        {showForm && (
          <div className="border rounded-xl p-6 bg-muted/30 space-y-5">
            <h3 className="font-semibold text-lg">Créer un bandeau</h3>

            {/* Prévisualisation live */}
            {form.message && (
              <div
                className="relative py-3 px-4 rounded-lg border flex items-center justify-center gap-3"
                style={{ backgroundColor: form.color }}
              >
                {previewIcon && (
                  <span style={{ color: form.text_color }}>{previewIcon}</span>
                )}
                <p className="text-sm text-center" style={previewTextStyle}>
                  {form.message}
                </p>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                rows={2}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Texte du bandeau d'information..."
              />
            </div>

            {/* Icône */}
            <div className="space-y-2">
              <Label>Icône</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Couleurs préréglées */}
            <div className="space-y-2">
              <Label>Couleur du bandeau (préréglages)</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.bg}
                    type="button"
                    onClick={() => setForm({ ...form, color: preset.bg, text_color: preset.text })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                      form.color === preset.bg ? "border-primary scale-105" : "border-transparent"
                    }`}
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                    title={preset.label}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleurs personnalisées */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Couleur de fond (personnalisé)</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="color"
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="#FFF9C4"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_color">Couleur du texte</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="text_color"
                    type="color"
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Style de police */}
            <div className="space-y-2">
              <Label>Police</Label>
              <Select value={form.font_style} onValueChange={(v) => setForm({ ...form, font_style: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Sans-serif (défaut)</SelectItem>
                  <SelectItem value="serif">Serif (Times New Roman)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mise en forme */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_bold"
                  checked={form.is_bold}
                  onCheckedChange={(v) => setForm({ ...form, is_bold: v })}
                />
                <Label htmlFor="is_bold" className="cursor-pointer font-bold">
                  Gras
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_italic"
                  checked={form.is_italic}
                  onCheckedChange={(v) => setForm({ ...form, is_italic: v })}
                />
                <Label htmlFor="is_italic" className="cursor-pointer italic">
                  Italique
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Actif immédiatement
                </Label>
              </div>
            </div>

            {/* Date d'expiration */}
            <div className="space-y-2">
              <Label htmlFor="expires_at">
                Date d'expiration{" "}
                <span className="text-muted-foreground text-xs">(optionnel — laisser vide = permanent)</span>
              </Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>

            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? "Création..." : "Créer le bandeau"}
            </Button>
          </div>
        )}

        {/* ── Liste des bandeaux ── */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Bandeaux existants ({banners.length})</h3>

          {banners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun bandeau créé pour le moment
            </p>
          ) : (
            banners.map((banner) => {
              const expired = isExpired(banner.expires_at);
              const iconEl = ICON_RENDER_MAP[banner.icon] ?? null;

              return (
                <Card key={banner.id} className="bg-muted/20 overflow-hidden">
                  {/* Mini preview */}
                  <div
                    className="py-2 px-4 flex items-center justify-center gap-2 text-sm"
                    style={{ backgroundColor: banner.color }}
                  >
                    {iconEl && (
                      <span style={{ color: banner.text_color }}>{iconEl}</span>
                    )}
                    <span
                      style={{
                        color: banner.text_color,
                        fontWeight: banner.is_bold ? 700 : 400,
                        fontStyle: banner.is_italic ? "italic" : "normal",
                        fontFamily: banner.font_style === "serif" ? "'Times New Roman', serif" : "inherit",
                      }}
                    >
                      {banner.message}
                    </span>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {banner.is_active && !expired ? (
                          <Badge className="bg-green-600 text-white">Actif</Badge>
                        ) : expired ? (
                          <Badge variant="destructive">Expiré</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}

                        {banner.expires_at && !expired && (
                          <span className="text-xs text-muted-foreground">
                            Expire le {new Date(banner.expires_at).toLocaleString("fr-FR")}
                          </span>
                        )}

                        <span className="text-xs text-muted-foreground">
                          Créé le {new Date(banner.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(banner)}
                          disabled={expired}
                          title={banner.is_active ? "Désactiver" : "Activer"}
                        >
                          {banner.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce bandeau ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(banner.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};