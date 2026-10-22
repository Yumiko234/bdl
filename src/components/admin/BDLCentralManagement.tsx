import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminReadOnly } from "@/contexts/AdminReadOnlyContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BDLMembersManagement } from "./BDLMembersManagement";
import {
  History, Users, UserCircle, Plus, Trash2, Pencil, Save, X,
  Search, Eye, CalendarDays,
} from "lucide-react";

// ─── Shared ───────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "administrator",          label: "Administrateur système & Consultant" },
  { value: "consultant",             label: "Consultant" },
  { value: "consultante",            label: "Consultante" },
  { value: "president",              label: "Président" },
  { value: "presidente",             label: "Présidente" },
  { value: "vice_president",         label: "Vice-Président" },
  { value: "vice_presidente",        label: "Vice-Présidente" },
  { value: "secretary_general",      label: "Secrétaire Général" },
  { value: "secretary_general2",     label: "Secrétaire Générale" },
  { value: "communication_manager",  label: "Dir. Communauté & Communication (H)" },
  { value: "communication_manager2", label: "Dir. Communauté & Communication (F)" },
  { value: "bdl_member",             label: "Membre BDL" },
];

const rl = (role: string) => ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "_");

const GLOBAL = "global";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Year {
  id: string;
  year_label: string;
  start_year: number;
  end_year: number;
  is_current: boolean;
}

interface HistMember {
  id: string;
  year_id: string;
  full_name: string;
  role: string;
  is_executive: boolean;
  is_honorary: boolean;
  avatar_url: string | null;
  display_order: number;
}

interface Profile {
  id: string;
  full_name: string;
  slug: string;
  person_slug: string;
  year_id: string | null;
  photo_url: string | null;
  age: number | null;
  role: string | null;
  class: string | null;
  contact_method: string | null;
  biography: string | null;
  career_path: string | null;
  anecdote: string | null;
  display_order: number;
  is_published: boolean;
  bdl_years?: { year_label: string } | null;
}

// ─── Tab 1 : Par année ────────────────────────────────────────────────────────

const BDLByYear = () => {
  const readOnly = useAdminReadOnly();
  const [years, setYears] = useState<Year[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [members, setMembers] = useState<HistMember[]>([]);
  const [loadingM, setLoadingM] = useState(false);
  const [showYearForm, setShowYearForm] = useState(false);
  const [yf, setYf] = useState({ start_year: new Date().getFullYear(), end_year: new Date().getFullYear() + 1, is_current: false });
  const [showAdd, setShowAdd] = useState(false);
  const [af, setAf] = useState({ full_name: "", role: "bdl_member", is_executive: false, is_honorary: false, display_order: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState({ role: "bdl_member", is_executive: false, is_honorary: false, display_order: 0 });
  const [confirm, setConfirm] = useState<(() => Promise<void>) | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { if (selId) loadMembers(selId); }, [selId]);

  const loadYears = async () => {
    const { data } = await supabase.from("bdl_years").select("*").order("start_year", { ascending: false });
    setYears(data || []);
    if (!selId && data?.length) setSelId(data[0].id);
  };

  const loadMembers = async (yid: string) => {
    setLoadingM(true);
    const { data } = await supabase.from("bdl_historical_members").select("*")
      .eq("year_id", yid).order("is_executive", { ascending: false }).order("display_order", { ascending: true });
    setMembers(data || []);
    setLoadingM(false);
  };

  const createYear = async () => {
    if (yf.start_year >= yf.end_year) { toast.error("Année de fin > début"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("bdl_years").insert({
      year_label: `${yf.start_year}-${yf.end_year}`,
      start_year: yf.start_year, end_year: yf.end_year,
      is_current: yf.is_current, created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Année créée");
    setShowYearForm(false);
    loadYears();
  };

  const deleteYear = (y: Year) => setConfirm(() => async () => {
    const { error } = await supabase.from("bdl_years").delete().eq("id", y.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Année supprimée");
    setSelId(null);
    loadYears();
  });

  const addMember = async () => {
    if (!selId || !af.full_name.trim()) { toast.error("Nom requis"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("bdl_historical_members").insert({
      year_id: selId, full_name: af.full_name.trim(),
      role: af.role, is_executive: af.is_executive,
      is_honorary: af.is_honorary, display_order: af.display_order,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Membre ajouté");
    setAf({ full_name: "", role: "bdl_member", is_executive: false, is_honorary: false, display_order: 0 });
    setShowAdd(false);
    loadMembers(selId);
  };

  const saveMember = async () => {
    if (!editId) return;
    setSaving(true);
    const { error } = await supabase.from("bdl_historical_members").update(ef).eq("id", editId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mis à jour");
    setEditId(null);
    if (selId) loadMembers(selId);
  };

  const deleteMember = (m: HistMember) => setConfirm(() => async () => {
    const { error } = await supabase.from("bdl_historical_members").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Membre retiré");
    if (selId) loadMembers(selId);
  });

  const selYear = years.find((y) => y.id === selId);
  const exec = members.filter((m) => m.is_executive);
  const regular = members.filter((m) => !m.is_executive && !m.is_honorary);
  const honorary = members.filter((m) => m.is_honorary);

  const MemberRow = ({ m }: { m: HistMember }) => {
    const isEdit = editId === m.id;
    return (
      <div className={`border rounded-lg p-3 space-y-2.5 ${isEdit ? "ring-2 ring-primary bg-muted/20" : "bg-background"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
              {initials(m.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{m.full_name}</p>
              {!isEdit && <p className="text-xs text-muted-foreground">{rl(m.role)}</p>}
            </div>
          </div>
          {!readOnly && (
            isEdit ? (
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" onClick={saveMember} disabled={saving}><Save className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => { setEditId(m.id); setEf({ role: m.role, is_executive: m.is_executive, is_honorary: m.is_honorary, display_order: m.display_order }); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMember(m)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}
        </div>
        {isEdit && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Rôle</Label>
              <Select value={ef.role} onValueChange={(v) => setEf({ ...ef, role: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordre</Label>
              <Input type="number" className="h-8 text-xs" value={ef.display_order}
                onChange={(e) => setEf({ ...ef, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-col gap-1.5 justify-end">
              <div className="flex items-center gap-1.5">
                <Switch id={`ex-${m.id}`} checked={ef.is_executive} onCheckedChange={(v) => setEf({ ...ef, is_executive: v })} />
                <Label htmlFor={`ex-${m.id}`} className="text-xs">Exécutif</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id={`ho-${m.id}`} checked={ef.is_honorary} onCheckedChange={(v) => setEf({ ...ef, is_honorary: v })} />
                <Label htmlFor={`ho-${m.id}`} className="text-xs">Honorifique</Label>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Section = ({ title, items, variant }: { title: string; items: HistMember[]; variant: "default" | "secondary" | "outline" }) => {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={variant} className="text-xs">{title}</Badge>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <div className="space-y-1.5">{items.map((m) => <MemberRow key={m.id} m={m} />)}</div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
      {/* Sidebar années */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Années</span>
          {!readOnly && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowYearForm(!showYearForm)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {showYearForm && !readOnly && (
          <Card className="p-3 space-y-2 border-primary/40">
            <p className="text-xs font-semibold">Nouvelle année</p>
            <div className="flex items-center gap-1.5">
              <Input type="number" className="h-7 text-xs" value={yf.start_year}
                onChange={(e) => setYf({ ...yf, start_year: parseInt(e.target.value) })} />
              <span className="text-xs flex-shrink-0">–</span>
              <Input type="number" className="h-7 text-xs" value={yf.end_year}
                onChange={(e) => setYf({ ...yf, end_year: parseInt(e.target.value) })} />
            </div>
            <div className="flex items-center gap-1.5">
              <Switch id="yfc" checked={yf.is_current} onCheckedChange={(v) => setYf({ ...yf, is_current: v })} />
              <Label htmlFor="yfc" className="text-xs">Année en cours</Label>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={createYear} disabled={saving}>Créer</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowYearForm(false)}>Annuler</Button>
            </div>
          </Card>
        )}

        <div className="space-y-1">
          {years.map((y) => (
            <button key={y.id} onClick={() => setSelId(y.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                selId === y.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}>
              <span className="font-medium">{y.year_label}</span>
              {y.is_current && <Badge variant="secondary" className="text-[10px] px-1 py-0">En cours</Badge>}
            </button>
          ))}
        </div>
      </div>

      {/* Détail année */}
      {!selYear ? (
        <p className="text-center text-muted-foreground py-16 text-sm">Sélectionnez une année</p>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  BDL {selYear.year_label}
                  {selYear.is_current && <Badge className="text-xs">En cours</Badge>}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{members.length} membre(s)</p>
              </div>
              {!readOnly && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
                    <Plus className="h-4 w-4 mr-1" />Ajouter
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteYear(selYear)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAdd && !readOnly && (
              <Card className="border-primary/40 p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" />Ajouter un membre à {selYear.year_label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom complet *</Label>
                    <Input className="h-8 text-sm" value={af.full_name}
                      onChange={(e) => setAf({ ...af, full_name: e.target.value })} placeholder="Prénom Nom" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rôle</Label>
                    <Select value={af.role} onValueChange={(v) => setAf({ ...af, role: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ordre</Label>
                    <Input type="number" className="h-8 text-xs" value={af.display_order}
                      onChange={(e) => setAf({ ...af, display_order: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    <div className="flex items-center gap-2">
                      <Switch id="af-ex" checked={af.is_executive} onCheckedChange={(v) => setAf({ ...af, is_executive: v })} />
                      <Label htmlFor="af-ex" className="text-xs">Exécutif</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="af-ho" checked={af.is_honorary} onCheckedChange={(v) => setAf({ ...af, is_honorary: v })} />
                      <Label htmlFor="af-ho" className="text-xs">Honorifique</Label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addMember} disabled={saving}>Ajouter</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
                </div>
              </Card>
            )}

            {loadingM ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun membre</p>
            ) : (
              <div className="space-y-4">
                <Section title="Équipe Exécutive" items={exec} variant="default" />
                <Section title="Membres" items={regular} variant="secondary" />
                <Section title="Honorifiques" items={honorary} variant="outline" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog open={confirm !== null} description="Confirmer la suppression ?"
        onConfirm={async () => { await confirm!(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
};

// ─── Tab 2 : Fiches détaillées ────────────────────────────────────────────────

interface Person { slug: string; full_name: string; }

const emptyProfileForm = {
  full_name: "", slug: "", year_id: "", photo_url: "",
  age: "", role: "", class: "", contact_method: "",
  biography: "", career_path: "", anecdote: "",
  display_order: 0, is_published: false,
};

const BDLByPerson = () => {
  const readOnly = useAdminReadOnly();
  const [persons, setPersons] = useState<Person[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [search, setSearch] = useState("");
  const [selSlug, setSelSlug] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fd, setFd] = useState<typeof emptyProfileForm>(emptyProfileForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [histRes, profRes, yearsRes] = await Promise.all([
      supabase.from("bdl_historical_members").select("full_name").order("full_name"),
      supabase.from("bdl_member_profiles").select("*, bdl_years(year_label, start_year)").order("full_name"),
      supabase.from("bdl_years").select("*").order("start_year", { ascending: false }),
    ]);

    const seen = new Set<string>();
    const pList: Person[] = [];
    (histRes.data || []).forEach((m: { full_name: string }) => {
      const s = slugify(m.full_name);
      if (!seen.has(s)) { seen.add(s); pList.push({ slug: s, full_name: m.full_name }); }
    });
    (profRes.data || []).forEach((p: Profile) => {
      if (!seen.has(p.person_slug)) { seen.add(p.person_slug); pList.push({ slug: p.person_slug, full_name: p.full_name }); }
    });
    pList.sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));

    setPersons(pList);
    setProfiles(profRes.data || []);
    setYears(yearsRes.data || []);
  };

  const suggestSlug = (name: string, yid: string) => {
    const base = slugify(name);
    const y = years.find((yr) => yr.id === yid);
    return y ? `${base}-${slugify(y.year_label)}` : base;
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Image requis"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `bdl-profiles/${fd.slug || Date.now()}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error("Erreur upload"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setFd((f) => ({ ...f, photo_url: publicUrl }));
    toast.success("Photo uploadée");
    setUploading(false);
  };

  const resetForm = () => { setFd(emptyProfileForm); setEditId(null); setShowForm(false); };

  const openEdit = (p: Profile) => {
    setEditId(p.id);
    setShowForm(true);
    setFd({
      full_name: p.full_name, slug: p.slug,
      year_id: p.year_id || "",
      photo_url: p.photo_url || "",
      age: p.age?.toString() || "", role: p.role || "",
      class: p.class || "", contact_method: p.contact_method || "",
      biography: p.biography || "", career_path: p.career_path || "",
      anecdote: p.anecdote || "", display_order: p.display_order,
      is_published: p.is_published,
    });
  };

  const saveProfile = async () => {
    if (!fd.full_name || !fd.slug) { toast.error("Nom et slug requis"); return; }
    if (!fd.year_id) { toast.error("Sélectionnez une année"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      full_name: fd.full_name, slug: fd.slug,
      person_slug: slugify(fd.full_name),
      year_id: fd.year_id,
      photo_url: fd.photo_url || null,
      age: fd.age ? parseInt(fd.age) : null,
      role: fd.role || null, class: fd.class || null,
      contact_method: fd.contact_method || null,
      biography: fd.biography || null,
      career_path: fd.career_path || null,
      anecdote: fd.anecdote || null,
      display_order: fd.display_order,
      is_published: fd.is_published,
    };
    const { error } = editId
      ? await supabase.from("bdl_member_profiles").update(payload).eq("id", editId)
      : await supabase.from("bdl_member_profiles").insert({ ...payload, user_id: user?.id || null });
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "Slug déjà utilisé" : error.message); return; }
    toast.success(editId ? "Fiche mise à jour" : "Fiche créée");
    resetForm();
    loadAll();
  };

  const deleteProfile = (p: Profile) => setConfirm(() => async () => {
    const { error } = await supabase.from("bdl_member_profiles").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Fiche supprimée"); loadAll(); }
  });

  const q = search.trim().toLowerCase();
  const filtered = q ? persons.filter((p) => p.full_name.toLowerCase().includes(q)) : persons;

  const selPerson = persons.find((p) => p.slug === selSlug);
  const selProfiles = selSlug
    ? profiles
        .filter((p) => p.person_slug === selSlug)
        .sort((a, b) => ((b.bdl_years as any)?.start_year ?? 0) - ((a.bdl_years as any)?.start_year ?? 0))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
      {/* Sidebar personnes */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Rechercher…" value={search}
            onChange={(e) => { setSearch(e.target.value); setSelSlug(null); setShowForm(false); }} />
        </div>
        <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Aucun résultat</p>
          ) : filtered.map((p) => {
            const count = profiles.filter((pr) => pr.person_slug === p.slug).length;
            return (
              <button key={p.slug}
                onClick={() => { setSelSlug(p.slug); setShowForm(false); setEditId(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  selSlug === p.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {initials(p.full_name)}
                  </div>
                  <span className="text-sm truncate">{p.full_name}</span>
                </div>
                {count > 0 && <span className="text-xs opacity-60 flex-shrink-0">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Détail / formulaire */}
      <div>
        {showForm ? (
          <Card className="border-primary/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editId ? "Modifier la fiche" : `Créer la fiche — ${selPerson?.full_name ?? fd.full_name}`}</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Année obligatoire */}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Année scolaire *</Label>
                  <Select value={fd.year_id}
                    onValueChange={(v) => setFd((f) => ({ ...f, year_id: v, slug: slugify(f.full_name) }))}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Sélectionner une année…" /></SelectTrigger>
                    <SelectContent>
                      {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.year_label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rôle (affiché) *</Label>
                  <Input value={fd.role} onChange={(e) => setFd((f) => ({ ...f, role: e.target.value }))} placeholder="Président, Consultante…" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slug (URL)</Label>
                  <Input value={fd.slug} onChange={(e) => setFd((f) => ({ ...f, slug: e.target.value }))} />
                  <p className="text-[10px] text-muted-foreground">/bdl/{fd.slug || "…"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Âge</Label>
                  <Input type="number" value={fd.age} onChange={(e) => setFd((f) => ({ ...f, age: e.target.value }))} placeholder="17" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Classe</Label>
                  <Input value={fd.class} onChange={(e) => setFd((f) => ({ ...f, class: e.target.value }))} placeholder="CPGE" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Contact</Label>
                  <Input value={fd.contact_method} onChange={(e) => setFd((f) => ({ ...f, contact_method: e.target.value }))} placeholder="email ou @instagram" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Photo</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploading} />
                    {uploading && <span className="text-xs text-muted-foreground">Upload…</span>}
                  </div>
                  {fd.photo_url && <img src={fd.photo_url} alt="Preview" className="mt-1 h-16 w-16 object-cover rounded-full" />}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Biographie</Label>
                  <Textarea value={fd.biography} onChange={(e) => setFd((f) => ({ ...f, biography: e.target.value }))} rows={3} placeholder="Présentation…" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Parcours</Label>
                  <Textarea value={fd.career_path} onChange={(e) => setFd((f) => ({ ...f, career_path: e.target.value }))} rows={3} placeholder="Parcours…" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Anecdote</Label>
                  <Textarea value={fd.anecdote} onChange={(e) => setFd((f) => ({ ...f, anecdote: e.target.value }))} rows={2} placeholder="Anecdote…" />
                </div>
                <div className="flex items-center gap-2 self-end pb-1">
                  <Switch id="pf-pub" checked={fd.is_published} onCheckedChange={(v) => setFd((f) => ({ ...f, is_published: v }))} />
                  <Label htmlFor="pf-pub" className="text-xs">Publié</Label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />{saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 mr-1" />Annuler</Button>
              </div>
            </CardContent>
          </Card>
        ) : selSlug ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{selPerson?.full_name}</h3>
              {!readOnly && (
                <Button size="sm" onClick={() => {
                  setFd({ ...emptyProfileForm, full_name: selPerson?.full_name ?? "", slug: slugify(selPerson?.full_name ?? "") });
                  setShowForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-1" />Ajouter une fiche
                </Button>
              )}
            </div>
            {selProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Pas encore de fiche pour cette personne</p>
            ) : selProfiles.map((p) => (
              <Card key={p.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {p.photo_url && (
                      <img src={p.photo_url} alt={p.full_name} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-medium">
                          {(p.bdl_years as any)?.year_label ?? "—"}
                        </Badge>
                        {p.is_published
                          ? <Badge className="text-xs bg-green-600">Publié</Badge>
                          : <Badge variant="secondary" className="text-xs">Brouillon</Badge>}
                      </div>
                      {p.role && <p className="text-sm text-muted-foreground">{p.role}</p>}
                      <p className="text-[10px] text-muted-foreground">/bdl/{p.slug}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {p.is_published && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/bdl/${p.slug}`, "_blank")}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!readOnly && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteProfile(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16 text-sm">Sélectionnez une personne</p>
        )}
      </div>

      <ConfirmDialog open={confirm !== null} description="Supprimer cette fiche ?"
        onConfirm={async () => { await confirm!(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
};

// ─── Export principal ─────────────────────────────────────────────────────────

export const BDLCentralManagement = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <History className="h-6 w-6" />
      <h2 className="text-xl font-bold">Gestion BDL</h2>
    </div>
    <Tabs defaultValue="active">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active" className="flex items-center gap-1.5 text-sm">
          <Users className="h-3.5 w-3.5" />Membres actifs
        </TabsTrigger>
        <TabsTrigger value="year" className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="h-3.5 w-3.5" />Historique des bureaux
        </TabsTrigger>
        <TabsTrigger value="person" className="flex items-center gap-1.5 text-sm">
          <UserCircle className="h-3.5 w-3.5" />Fiches détaillées
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="mt-4"><BDLMembersManagement /></TabsContent>
      <TabsContent value="year" className="mt-4"><BDLByYear /></TabsContent>
      <TabsContent value="person" className="mt-4"><BDLByPerson /></TabsContent>
    </Tabs>
  </div>
);
