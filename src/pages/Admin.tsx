import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { type RoleKey, rolePrecedence, roleLabel, getPrimaryRole } from "@/lib/roles";
import { AdminReadOnlyContext } from "@/contexts/AdminReadOnlyContext";

// ─── Admin sub-components ─────────────────────────────────────────────────────
import { AdminDashboard }        from "@/components/admin/AdminDashboard";
import { AdminInternalNotes }    from "@/components/admin/AdminInternalNotes";
import { BDLCentralManagement }  from "@/components/admin/BDLCentralManagement";
import { ContentCentral }        from "@/components/admin/ContentCentral";
import { ParticipationCentral }  from "@/components/admin/ParticipationCentral";
import { AssistanceCentral }     from "@/components/admin/AssistanceCentral";
import { SiteCentral }           from "@/components/admin/SiteCentral";
import { GestionCentral }        from "@/components/admin/GestionCentral";
import { UserManagement }        from "@/components/admin/UserManagement";
import { IdeaBoxManagement }     from "@/components/admin/IdeaBoxManagement";

// ─── UI ───────────────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import {
  Loader2, Newspaper, Vote, History, BookMarked,
  Headphones, Building2, Wrench, Shield, Users,
  ChevronRight, LayoutDashboard, Lightbulb,
} from "lucide-react";

// ─── Nav items definition ─────────────────────────────────────────────────────
interface NavItem {
  id:           string;
  label:        string;
  icon:         React.ReactNode;
  group:        string;
  minRank?:     number;
  excludeRoles?: RoleKey[];
  allowRoles?:   RoleKey[]; // accès explicite indépendamment du minRank
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",     label: "Tableau de bord",  icon: <LayoutDashboard className="h-4 w-4" />, group: "Général",        allowRoles: ["vie_scolaire"] },

  { id: "content",       label: "Contenu",          icon: <Newspaper       className="h-4 w-4" />, group: "Contenu",        allowRoles: ["vie_scolaire"] },

  { id: "bdl",           label: "Gestion BDL",      icon: <History         className="h-4 w-4" />, group: "BDL",            minRank: 5 },
  { id: "bdl-int-notes", label: "Notes Internes",   icon: <BookMarked      className="h-4 w-4" />, group: "BDL",            minRank: 5 },

  { id: "participation", label: "Participation",    icon: <Vote            className="h-4 w-4" />, group: "Participation",  minRank: 5 },
  { id: "idees",         label: "Boîte à idées",   icon: <Lightbulb       className="h-4 w-4" />, group: "Participation",  minRank: 5 },

  { id: "assistance",    label: "Assistance",       icon: <Headphones      className="h-4 w-4" />, group: "Assistance",     minRank: 5 },

  { id: "site",          label: "Site",             icon: <Building2       className="h-4 w-4" />, group: "Site",           minRank: 5 },

  { id: "users",         label: "Utilisateurs",     icon: <Shield          className="h-4 w-4" />, group: "Administration", minRank: 5 },

  { id: "gestion",       label: "Gestion Système",  icon: <Wrench          className="h-4 w-4" />, group: "Gestion",        minRank: 1 },
];

const Admin = () => {
  useSEO({ title: "Administration – Bureau des Lycéens" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "dashboard";

  const mainRef = useRef<HTMLElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const [userRoles,     setUserRoles]     = useState<string[]>([]);
  const [primaryRole,   setPrimaryRole]   = useState<RoleKey>("student");
  const [userProfile,   setUserProfile]   = useState<{ full_name: string } | null>(null);
  const [rolesLoading,  setRolesLoading]  = useState(true);
  const [accessDenied,  setAccessDenied]  = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [pendingTickets, setPendingTickets] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const nav = (mobileOpen ? mobileNavRef.current : navRef.current);
      if (!nav) return;
      const btn = nav.querySelector<HTMLElement>('[data-active="true"]');
      if (!btn) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const absoluteTop = nav.scrollTop + (btnRect.top - navRect.top);
      nav.scrollTo({ top: absoluteTop - (nav.clientHeight - btn.offsetHeight) / 2, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeSection, mobileOpen]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      loadUserRoles();
      supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .then(({ count, error }) => { if (!error) setPendingTickets(count ?? 0); });
    }
  }, [user, authLoading]);

  const loadUserRoles = async () => {
    setRolesLoading(true);
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      const roles = (rolesData || []).map((r: { role: string }) => r.role);
      setUserRoles(roles);
      const primary = getPrimaryRole(roles);
      setPrimaryRole(primary);

      // administrator + tous les rôles BDL ont accès
      const isBDLStaff = roles.some((r) =>
        ['administrator', 'consultante', 'consultant','president', 'presidente', 'vice_president', 'vice_presidente', 'secretary_general', 'secretary_general2', 'communication_manager', 'communication_manager2', 'bdl_member', 'vie_scolaire'].includes(r)
      );

      if (!isBDLStaff) {
        setAccessDenied(true);
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      if (profileData) setUserProfile({ full_name: profileData.full_name });
    } catch (err) {
      console.error(err);
    } finally {
      setRolesLoading(false);
    }
  };

  // L'administrateur a accès à tout (rang 0 ≤ toutes les minRank)
  const isPresident = primaryRole === "president" || primaryRole === "presidente" || primaryRole === "administrator";
  const isReadOnly  = primaryRole === "consultant" || primaryRole === "consultante" || primaryRole === "vie_scolaire";
  const userRank    = rolePrecedence[primaryRole] ?? 99;
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.allowRoles?.includes(primaryRole)) return true;
    if (primaryRole === "vie_scolaire") return false; // whitelist uniquement
    if (item.minRank && userRank > item.minRank) return false;
    if (item.excludeRoles?.includes(primaryRole)) return false;
    return true;
  });
  const groups = Array.from(new Set(visibleItems.map((i) => i.group)));
  const activeItem = visibleItems.find((i) => i.id === activeSection) ?? visibleItems[0];

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Shield className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Espace réservé</h1>
              <p className="text-muted-foreground">
                Cette section est exclusivement accessible aux membres du Bureau des Lycéens.
              </p>
              <p className="text-sm text-muted-foreground">
                Si tu fais partie du BDL et que tu vois ce message, contacte un administrateur pour que ton rôle soit attribué.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
              <Button variant="outline" onClick={() => navigate("/support")}>Contacter le support</Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const renderSection = () => {
    const requestedItem = NAV_ITEMS.find((i) => i.id === activeSection);
    const isAllowed = requestedItem?.allowRoles?.includes(primaryRole);
    const isBlocked = !isAllowed && (
      (primaryRole === "vie_scolaire") ||
      (requestedItem?.minRank && userRank > requestedItem.minRank) ||
      requestedItem?.excludeRoles?.includes(primaryRole)
    );
    if (isBlocked) return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Shield className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Accès non autorisé</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Cette section est réservée aux responsables BDL. Votre rôle actuel ne permet pas d'y accéder.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/dashboard")}>
          Retour au tableau de bord
        </Button>
      </div>
    );

    switch (activeSection) {
      case "dashboard":     return <AdminDashboard />;
      case "content":       return <ContentCentral isPresident={isPresident} primaryRole={primaryRole} />;
      case "bdl":           return <BDLCentralManagement />;
      case "bdl-int-notes": return <AdminInternalNotes />;
      case "participation": return <ParticipationCentral />;
      case "idees":         return <IdeaBoxManagement />;
      case "assistance":    return <AssistanceCentral />;
      case "site":          return <SiteCentral />;
      case "users":         return <UserManagement />;
      case "gestion":       return <GestionCentral />;
      default:              return null;
    }
  };

  const SidebarContent = (isDesktop = false) => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{userProfile?.full_name ?? user?.email}</p>
            <Badge
              variant="secondary"
              className={`text-[10px] h-4 ${primaryRole === 'administrator' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : ''}`}
            >
              {primaryRole === 'administrator' && '👑 '}{roleLabel(primaryRole)}
            </Badge>
          </div>
        </div>
      </div>
      <nav ref={isDesktop ? navRef : mobileNavRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">{group}</p>
            <div className="space-y-1">
              {visibleItems.filter((i) => i.group === group).map((item) => (
                <button
                  key={item.id}
                  data-active={activeSection === item.id ? "true" : undefined}
                  ref={activeSection === item.id ? activeBtnRef : null}
                  onClick={() => { navigate("/admin/" + item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${
                    activeSection === item.id ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.id === "support" && pendingTickets > 0 && activeSection !== "support" && (
                    <span className="ml-auto h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {pendingTickets}
                    </span>
                  )}
                  {activeSection === item.id && <ChevronRight className="h-3 w-3 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t"><Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => navigate("/")}>← Retour au site</Button></div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navigation />
      <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-3 shrink-0">
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}><LayoutDashboard className="h-4 w-4" /></Button>
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <LayoutDashboard className="h-3 w-3" />
          <button onClick={() => navigate("/admin/news")} className="hover:text-foreground transition-colors">Administration</button>
          <ChevronRight className="h-2 w-2" />
          <span className="text-foreground font-semibold">{activeItem?.label}</span>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-64 border-r bg-card shrink-0">{SidebarContent(true)}</aside>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-72 bg-card h-full shadow-xl">{SidebarContent(false)}</aside>
          </div>
        )}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div key={activeSection}>
            <AdminReadOnlyContext.Provider value={isReadOnly}>
              {renderSection()}
            </AdminReadOnlyContext.Provider>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
