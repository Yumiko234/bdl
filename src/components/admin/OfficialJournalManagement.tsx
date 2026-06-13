import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Edit, Trash2, ChevronDown, ChevronRight,
  PenLine, Plus, X, AlignLeft, AlignCenter, AlignRight, GripVertical,
} from "lucide-react";
import { diffWords } from "diff";
import "@/styles/journal.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Modification { date: string; diff: DiffPart[]; }
interface DiffPart { value: string; added?: boolean; removed?: boolean; }
type SigAlign = "jo-sig-left" | "jo-sig-center" | "jo-sig-right";

interface Signatory {
  uid: string;
  role: string;
  name: string;
  date: string;
  align: SigAlign;
}

interface JournalEntry {
  id: string; title: string; nor_number: string; content: string;
  publication_date: string; author_name: string | null; author_role: string | null;
  created_at: string; modifications?: Modification[]; signatures?: Signatory[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUid = () => Math.random().toString(36).slice(2, 9);

const stripHTML = (html: string): string => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const computeDiff = (o: string, n: string): DiffPart[] =>
  diffWords(stripHTML(o), stripHTML(n)).map((p) => ({
    value: p.value, added: p.added ?? false, removed: p.removed ?? false,
  }));

const ROLE_OPTIONS = [
  { value: "Président", label: "Président" },
  { value: "Présidente", label: "Présidente" },
  { value: "Vice-Président", label: "Vice-Président" },
  { value: "Vice-Présidente", label: "Vice-Présidente" },
  { value: "Secrétaire Général", label: "Secrétaire Général" },
  { value: "Secrétaire Générale", label: "Secrétaire Générale" },
  { value: "Directeur de la Communauté et de la Communication", label: "Dir. Communauté & Communication (H)" },
  { value: "Directrice de la Communauté et de la Communication", label: "Dir. Communauté & Communication (F)" },
  { value: "Membre du Bureau", label: "Membre du Bureau" },
];

const ROLE_LABELS: Record<string, string> = {
  president: "Le Président", presidente: "La Présidente", 
  vice_president: "Le Vice-Président", vice_presidente: "La Vice-Présidente", 
  secretary_general: "Le Secrétaire Général", secretary_general2: "La Secrétaire Générale",
  communication_manager: "Le Directeur de la Communauté et de la Communication", communication_manager2: "La Directrice de la Communauté et de la Communication"
};

// ─── SignatureZone ────────────────────────────────────────────────────────────

interface SignatureZoneProps { signatories: Signatory[]; onChange: (s: Signatory[]) => void; }

const SignatureZone = ({ signatories, onChange }: SignatureZoneProps) => {
  const [adding, setAdding] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Signatory, "uid">>({
    role: ROLE_OPTIONS[0].value, name: "", date: "", align: "jo-sig-left",
  });

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const openAdd = () => {
    setDraft({ role: ROLE_OPTIONS[0].value, name: "", date: `Colmar, le ${today}`, align: "jo-sig-left" });
    setEditingUid(null);
    setAdding(true);
  };

  const openEdit = (s: Signatory) => {
    setDraft({ role: s.role, name: s.name, date: s.date, align: s.align });
    setEditingUid(s.uid);
    setAdding(true);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    if (editingUid) {
      onChange(signatories.map((s) => s.uid === editingUid ? { uid: editingUid, ...draft } : s));
    } else {
      onChange([...signatories, { uid: makeUid(), ...draft }]);
    }
    setAdding(false); setEditingUid(null);
  };

  const remove = (u: string) => onChange(signatories.filter((s) => s.uid !== u));

  const move = (u: string, dir: -1 | 1) => {
    const idx = signatories.findIndex((s) => s.uid === u);
    const next = idx + dir;
    if (next < 0 || next >= signatories.length) return;
    const arr = [...signatories];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="mt-8">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-4">
        <PenLine className="h-4 w-4 text-[#07419e]" />
        <span className="text-sm font-bold tracking-widest uppercase text-[#07419e]">Signatures</span>
        <div className="flex-1 h-px bg-[#07419e]/30 ml-1" />
      </div>

      {/* Aperçu live avec journal.css */}
      <div className="rounded-xl border border-dashed border-[#07419e]/40 bg-white/80 px-6 py-5 min-h-[90px]">
        {signatories.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-3">
            Aucun signataire — cliquez sur « Ajouter un signataire » ci-dessous.
          </p>
        ) : (
          <div className="jo-signatures-grid">
            {signatories.map((s) => (
              <div key={s.uid} className={`jo-sig-block ${s.align}`}>
                <div className="jo-sig-role">{s.role}</div>
                <div className="jo-sig-name">{s.name}</div>
                <div className="jo-sig-line" />
                <div className="jo-sig-date">{s.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liste éditable */}
      {signatories.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {signatories.map((s, idx) => (
            <div key={s.uid} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <div className="flex flex-col gap-px">
                <button type="button" onClick={() => move(s.uid, -1)} disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-25 text-[10px] leading-none" aria-label="Monter">▲</button>
                <button type="button" onClick={() => move(s.uid, 1)} disabled={idx === signatories.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-25 text-[10px] leading-none" aria-label="Descendre">▼</button>
              </div>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
              <div className="flex-1 min-w-0 truncate">
                <span className="font-bold text-[#07419e] text-[11px] uppercase tracking-wide mr-1.5">{s.role}</span>
                <span className="font-medium">{s.name}</span>
                {s.date && <span className="text-muted-foreground text-xs ml-1.5 italic">— {s.date}</span>}
              </div>
              <span className="text-muted-foreground flex-shrink-0">
                {s.align === "jo-sig-left" && <AlignLeft className="h-3.5 w-3.5" />}
                {s.align === "jo-sig-center" && <AlignCenter className="h-3.5 w-3.5" />}
                {s.align === "jo-sig-right" && <AlignRight className="h-3.5 w-3.5" />}
              </span>
              <button type="button" onClick={() => openEdit(s)}
                className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Modifier">
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => remove(s.uid)}
                className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Supprimer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout / édition */}
      {adding ? (
        <div className="mt-4 rounded-xl border border-[#07419e]/25 bg-blue-50/50 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#07419e]">
            {editingUid ? "Modifier le signataire" : "Nouveau signataire"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Rôle */}
            <div className="space-y-1">
              <Label className="text-xs">Rôle / Titre</Label>
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                <option value="__custom">Personnalisé…</option>
              </select>
              {draft.role === "__custom" && (
                <Input placeholder="Intitulé libre" className="mt-1 h-8 text-sm"
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              )}
            </div>
            {/* Nom */}
            <div className="space-y-1">
              <Label className="text-xs">Nom complet</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Prénom Nom" className="h-9 text-sm" />
            </div>
            {/* Date */}
            <div className="space-y-1">
              <Label className="text-xs">Date &amp; lieu</Label>
              <Input value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                placeholder={`Colmar, le ${today}`} className="h-9 text-sm" />
            </div>
            {/* Alignement */}
            <div className="space-y-1">
              <Label className="text-xs">Alignement</Label>
              <div className="flex gap-1.5 mt-0.5">
                {([
                  ["jo-sig-left", <AlignLeft className="h-4 w-4" />, "Gauche"],
                  ["jo-sig-center", <AlignCenter className="h-4 w-4" />, "Centre"],
                  ["jo-sig-right", <AlignRight className="h-4 w-4" />, "Droite"],
                ] as [SigAlign, React.ReactNode, string][]).map(([val, icon, label]) => (
                  <button key={val} type="button" title={label}
                    onClick={() => setDraft({ ...draft, align: val })}
                    className={`flex-1 flex items-center justify-center h-9 rounded-md border text-sm transition-all ${
                      draft.align === val
                        ? "border-[#07419e] bg-[#07419e]/10 text-[#07419e]"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setEditingUid(null); }}>Annuler</Button>
            <Button type="button" size="sm" onClick={save} disabled={!draft.name.trim()}
              className="bg-[#07419e] hover:bg-[#07419e]/90 text-white">
              {editingUid ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={openAdd}
          className="mt-3 gap-1.5 border-dashed border-[#07419e]/50 text-[#07419e] hover:bg-[#07419e]/5">
          <Plus className="h-3.5 w-3.5" />Ajouter un signataire
        </Button>
      )}
    </div>
  );
};

// ─── ArticleRenderer ──────────────────────────────────────────────────────────

const ArticleRenderer = ({ entry }: { entry: JournalEntry }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const s = new Set(collapsedSections); s.has(id) ? s.delete(id) : s.add(id); setCollapsedSections(s);
  };

  const renderCollapsible = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    interface Sec { id: string; title: string; level: number; htmlContent: string; children: Sec[]; }
    const tree: Sec[] = []; let path: Sec[] = [];
    Array.from(doc.body.childNodes).forEach((node, idx) => {
      if (node instanceof HTMLElement && ["h1","h2","h3","h4"].includes(node.tagName.toLowerCase())) {
        const level = parseInt(node.tagName[1]);
        const sec: Sec = { id: `s-${level}-${idx}`, title: node.textContent || "", level, htmlContent: "", children: [] };
        while (path.length && path[path.length-1].level >= level) path.pop();
        path.length ? path[path.length-1].children.push(sec) : tree.push(sec);
        path.push(sec);
      } else {
        const html = node instanceof HTMLElement ? node.outerHTML : node.textContent || "";
        const target = path[path.length-1];
        if (target) target.htmlContent += html;
        else if (html.trim()) tree.push({ id: `intro-${idx}`, title: "", level: 0, htmlContent: html, children: [] });
      }
    });
    const lv: Record<number,string> = {
      1: "text-2xl font-black border-l-4 border-[#07419e] bg-blue-50/30",
      2: "text-xl font-bold border-l-4 border-blue-300",
      3: "text-lg font-semibold border-l-2 border-gray-300",
      4: "text-base font-medium border-l-2 border-gray-200 italic text-gray-600",
    };
    const renderTree = (nodes: Sec[]): React.ReactNode => nodes.map((sec) => {
      const collapsed = collapsedSections.has(sec.id); const isH = sec.level > 0;
      return (
        <div key={sec.id} className={isH ? `mt-4 ${lv[sec.level]||""} pl-4` : "mb-4"}>
          {isH && (
            <button onClick={() => toggle(sec.id)} className="flex items-center gap-2 w-full text-left hover:bg-gray-100/50 p-2 rounded group">
              {collapsed ? <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#07419e]" /> : <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-[#07419e]" />}
              <span className={sec.level <= 2 ? "text-[#07419e]" : "text-gray-800"}>{sec.title}</span>
            </button>
          )}
          {!collapsed && (
            <div className={isH ? "mt-2 ml-4" : ""}>
              <div className="text-justify leading-relaxed prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sec.htmlContent }} />
              {sec.children.length > 0 && <div className="mt-2 space-y-2">{renderTree(sec.children)}</div>}
            </div>
          )}
        </div>
      );
    });
    return <div className="space-y-2">{renderTree(tree)}</div>;
  };

  return (
    <div className="border border-[#FFD700] rounded-2xl bg-white/95 shadow-lg p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#07419e] text-center font-serif">{entry.title}</h1>
      <p className="text-sm text-center text-gray-600 italic mb-8">
        NOR : {entry.nor_number} — publié le{" "}
        {new Date(entry.publication_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <article className="text-black">{renderCollapsible(entry.content)}</article>

      {/* Bloc signatures */}
      {entry.signatures && entry.signatures.length > 0 && (
        <div className="jo-signatures">
          <div className="jo-signatures-title">Signatures</div>
          <div className="jo-signatures-grid">
            {entry.signatures.map((s) => (
              <div key={s.uid} className={`jo-sig-block ${s.align}`}>
                <div className="jo-sig-role">{s.role}</div>
                <div className="jo-sig-name">{s.name}</div>
                <div className="jo-sig-line" />
                <div className="jo-sig-date">{s.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.author_name && (
        <div className="mt-8 pt-4 border-t text-right text-sm text-gray-600 italic">
          {ROLE_LABELS[entry.author_role || ""] || "Bureau des Lycéens"} : {entry.author_name}
        </div>
      )}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

export const OfficialJournalManagement = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<JournalEntry | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [formData, setFormData] = useState({ title: "", nor_number: "", content: "", publication_date: "" });
  const [signatories, setSignatories] = useState<Signatory[]>([]);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase.from("official_journal" as any).select("*").order("publication_date", { ascending: false });
    if (error) { toast.error("Erreur lors du chargement des entrées"); console.error(error); }
    else setEntries(data as unknown as JournalEntry[]);
  };

  const detectModifications = (o: string, n: string): Modification | null => {
    if (stripHTML(o).trim() === stripHTML(n).trim()) return null;
    const diff = computeDiff(o, n);
    if (!diff.some((p) => p.added || p.removed)) return null;
    return { date: new Date().toISOString(), diff };
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.nor_number || !formData.content || !formData.publication_date) {
      toast.error("Veuillez remplir tous les champs"); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Vous devez être connecté"); return; }
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const userRole = roles?.[0]?.role || "bdl_member";

    if (editingEntry) {
      const originalEntry = entries.find((e) => e.id === editingEntry);
      const newMod = originalContent !== formData.content ? detectModifications(originalContent, formData.content) : null;
      const allMods = [...(originalEntry?.modifications || []), ...(newMod ? [newMod] : [])];
      const { error } = await supabase.from("official_journal" as any)
        .update({ title: formData.title, nor_number: formData.nor_number, content: formData.content, publication_date: formData.publication_date, modifications: allMods, signatures: signatories })
        .eq("id", editingEntry);
      if (error) { toast.error("Erreur lors de la modification"); console.error(error); }
      else { toast.success(newMod ? "Entrée modifiée — diff enregistré" : "Entrée modifiée"); resetForm(); loadEntries(); }
    } else {
      const { error } = await supabase.from("official_journal" as any).insert({
        title: formData.title, nor_number: formData.nor_number, content: formData.content,
        publication_date: formData.publication_date, author_id: user.id,
        author_name: (profile as any)?.full_name || null, author_role: userRole,
        modifications: [], signatures: signatories,
      });
      if (error) { toast.error("Erreur lors de la publication"); console.error(error); }
      else { toast.success("Entrée publiée avec succès"); resetForm(); loadEntries(); }
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry.id);
    setOriginalContent(entry.content);
    setFormData({ title: entry.title, nor_number: entry.nor_number, content: entry.content, publication_date: entry.publication_date });
    setSignatories((entry.signatures || []).map((s) => ({ ...s, uid: s.uid || makeUid() })));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return;
    const { error } = await supabase.from("official_journal" as any).delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); console.error(error); }
    else { toast.success("Entrée supprimée"); loadEntries(); }
  };

  const resetForm = () => {
    setFormData({ title: "", nor_number: "", content: "", publication_date: "" });
    setEditingEntry(null); setOriginalContent(""); setSignatories([]);
  };

  const handlePreview = () => {
    const cur = editingEntry ? entries.find((e) => e.id === editingEntry) : null;
    setPreviewEntry({ id: "preview", ...formData, author_name: "Prévisualisation", author_role: "secretary_general", created_at: new Date().toISOString(), modifications: cur?.modifications || [], signatures: signatories });
  };

  return (
    <div className="min-h-screen bg-muted/20 py-10">
      <Card className="max-w-6xl mx-auto shadow-card">
        <CardHeader className="text-center border-b">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl font-serif">
            <FileText className="h-7 w-7" />Journal Officiel — Gestion des Publications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">

          {/* ── Formulaire ── */}
          <section className="border rounded-xl p-6 bg-white/60 shadow-inner">
            <h3 className="font-semibold text-lg mb-4 text-center font-serif">
              {editingEntry ? "Modification d'une publication" : "Nouvelle publication officielle"}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Titre de la publication" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nor">Numéro NOR</Label>
                <Input id="nor" value={formData.nor_number} onChange={(e) => setFormData({ ...formData, nor_number: e.target.value })} placeholder="Ex : BDL2025-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date de publication</Label>
                <Input id="date" type="date" value={formData.publication_date} onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Label htmlFor="content">Contenu officiel</Label>
              <RichTextEditor value={formData.content} onChange={(value) => setFormData({ ...formData, content: value })} placeholder="Texte de la publication officielle..." />
              <p className="text-xs text-muted-foreground">
                💡 Utilisez les titres (Titre 1, Titre 2, Titre 3) pour structurer et permettre le pliage des sections
              </p>
              {editingEntry && formData.content !== originalContent && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  ⚠️ Le contenu a été modifié — un diff sera enregistré et visible publiquement.
                </p>
              )}
            </div>

            {/* ══ Zone Signatures ══ */}
            <SignatureZone signatories={signatories} onChange={setSignatories} />

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={handleSubmit}>{editingEntry ? "Mettre à jour" : "Publier"}</Button>
              {editingEntry && <Button variant="outline" onClick={resetForm}>Annuler</Button>}
              {formData.content && <Button variant="secondary" onClick={handlePreview}>Prévisualiser</Button>}
            </div>
          </section>

          {/* ── Prévisualisation ── */}
          {previewEntry && (
            <section className="border-2 border-blue-300 rounded-xl p-6 bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg font-serif">Prévisualisation</h3>
                <Button variant="ghost" size="sm" onClick={() => setPreviewEntry(null)}>Fermer</Button>
              </div>
              <ArticleRenderer entry={previewEntry} />
            </section>
          )}

          {/* ── Liste des publications ── */}
          <section>
            <h3 className="font-semibold text-lg mb-4 font-serif">Publications récentes</h3>
            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-center text-muted-foreground">Aucune publication n'a encore été enregistrée.</p>
              ) : (
                entries.map((entry) => (
                  <Card key={entry.id} className="bg-muted/30 font-serif hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-bold text-lg">{entry.title}</h4>
                          <p className="text-sm text-muted-foreground">NOR : {entry.nor_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.publication_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                          {entry.modifications && entry.modifications.length > 0 && (
                            <p className="text-xs text-amber-600 font-semibold">
                              {entry.modifications.length} modification{entry.modifications.length > 1 ? "s" : ""} enregistrée{entry.modifications.length > 1 ? "s" : ""}
                            </p>
                          )}
                          {entry.signatures && entry.signatures.length > 0 && (
                            <p className="text-xs text-[#07419e] font-medium flex items-center gap-1">
                              <PenLine className="h-3 w-3" />
                              {entry.signatures.length} signataire{entry.signatures.length > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(entry)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setPreviewEntry(entry)}><FileText className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
};