import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ROLE_KEYS, type RoleKey, rolePrecedence, roleLabel, getPrimaryRole } from "@/lib/roles";

// ─── Admin sub-components ─────────────────────────────────────────────────────
import { AdminDashboard }          from "@/components/admin/AdminDashboard";
import { AdminInternalNotes } from "@/components/admin/AdminInternalNotes";
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
import { AdminManagement } from "@/components/admin/AdminManagament";
import { SupportManagement }        from "@/components/admin/SupportManagement";
import { SuiviActionsManagement } from "@/components/admin/AdminSuiviActions";
import { CertificateManagement } from "@/components/admin/CertificatManagement";
import { AdminConference }     from "@/components/admin/AdminConference";
import { RichTextEditor }           from "@/components/RichTextEditor";

// ─── UI ───────────────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Newspaper, Calendar, FileText, Users,
  History, Phone, Building2, CalendarDays, Vote,
  BarChart3, BookMarked, BookUser,  Megaphone,
  Wrench, Shield, Headphones, UserCircle,
  ChevronRight, LayoutDashboard, MessageSquare
} from "lucide-react";

// ─── Audience request type ────────────────────────────────────────────────────
interface AudienceRequest {
  id: string;
  subject: string;
  message: string;
  requester_name: string;
  requester_email: string;
  status: "pending" | "approved" | "rejected";
}

// ─── Nav items definition ─────────────────────────────────────────────────────
interface NavItem {
  id:       string;
  label:    string;
  icon:     React.ReactNode;
  group:    string;
  minRank?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",     label: "Tableau de bord",     icon: <LayoutDashboard className="h-4 w-4" />, group: "Général" },
  { id: "news",          label: "Actualités",          icon:  <Newspaper    className="h-4 w-4" />, group: "Contenu" },
  { id: "events",        label: "Événements",          icon: <Calendar     className="h-4 w-4" />, group: "Contenu" },
  { id: "calendar",      label: "Calendrier",          icon: <CalendarDays className="h-4 w-4" />, group: "Contenu" },
  { id: "documents",     label: "Documents",           icon: <FileText     className="h-4 w-4" />, group: "Contenu" },
  { id: "journal",       label: "Journal Officiel",    icon: <BookMarked   className="h-4 w-4" />, group: "Contenu" },
  
  { id: "bdl-members",   label: "Membres BDL",         icon: <Users        className="h-4 w-4" />, group: "BDL", minRank: 4 },
  { id: "bdl-profiles",  label: "Profils détaillés",   icon: <UserCircle   className="h-4 w-4" />, group: "BDL", minRank: 5 },
  { id: "bdl-history",   label: "Historique BDL",      icon: <History      className="h-4 w-4" />, group: "BDL", minRank: 5 },
  { id: "bdl-int-notes", label: "Notes Internes",      icon: <BookMarked   className="h-4 w-4" />, group: "BDL", minRank: 5},
  
  { id: "scrutin",       label: "Scrutins",            icon: <Vote         className="h-4 w-4" />, group: "Participation", minRank: 3 },
  { id: "surveys",       label: "Sondages",            icon: <BarChart3    className="h-4 w-4" />, group: "Participation" },
  { id: "actions",       label: "Suivi Actions",       icon: <BarChart3    className="h-4 w-4" />, group: "Participation", minRank: 5 },
  { id: "certificat",    label: "Certificat BDL",      icon: <BookUser     className="h-4 w-4" />, group: "Participation", minRank : 3 },
  
  { id: "support",       label: "Support & Audiences", icon: <Headphones   className="h-4 w-4" />, group: "Assistance" },
  { id: "conference",    label: "Conférence",          icon: <Headphones   className="h-4" />,    group: "Assistance", minRank: 3},

  { id: "president-msg", label: "Message Présidence",   icon: <MessageSquare className="h-4 w-4" />, group: "Site", minRank: 2 },
  { id: "establishment", label: "Établissement",       icon: <Building2    className="h-4 w-4" />, group: "Site", minRank: 3 },
  { id: "contact",       label: "Contact",             icon: <Phone        className="h-4 w-4" />, group: "Site", minRank: 4 },
 
  { id: "users",         label: "Utilisateurs",        icon: <Shield       className="h-4 w-4" />, group: "Administration", minRank: 1 },

  { id: "banner",        label: "Bandeau global",      icon: <Megaphone    className="h-4 w-4" />, group: "Gestion", minRank: 1 },
  { id: "maintenance",   label: "Maintenance",         icon: <Wrench       className="h-4 w-4" />, group: "Gestion", minRank: 1 },
  { id: "admin-user",    label: "Gestion User",        icon: <Wrench       className="h-4 w-4" />, group: "Gestion", minRank: 1},

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
  
  const [presidentMessage, setPresidentMessage] = useState("");
  const [audienceRequests, setAudienceRequests] = useState<AudienceRequest[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
        loadUserRoles();
        loadPresidentMessage();
        loadAudienceRequests();
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .then(({ count }) => setPendingTickets(count ?? 0));
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
        ['administrator', 'president', 'presidente', 'vice_president', 'vice_presidente', 'secretary_general', 'secretary_general2', 'communication_manager', 'communication_manager2', 'bdl_member'].includes(r)
      );

      if (!isBDLStaff) {
        toast.error("Accès réservé au Bureau des Lycéens");
        navigate("/");
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

  const loadPresidentMessage = async () => {
    const { data, error } = await supabase.from('president_message').select('content').single();
    if (error) console.error("Erreur chargement message présidence", error);
    else if (data) setPresidentMessage(data.content);
  };

  const loadAudienceRequests = async () => {
    const { data, error } = await supabase
      .from('audience_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error("Erreur chargement demandes d'audience", error);
    else if (data) setAudienceRequests(data);
  };

  const handleSaveMessage = async () => {
    if (primaryRole !== 'president' && primaryRole !== 'presidente' && primaryRole !== 'administrator') return;
    setSaving(true);
    const { data: currentMessage } = await supabase.from('president_message').select('id').single();
    let error;
    if (currentMessage?.id) {
      ({ error } = await supabase
        .from('president_message')
        .update({ content: presidentMessage, updated_by: user?.id })
        .eq('id', currentMessage.id));
    } else {
      ({ error } = await supabase
        .from('president_message')
        .insert({ content: presidentMessage, updated_by: user?.id }));
    }
    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Message mis à jour");
    setSaving(false);
  };

  const handleUpdateAudienceStatus = async (id: string, status: string) => {
    if (primaryRole !== 'president' && primaryRole !== 'presidente' && primaryRole !== 'administrator') return;
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
  const isPresident = primaryRole === "president" || primaryRole === "presidente" || primaryRole === "administrator";
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
    const requestedItem = NAV_ITEMS.find((i) => i.id === activeSection);
    if (requestedItem?.minRank && userRank > requestedItem.minRank) return null;

    switch (activeSection) {
      case "news":          return <NewsManagement         isPresident={isPresident} />;
      case "events":        return <EventManagement        isPresident={isPresident} />;
      case "calendar":      return <CalendarManagement />;
      case "documents":     return <DocumentManagement />;
      case "journal":       return <OfficialJournalManagement />;
      case "bdl-members":   return <BDLMembersManagement />;
      case "bdl-profiles":  return <BDLProfileManagement />;
      case "dashboard":     return <AdminDashboard />;
      case "bdl-history":   return <BDLHistoryManagement />;
      case "bdl-int-notes": return <AdminInternalNotes />;
      case "scrutin":       return <ScrutinManagement />;
      case "surveys":       return <SurveyManagement />;
      case "actions":       return <SuiviActionsManagement />;
      case "certificat":    return <CertificateManagement />;
      case "conference":    return <AdminConference />;
      case "support":       return renderSupportSection();
      case "president-msg": return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Message de la Présidence</CardTitle></CardHeader>
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
      case "admin-user":    return <AdminManagement />;
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
            {renderSection()}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;