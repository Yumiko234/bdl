import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Admin sub-components ─────────────────────────────────────────────────────
import { NewsManagement }           from "@/components/admin/NewsManagement";
import { EventManagement }          from "@/components/admin/EventManagement";
import { DocumentManagement }       from "@/components/admin/DocumentManagement";
import { BDLMembersManagement }     from "@/components/admin/BDLMembersManagement";
import { BDLHistoryManagement }     from "@/components/admin/BDLHistoryManagement";
import { BDLProfileManagement }     from "@/components/admin/BDLProfileManagement";
import { ContactManagement }        from "@/components/admin/ContactManagement";
import { EstablishmentManagement }  from "@/components/admin/EstablishmentManagement";
import { CalendarManagement }       from "@/components/admin/CalendarManagement";
import { ScrutinManagement }        from "@/components/admin/ScrutinManagement";
import { SurveyManagement }         from "@/components/admin/SurveyManagement";
import { OfficialJournalManagement} from "@/components/admin/OfficialJournalManagement";
import { BannerManagement }         from "@/components/admin/BannerManagement";
import { MaintenanceManagement }    from "@/components/admin/MaintenanceManagement";
import { UserManagement }           from "@/components/admin/UserManagement";
import { SupportManagement }        from "@/components/admin/SupportManagement";
import { RichTextEditor }           from "@/components/RichTextEditor";

// ─── UI ───────────────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Newspaper, Calendar, FileText, Users,
  History, Phone, Building2, CalendarDays, Vote,
  BarChart3, BookMarked, Megaphone,
  Wrench, Shield, Headphones, UserCircle,
  ChevronRight, LayoutDashboard, MessageSquare
} from "lucide-react";

// ─── Role helpers ─────────────────────────────────────────────────────────────
const ROLE_KEYS = [
  "administrator",
  "president", "vice_president", "secretary_general",
  "communication_manager", "bdl_member", "student",
] as const;
type RoleKey = typeof ROLE_KEYS[number];

const rolePrecedence: Record<RoleKey, number> = {
  administrator: 1,
  president: 2, vice_president: 3, secretary_general: 4,
  communication_manager: 5, bdl_member: 6, student: 7,
};

const roleLabel = (r: string) =>
  r === "administrator"          ? "Administrateur"        :
  r === "president"              ? "Président"               :
  r === "vice_president"         ? "Vice-Présidente"         :
  r === "secretary_general"      ? "Secrétaire Générale"     :
  r === "communication_manager"  ? "Dir. Communication"      :
  r === "bdl_member"             ? "Membre BDL"              : "Étudiant";

const getPrimaryRole = (roles: string[]): RoleKey => {
  if (!roles.length) return "student";
  return roles.reduce((best, r) => {
    const rk  = ROLE_KEYS.includes(r as RoleKey)    ? (r    as RoleKey) : "student";
    const bk  = ROLE_KEYS.includes(best as RoleKey) ? (best as RoleKey) : "student";
    return rolePrecedence[rk] < rolePrecedence[bk] ? rk : bk;
  }, roles[0]) as RoleKey;
};

// ─── Nav items definition ─────────────────────────────────────────────────────
interface NavItem {
  id:       string;
  label:    string;
  icon:     React.ReactNode;
  group:    string;
  minRank?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "news",          label: "Actualités",         icon:  <Newspaper    className="h-4 w-4" />, group: "Contenu" },
  { id: "events",        label: "Événements",          icon: <Calendar     className="h-4 w-4" />, group: "Contenu" },
  { id: "calendar",      label: "Calendrier",          icon: <CalendarDays className="h-4 w-4" />, group: "Contenu" },
  { id: "documents",     label: "Documents",           icon: <FileText     className="h-4 w-4" />, group: "Contenu" },
  { id: "journal",       label: "Journal Officiel",    icon: <BookMarked   className="h-4 w-4" />, group: "Contenu" },
  
  { id: "bdl-members",   label: "Membres BDL",         icon: <Users        className="h-4 w-4" />, group: "BDL" },
  { id: "bdl-profiles",  label: "Profils détaillés",   icon: <UserCircle   className="h-4 w-4" />, group: "BDL", minRank: 5 },
  { id: "bdl-history",   label: "Historique BDL",      icon: <History      className="h-4 w-4" />, group: "BDL", minRank: 2 },
  
  { id: "scrutin",       label: "Scrutins",            icon: <Vote         className="h-4 w-4" />, group: "Participation", minRank: 3 },
  { id: "surveys",       label: "Sondages",            icon: <BarChart3    className="h-4 w-4" />, group: "Participation" },
  
  { id: "support",       label: "Support & Audiences", icon: <Headphones   className="h-4 w-4" />, group: "Assistance" },
  
  { id: "president-msg", label: "Message Président",   icon: <MessageSquare className="h-4 w-4" />, group: "Site", minRank: 2 },
  { id: "establishment", label: "Établissement",       icon: <Building2    className="h-4 w-4" />, group: "Site", minRank: 3 },
  { id: "contact",       label: "Contact",             icon: <Phone        className="h-4 w-4" />, group: "Site" },
 
  { id: "users",         label: "Utilisateurs",        icon: <Shield       className="h-4 w-4" />, group: "Administration", minRank: 6 },

  { id: "banner",        label: "Bandeau global",      icon: <Megaphone    className="h-4 w-4" />, group: "Gestion", minRank: 1 },
  { id: "maintenance",   label: "Maintenance",         icon: <Wrench       className="h-4 w-4" />, group: "Gestion", minRank: 1 },
];

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("support");
  const [userRoles,     setUserRoles]     = useState<string[]>([]);
  const [primaryRole,   setPrimaryRole]   = useState<RoleKey>("student");
  const [userProfile,   setUserProfile]   = useState<{ full_name: string } | null>(null);
  const [rolesLoading,  setRolesLoading]  = useState(true);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  
  const [presidentMessage, setPresidentMessage] = useState("");
  const [audienceRequests, setAudienceRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Administration – Bureau des Lycéens";
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
        loadUserRoles();
        loadPresidentMessage();
        loadAudienceRequests();
    }
  }, [user, authLoading]);

  const loadUserRoles = async () => {
    setRolesLoading(true);
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      const roles = (rolesData || []).map((r: any) => r.role);
      setUserRoles(roles);
      const primary = getPrimaryRole(roles);
      setPrimaryRole(primary);

      // administrator + tous les rôles BDL ont accès
      const isBDLStaff = roles.some((r: any) =>
        ['administrator', 'president', 'vice_president', 'secretary_general', 'communication_manager', 'bdl_member'].includes(r)
      );

      if (!isBDLStaff) {
        toast.error("Accès réservé au Bureau des Lycéens");
        navigate("/");
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      if (profileData) setUserProfile(profileData as any);
    } catch (err) {
      console.error(err);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadPresidentMessage = async () => {
    const { data } = await supabase.from('president_message').select('content').single();
    if (data) setPresidentMessage(data.content);
  };

  const loadAudienceRequests = async () => {
    const { data } = await supabase
      .from('audience_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAudienceRequests(data);
  };

  const handleSaveMessage = async () => {
    // administrator ET president peuvent modifier le message
    if (primaryRole !== 'president' && primaryRole !== 'administrator') return;
    setSaving(true);
    const { data: currentMessage } = await supabase.from('president_message').select('id').single();
    const { error } = await supabase
      .from('president_message')
      .update({ content: presidentMessage, updated_by: user?.id })
      .eq('id', currentMessage?.id);

    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Message mis à jour");
    setSaving(false);
  };

  const handleUpdateAudienceStatus = async (id: string, status: string) => {
    if (primaryRole !== 'president' && primaryRole !== 'administrator') return;
    const { error } = await supabase
      .from('audience_requests')
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) toast.error("Erreur de mise à jour");
    else {
        toast.success("Demande mise à jour");
        loadAudienceRequests();
    }
  };

  // L'administrateur a accès à tout (rang 0 ≤ toutes les minRank)
  const isPresident = primaryRole === "president" || primaryRole === "administrator";
  const userRank    = rolePrecedence[primaryRole] ?? 99;
  const visibleItems = NAV_ITEMS.filter((item) => !item.minRank || userRank <= item.minRank);
  const groups = Array.from(new Set(visibleItems.map((i) => i.group)));
  const activeItem = visibleItems.find((i) => i.id === activeSection) ?? visibleItems[0];

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const renderSupportSection = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support & Audiences</h1>
        <p className="text-muted-foreground text-sm">Gestion des échanges internes et des messages publics.</p>
      </div>

      <Tabs defaultValue="connected" className="w-full">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="connected">Support Connecté</TabsTrigger>
          <TabsTrigger value="public">Audiences & Public</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="mt-4">
          <SupportManagement 
            currentUserRole={primaryRole} 
            currentUserId={user?.id ?? ""} 
            currentUserName={userProfile?.full_name ?? "Staff BDL"} 
          />
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Liste des demandes ({audienceRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {audienceRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm italic">Aucun message pour le moment</p>
              ) : (
                audienceRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{req.subject}</h4>
                        <p className="text-xs text-muted-foreground">{req.requester_name} ({req.requester_email})</p>
                      </div>
                      <Badge variant={req.status === 'pending' ? 'default' : req.status === 'approved' ? 'secondary' : 'destructive'}>
                        {req.status === 'pending' ? 'Attente' : req.status === 'approved' ? 'Traité' : 'Refusé'}
                      </Badge>
                    </div>
                    <p className="text-sm bg-background p-3 rounded border italic">"{req.message}"</p>
                    {isPresident && req.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => handleUpdateAudienceStatus(req.id, 'approved')}>Accepter</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleUpdateAudienceStatus(req.id, 'rejected')}>Refuser</Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "news":          return <NewsManagement         isPresident={isPresident} />;
      case "events":        return <EventManagement        isPresident={isPresident} />;
      case "calendar":      return <CalendarManagement />;
      case "documents":     return <DocumentManagement />;
      case "journal":       return <OfficialJournalManagement />;
      case "bdl-members":   return <BDLMembersManagement />;
      case "bdl-profiles":  return <BDLProfileManagement />;
      case "bdl-history":   return <BDLHistoryManagement />;
      case "scrutin":       return <ScrutinManagement />;
      case "surveys":       return <SurveyManagement />;
      case "support":       return renderSupportSection();
      case "president-msg": return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Message du Président</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <RichTextEditor value={presidentMessage} onChange={setPresidentMessage} />
            <Button onClick={handleSaveMessage} disabled={saving}>{saving ? "Enregistrement..." : "Mettre à jour le message"}</Button>
          </CardContent>
        </Card>
      );
      case "establishment": return <EstablishmentManagement />;
      case "contact":       return <ContactManagement />;
      case "banner":        return <BannerManagement />;
      case "maintenance":   return <MaintenanceManagement />;
      case "users":         return <UserManagement />;
      default:              return null;
    }
  };

  const SidebarContent = () => (
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
              className={`text-[10px] h-4 ${primaryRole === 'administrator' ? 'bg-red-100 text-red-700' : ''}`}
            >
              {primaryRole === 'administrator' && '👑 '}{roleLabel(primaryRole)}
            </Badge>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">{group}</p>
            <div className="space-y-1">
              {visibleItems.filter((i) => i.group === group).map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${
                    activeSection === item.id ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.icon} <span className="truncate">{item.label}</span>
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <div className="border-b bg-muted/20 px-4 py-2 flex items-center gap-3">
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}><LayoutDashboard className="h-4 w-4" /></Button>
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <LayoutDashboard className="h-3 w-3" /> Administration <ChevronRight className="h-2 w-2" /> <span className="text-foreground font-semibold">{activeItem?.label}</span>
        </div>
      </div>
      <div className="flex flex-1 relative overflow-hidden">
        <aside className="hidden lg:flex flex-col w-64 border-r bg-card sticky top-0 h-[calc(100vh-112px)]"><SidebarContent /></aside>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-72 bg-card h-full shadow-xl"><SidebarContent /></aside>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{renderSection()}</main>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;