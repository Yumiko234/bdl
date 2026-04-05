import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  HelpCircle,
  Megaphone,
  X,
  Bell,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";

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
}

const ICON_MAP: Record<string, React.ReactNode> = {
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

const GlobalBanner = () => {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadActiveBanner();
  }, []);

  const loadActiveBanner = async () => {
    const { data, error } = await supabase
      .from("global_banners" as any)
      .select("*")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setBanner(data as unknown as Banner);
    }
  };

  if (!banner || dismissed) return null;

  const icon = ICON_MAP[banner.icon] ?? ICON_MAP["alert_circle"];

  const textStyle: React.CSSProperties = {
    fontWeight: banner.is_bold ? 700 : 400,
    fontStyle: banner.is_italic ? "italic" : "normal",
    fontFamily: banner.font_style === "serif" ? "'Times New Roman', serif" : "inherit",
    color: banner.text_color || "#000000",
  };

  return (
    <div
      className="relative py-3 px-4 border-b"
      style={{ backgroundColor: banner.color || "#FFF9C4" }}
    >
      <div className="container mx-auto">
        <div className="flex items-center justify-center gap-3">
          {icon && (
            <span style={{ color: banner.text_color || "#000000" }}>
              {icon}
            </span>
          )}
          <p className="text-sm md:text-base text-center" style={textStyle}>
            {banner.message}
          </p>
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: banner.text_color || "#000000" }}
            aria-label="Fermer le bandeau"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalBanner;