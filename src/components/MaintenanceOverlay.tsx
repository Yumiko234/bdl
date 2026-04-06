import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wrench, Clock } from "lucide-react";

interface MaintenanceConfig {
  is_active: boolean;
  message: string;
  submessage: string | null;
  estimated_end: string | null;
}

interface MaintenanceOverlayProps {
  children: React.ReactNode;
}

// Pages that remain accessible even in maintenance mode
// The admin panel is always accessible so the president can turn it off
const BYPASS_PATHS = ["/admin", "/auth", "/intranet", "/contact"];

const isBypassPath = () =>
  BYPASS_PATHS.some((p) => window.location.pathname.startsWith(p));

export const MaintenanceOverlay = ({ children }: MaintenanceOverlayProps) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBDLStaff, setIsBDLStaff] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (user) checkStaffRole();
  }, [user]);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("maintenance_mode" as any)
      .select("is_active, message, submessage, estimated_end")
      .limit(1)
      .maybeSingle();

    if (data) setConfig(data as unknown as MaintenanceConfig);
    setLoading(false);
  };

  const checkStaffRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (data) {
      const staffRoles = [
        "president",
        "vice_president",
        "secretary_general",
        "communication_manager",
      ];
      setIsBDLStaff(data.some((r: any) => staffRoles.includes(r.role)));
    }
  };

  // Still loading or maintenance not active → show normal content
  if (loading) return <>{children}</>;
  if (!config?.is_active) return <>{children}</>;

  // BDL staff & admin/auth paths always bypass
  if (isBDLStaff || isBypassPath()) return <>{children}</>;

  // Format estimated end time
  const estimatedEnd = config.estimated_end
    ? new Date(config.estimated_end).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated gears icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/15 border-2 border-primary/30">
            <Wrench className="h-10 w-10 text-primary animate-[spin_4s_linear_infinite]" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Maintenance en cours
          </h1>
          <div className="w-16 h-1 rounded-full bg-accent mx-auto" />
        </div>

        {/* Message */}
        <div className="space-y-3 text-muted-foreground">
          <p className="text-lg leading-relaxed">{config.message}</p>
          {config.submessage && (
            <p className="text-sm">{config.submessage}</p>
          )}
        </div>

        {/* Estimated return */}
        {estimatedEnd && (
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-muted border border-border text-sm font-medium">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              Retour prévu le <strong>{estimatedEnd}</strong>
            </span>
          </div>
        )}

        {/* BDL signature */}
        <p className="text-xs text-muted-foreground italic pt-2">
          — Bureau des Lycéens, Lycée Saint-André
        </p>
      </div>
    </div>
  );
};