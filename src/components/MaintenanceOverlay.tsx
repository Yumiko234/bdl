import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wrench, Clock } from "lucide-react";

interface MaintenanceConfig {
  is_active: boolean;
  message: string;
  submessage: string | null;
  estimated_end: string | null;
  affected_paths: string[] | null;
  blocked_bypass_paths: string[] | null;
}

interface MaintenanceOverlayProps {
  children: React.ReactNode;
}

// Ces chemins ne peuvent JAMAIS être bloqués
const HARD_BYPASS_PATHS = ["/admin", "/auth", "/intranet"];

// Ces chemins sont accessibles par défaut mais peuvent être bloqués optionnellement
const SOFT_BYPASS_PATHS = ["/contact", "/support", "/faq", "/legal"];

const isHardBypass = () =>
  HARD_BYPASS_PATHS.some((p) => window.location.pathname.startsWith(p));

export const MaintenanceOverlay = ({ children }: MaintenanceOverlayProps) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminRole();
    } else {
      setRoleChecked(true);
    }
  }, [user]);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from("maintenance_mode")
      .select("is_active, message, submessage, estimated_end, affected_paths, blocked_bypass_paths")
      .limit(1)
      .maybeSingle();

    if (error) console.error("Erreur chargement config maintenance", error);
    else if (data) setConfig(data as unknown as MaintenanceConfig);
    setLoading(false);
  };

  const checkAdminRole = async () => {
    if (!user) { setRoleChecked(true); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (data) {
      const staffRoles = [
        "administrator", "president", "presidente",
        "vice_president", "vice_presidente",
        "secretary_general", "secretary_general2",
        "communication_manager", "communication_manager2",
        "vie_scolaire", "bdl_member",
      ];
      setIsAdmin(data.some((r: any) => staffRoles.includes(r.role)));
    }
    setRoleChecked(true);
  };

  // Attendre que les deux chargements soient finis pour éviter un flash
  if (loading || !roleChecked) return <>{children}</>;
  if (!config?.is_active) return <>{children}</>;

  // Administrateurs et staff BDL : jamais bloqués
  if (isAdmin) return <>{children}</>;

  // Hard bypass : /admin, /auth, /intranet — jamais bloqués
  if (isHardBypass()) return <>{children}</>;

  const currentPath = window.location.pathname;

  // Mode pages spécifiques : on ne bloque QUE les chemins ciblés
  if (config.affected_paths && config.affected_paths.length > 0) {
    const isAffected = config.affected_paths.some((p) => currentPath.startsWith(p));
    if (!isAffected) return <>{children}</>;
  } else {
    // Mode global : les soft bypass sont accessibles sauf si explicitement bloqués
    const blockedOptional = config.blocked_bypass_paths ?? [];
    const isSoftBypass = SOFT_BYPASS_PATHS.some((p) => currentPath.startsWith(p));
    if (isSoftBypass) {
      const isExplicitlyBlocked = blockedOptional.some((p) => currentPath.startsWith(p));
      if (!isExplicitlyBlocked) return <>{children}</>;
    }
  }

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
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/15 border-2 border-primary/30">
            <Wrench className="h-10 w-10 text-primary animate-[spin_4s_linear_infinite]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {config.affected_paths && config.affected_paths.length > 0
              ? "Page temporairement indisponible"
              : "Maintenance en cours"}
          </h1>
          <div className="w-16 h-1 rounded-full bg-accent mx-auto" />
        </div>

        <div className="space-y-3 text-muted-foreground">
          <p className="text-lg leading-relaxed">{config.message}</p>
          {config.submessage && (
            <p className="text-sm">{config.submessage}</p>
          )}
        </div>

        {estimatedEnd && (
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-muted border border-border text-sm font-medium">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              Retour prévu le <strong>{estimatedEnd}</strong>
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic pt-2">
          - L'Équipe Technique
        </p>
      </div>
    </div>
  );
};
