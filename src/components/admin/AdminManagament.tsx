import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, Ban, Mail, Lock, Search, AlertTriangle,
  CheckCircle, ChevronDown, ChevronUp, Clock,
  LogIn, Globe, Calendar, Activity, Loader2, RefreshCw,
  UserX, UserCheck, KeyRound, AtSign,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  is_banned: boolean;
  // Stats from auth (populated via edge function)
  last_sign_in?: string | null;
  created_at_auth?: string | null;
  email_confirmed?: boolean;
  phone?: string | null;
}

interface AuthUserStats {
  last_sign_in_at: string | null;
  created_at: string;
  email_confirmed_at: string | null;
  phone: string | null;
  user_metadata: Record<string, any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  administrator:          "Administrateur",
  president:              "Président",
  presidente:             "Présidente",
  vice_president:         "Vice-Président",
  vice_presidente:        "Vice-Présidente",
  secretary_general:      "Secrétaire Général",
  secretary_general2:     "Secrétaire Générale",
  communication_manager:  "Directeur ComCom",
  communication_manager2: "Directrice ComCom",
  vie_scolaire:           "Vie Scolaire",
  bdl_member:             "Membre BDL",
  student:                "Étudiant",
};

const getRoleLabel = (role: string) => ROLE_LABELS[role] ?? role;

const ROLE_PRIORITY: Record<string, number> = {
  administrator: 1, president: 2, presidente: 2,
  vice_president: 3, vice_presidente: 3,
  secretary_general: 4, secretary_general2: 4,
  communication_manager: 5, communication_manager2: 5,
  vie_scolaire: 6, bdl_member: 7, student: 8,
};

const getPrimaryRole = (roles: string[]) =>
  roles.reduce(
    (best, r) =>
      (ROLE_PRIORITY[r] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? r : best,
    roles[0] ?? "student"
  );

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ─── Appel vers la Edge Function ─────────────────────────────────────────────

const callAdminFunction = async (payload: Record<string, any>) => {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: payload,
  });

  // Gestion des erreurs HTTP (ex: 401, 403 renvoyées par la Edge Function)
  if (error) {
    throw new Error(error.message || "Erreur de communication avec le serveur");
  }

  // Gestion des erreurs renvoyées dans le body JSON par ton code Deno
  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<Record<string, AuthUserStats>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  // Dialogs
  const [banDialog, setBanDialog]           = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [emailDialog, setEmailDialog]       = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });

  const [newEmail, setNewEmail]             = useState("");
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [actionLoading, setActionLoading]   = useState(false);

  // ── Load users ───────────────────────────────────────────────────────────────

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (error) {
      toast.error("Erreur lors du chargement");
      setLoading(false); setRefreshing(false);
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const assembled: UserProfile[] = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_banned: (p as any).is_banned === true,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    }));

    // Tri alphabétique par nom de famille (dernier mot du nom complet)
    assembled.sort((a, b) => {
      const lastA = a.full_name.trim().split(" ").pop()?.toLowerCase() ?? "";
      const lastB = b.full_name.trim().split(" ").pop()?.toLowerCase() ?? "";
      return lastA.localeCompare(lastB, "fr");
    });

    setUsers(assembled);
    setLoading(false); setRefreshing(false);
  };

  // ── Load stats for one user (via edge function) ───────────────────────────

  const loadUserStats = async (userId: string) => {
    if (userStats[userId]) return; // already loaded
    setLoadingStats(userId);
    try {
      const { data } = await callAdminFunction({ action: "get_user_stats", userId });
      if (data?.user) {
        setUserStats((prev) => ({ ...prev, [userId]: data.user as AuthUserStats }));
      }
    } catch (err: any) {
      // Edge function might not be deployed yet — graceful fallback
      console.warn("Stats unavailable:", err.message);
    } finally {
      setLoadingStats(null);
    }
  };

  const toggleExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      loadUserStats(userId);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleChangeEmail = async () => {
    if (!emailDialog.user) return;
    if (!newEmail || !newEmail.includes("@")) { toast.error("Email invalide"); return; }
    setActionLoading(true);
    try {
      await callAdminFunction({ action: "update_email", userId: emailDialog.user.id, email: newEmail });
      toast.success(`Email de ${emailDialog.user.full_name} mis à jour.`);
      setEmailDialog({ open: false, user: null });
      setNewEmail("");
      await loadUsers(true);
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordDialog.user) return;
    if (newPassword.length < 8) { toast.error("Minimum 8 caractères."); return; }
    if (newPassword !== confirmPassword) { toast.error("Mots de passe différents."); return; }
    setActionLoading(true);
    try {
      await callAdminFunction({ action: "update_password", userId: passwordDialog.user.id, password: newPassword });
      toast.success(`Mot de passe de ${passwordDialog.user.full_name} modifié.`);
      setPasswordDialog({ open: false, user: null });
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async (user: UserProfile, unban = false) => {
    setActionLoading(true);
    try {
      await callAdminFunction({ action: unban ? "unban_user" : "ban_user", userId: user.id });
      toast.success(unban ? `${user.full_name} débanni.` : `${user.full_name} banni.`);
      setBanDialog({ open: false, user: null });
      await loadUsers(true);
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Filter + display ──────────────────────────────────────────────────────

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-destructive" />
            Gestion Admin — Utilisateurs
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => loadUsers(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">Zone sensible</p>
            <p className="text-muted-foreground">
              Les actions ci-dessous modifient <strong>réellement</strong> les comptes
              (email d'auth, mot de passe, bannissement Supabase). Nécessite la Edge Function <code>admin-users</code> déployée.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""} — trié par nom de famille
        </p>

        {/* User list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((user) => {
              const primary = getPrimaryRole(user.roles);
              const stats = userStats[user.id];
              const isExpanded = expandedUser === user.id;

              return (
                <Card key={user.id} className={`overflow-hidden transition-colors ${user.is_banned ? "bg-destructive/5 border-destructive/20" : "bg-muted/20"}`}>
                  {/* ── Row ── */}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">

                      {/* Avatar */}
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${user.is_banned ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {getInitials(user.full_name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{user.full_name}</span>
                          {user.is_banned && (
                            <Badge variant="destructive" className="text-xs">Banni</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {getRoleLabel(primary)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" title="Modifier l'email"
                          onClick={() => { setEmailDialog({ open: true, user }); setNewEmail(user.email); }}
                          className="h-8 w-8 p-0">
                          <AtSign className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Changer le mot de passe"
                          onClick={() => { setPasswordDialog({ open: true, user }); setNewPassword(""); setConfirmPassword(""); }}
                          className="h-8 w-8 p-0">
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={user.is_banned ? "Débannir" : "Bannir"}
                          onClick={() => user.is_banned ? handleBan(user, true) : setBanDialog({ open: true, user })}
                          className={`h-8 w-8 p-0 ${user.is_banned ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive"}`}
                        >
                          {user.is_banned ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" title="Voir les stats"
                          onClick={() => toggleExpand(user.id)}
                          className="h-8 w-8 p-0">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* ── Expanded stats panel ── */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {loadingStats === user.id ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement des stats…
                          </div>
                        ) : stats ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <StatRow icon={<Calendar className="h-3.5 w-3.5 text-primary" />}
                              label="Compte créé" value={fmtDate(stats.created_at)} />
                            <StatRow icon={<LogIn className="h-3.5 w-3.5 text-green-600" />}
                              label="Dernière connexion" value={fmtDate(stats.last_sign_in_at)} />
                            <StatRow icon={<Mail className="h-3.5 w-3.5 text-blue-600" />}
                              label="Email confirmé"
                              value={stats.email_confirmed_at
                                ? `✅ ${fmtDate(stats.email_confirmed_at)}`
                                : "❌ Non confirmé"} />
                            <StatRow icon={<Activity className="h-3.5 w-3.5 text-amber-500" />}
                              label="Téléphone" value={stats.phone ?? "—"} />
                            {/* Rôles complets */}
                            <div className="sm:col-span-2">
                              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5" /> Rôles assignés
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {user.roles.length === 0
                                  ? <Badge variant="outline" className="text-xs">Étudiant</Badge>
                                  : user.roles.map((r) => (
                                    <Badge key={r} variant="secondary" className="text-xs">{getRoleLabel(r)}</Badge>
                                  ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Stats non disponibles — déployez la Edge Function <code className="bg-muted px-1 rounded">admin-users</code> pour les activer.
                            </p>
                            {/* Affichage minimal sans edge function */}
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length === 0
                                ? <Badge variant="outline" className="text-xs">Étudiant</Badge>
                                : user.roles.map((r) => (
                                  <Badge key={r} variant="secondary" className="text-xs">{getRoleLabel(r)}</Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* ── Ban dialog ── */}
      <Dialog open={banDialog.open} onOpenChange={(o) => setBanDialog({ open: o, user: banDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" /> Bannir l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Cette action <strong>bloque réellement</strong> le compte Supabase de{" "}
              <strong>{banDialog.user?.full_name}</strong> ({banDialog.user?.email}).
              L'utilisateur ne pourra plus se connecter immédiatement. L'action est réversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setBanDialog({ open: false, user: null })}>
              Annuler
            </Button>
            <Button variant="destructive" disabled={actionLoading}
              onClick={() => banDialog.user && handleBan(banDialog.user)}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Confirmer le bannissement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Email dialog ── */}
      <Dialog open={emailDialog.open} onOpenChange={(o) => setEmailDialog({ open: o, user: emailDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AtSign className="h-5 w-5" /> Modifier l'email
            </DialogTitle>
            <DialogDescription>
              Change <strong>l'email d'authentification</strong> de{" "}
              <strong>{emailDialog.user?.full_name}</strong> (Supabase Auth + profil).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nouvel email</Label>
              <Input type="email" value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouvel@email.fr" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailDialog({ open: false, user: null })}>Annuler</Button>
              <Button disabled={actionLoading} onClick={handleChangeEmail}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Modifier l'email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Password dialog ── */}
      <Dialog open={passwordDialog.open} onOpenChange={(o) => setPasswordDialog({ open: o, user: passwordDialog.user })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Changer le mot de passe
            </DialogTitle>
            <DialogDescription>
              Définit un <strong>nouveau mot de passe réel</strong> pour{" "}
              <strong>{passwordDialog.user?.full_name}</strong> via Supabase Admin API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nouveau mot de passe <span className="text-xs text-muted-foreground">(min. 8 caractères)</span></Label>
              <Input type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Confirmer</Label>
              <Input type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" />
            </div>
            {newPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPasswordDialog({ open: false, user: null })}>Annuler</Button>
              <Button
                disabled={actionLoading || newPassword !== confirmPassword || newPassword.length < 8}
                onClick={handleChangePassword}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Modifier le mot de passe
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// ─── Small helper component ───────────────────────────────────────────────────

const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  </div>
);