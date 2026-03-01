import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { diffWords } from "diff";
import "@/styles/journal.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Modification {
  date: string;
  // On stocke maintenant le résultat sérialisé du diff complet
  diff: DiffPart[];
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  content: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
  modifications?: Modification[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extrait le texte brut d'un contenu HTML
 */
const stripHTML = (html: string): string => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

/**
 * Calcule le diff mot par mot entre deux contenus HTML.
 * On compare le texte brut pour éviter que les balises HTML
 * ne polluent le diff, mais on date la modification.
 */
const computeDiff = (oldContent: string, newContent: string): DiffPart[] => {
  const oldText = stripHTML(oldContent);
  const newText = stripHTML(newContent);

  // diffWords renvoie un tableau de Change objects
  // On ne garde que les parties réellement modifiées + leur contexte immédiat
  return diffWords(oldText, newText).map((part) => ({
    value: part.value,
    added: part.added ?? false,
    removed: part.removed ?? false,
  }));
};

// ─── Sous-composant ArticleRenderer (prévisualisation admin) ──────────────────

const ArticleRenderer = ({ entry }: { entry: JournalEntry }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(id)) newCollapsed.delete(id);
    else newCollapsed.add(id);
    setCollapsedSections(newCollapsed);
  };

  const renderCollapsibleContent = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const elements = Array.from(doc.body.childNodes);

    interface Section {
      id: string;
      title: string;
      level: number;
      htmlContent: string;
      children: Section[];
    }

    const tree: Section[] = [];
    let currentPath: Section[] = [];

    elements.forEach((node, idx) => {
      if (
        node instanceof HTMLElement &&
        ["h1", "h2", "h3", "h4"].includes(node.tagName.toLowerCase())
      ) {
        const level = parseInt(node.tagName.substring(1));
        const newSection: Section = {
          id: `section-${level}-${idx}`,
          title: node.textContent || "",
          level,
          htmlContent: "",
          children: [],
        };

        while (
          currentPath.length > 0 &&
          currentPath[currentPath.length - 1].level >= level
        ) {
          currentPath.pop();
        }

        if (currentPath.length === 0) tree.push(newSection);
        else currentPath[currentPath.length - 1].children.push(newSection);
        currentPath.push(newSection);
      } else {
        const target = currentPath[currentPath.length - 1];
        const html =
          node instanceof HTMLElement
            ? node.outerHTML
            : node.textContent || "";
        if (target) target.htmlContent += html;
        else if (html.trim())
          tree.push({
            id: `intro-${idx}`,
            title: "",
            level: 0,
            htmlContent: html,
            children: [],
          });
      }
    });

    const renderTree = (nodes: Section[]): React.ReactNode => {
      return nodes.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        const isHeader = section.level > 0;
        const levelStyles: Record<number, string> = {
          1: "text-2xl font-black border-l-4 border-[#07419e] bg-blue-50/30",
          2: "text-xl font-bold border-l-4 border-blue-300",
          3: "text-lg font-semibold border-l-2 border-gray-300",
          4: "text-base font-medium border-l-2 border-gray-200 italic text-gray-600",
        };

        return (
          <div
            key={section.id}
            className={`${isHeader ? `mt-4 ${levelStyles[section.level] || ""} pl-4` : "mb-4"}`}
          >
            {isHeader && (
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-2 w-full text-left hover:bg-gray-100/50 p-2 rounded transition-all group"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#07419e]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-[#07419e]" />
                )}
                <span
                  className={
                    section.level <= 2 ? "text-[#07419e]" : "text-gray-800"
                  }
                >
                  {section.title}
                </span>
              </button>
            )}
            {!isCollapsed && (
              <div className={isHeader ? "mt-2 ml-4" : ""}>
                <div
                  className="text-justify leading-relaxed prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: section.htmlContent }}
                />
                {section.children.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {renderTree(section.children)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });
    };

    return <div className="space-y-2">{renderTree(tree)}</div>;
  };

  return (
    <div className="border border-[#FFD700] rounded-2xl bg-white/95 shadow-lg p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#07419e] text-center font-serif">
        {entry.title}
      </h1>
      <p className="text-sm text-center text-gray-600 italic mb-8">
        NOR : {entry.nor_number} — publié le{" "}
        {new Date(entry.publication_date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <article className="text-black">
        {renderCollapsibleContent(entry.content)}
      </article>
      {entry.author_name && (
        <div className="mt-8 pt-4 border-t text-right text-sm text-gray-600 italic">
          {entry.author_role === "president"
            ? "Le Président"
            : entry.author_role === "vice_president"
            ? "La Vice-Présidente"
            : "Bureau des Lycéens"}{" "}
          : {entry.author_name}
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
  const [formData, setFormData] = useState({
    title: "",
    nor_number: "",
    content: "",
    publication_date: "",
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("official_journal" as any)
      .select("*")
      .order("publication_date", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des entrées");
      console.error(error);
    } else {
      setEntries(data as unknown as JournalEntry[]);
    }
  };

  // ── Nouveau detectModifications basé sur diffWords ────────────────────────
  /**
   * Calcule un diff mot par mot entre l'ancien et le nouveau contenu.
   * Ne crée une modification que si le contenu a réellement changé.
   * Retourne null si aucune différence n'est détectée.
   */
  const detectModifications = (
    oldContent: string,
    newContent: string
  ): Modification | null => {
    const oldText = stripHTML(oldContent);
    const newText = stripHTML(newContent);

    // Pas de changement de texte brut → pas de modification à enregistrer
    if (oldText.trim() === newText.trim()) return null;

    const diff = computeDiff(oldContent, newContent);

    // Vérifier qu'il y a au moins un ajout ou une suppression réelle
    const hasRealChanges = diff.some((part) => part.added || part.removed);
    if (!hasRealChanges) return null;

    return {
      date: new Date().toISOString(),
      diff,
    };
  };

  // ── Soumission ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (
      !formData.title ||
      !formData.nor_number ||
      !formData.content ||
      !formData.publication_date
    ) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRole = roles?.[0]?.role || "bdl_member";

    if (editingEntry) {
      const originalEntry = entries.find((e) => e.id === editingEntry);

      // ── Calcul du diff uniquement si le contenu a changé ──
      const newModification =
        originalContent !== formData.content
          ? detectModifications(originalContent, formData.content)
          : null;

      const allModifications = [
        ...(originalEntry?.modifications || []),
        ...(newModification ? [newModification] : []),
      ];

      const { error } = await supabase
        .from("official_journal" as any)
        .update({
          title: formData.title,
          nor_number: formData.nor_number,
          content: formData.content,
          publication_date: formData.publication_date,
          modifications: allModifications,
        })
        .eq("id", editingEntry);

      if (error) {
        toast.error("Erreur lors de la modification");
        console.error(error);
      } else {
        const msg = newModification
          ? "Entrée modifiée — diff enregistré"
          : "Entrée modifiée (métadonnées uniquement)";
        toast.success(msg);
        resetForm();
        loadEntries();
      }
    } else {
      const { error } = await supabase
        .from("official_journal" as any)
        .insert({
          title: formData.title,
          nor_number: formData.nor_number,
          content: formData.content,
          publication_date: formData.publication_date,
          author_id: user.id,
          author_name: (profile as any)?.full_name || null,
          author_role: userRole,
          modifications: [],
        });

      if (error) {
        toast.error("Erreur lors de la publication");
        console.error(error);
      } else {
        toast.success("Entrée publiée avec succès");
        resetForm();
        loadEntries();
      }
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry.id);
    setOriginalContent(entry.content);
    setFormData({
      title: entry.title,
      nor_number: entry.nor_number,
      content: entry.content,
      publication_date: entry.publication_date,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return;

    const { error } = await supabase
      .from("official_journal" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } else {
      toast.success("Entrée supprimée");
      loadEntries();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      nor_number: "",
      content: "",
      publication_date: "",
    });
    setEditingEntry(null);
    setOriginalContent("");
  };

  const handlePreview = () => {
    const currentEntry = editingEntry
      ? entries.find((e) => e.id === editingEntry)
      : null;
    setPreviewEntry({
      id: "preview",
      ...formData,
      author_name: "Prévisualisation",
      author_role: "secretary_general",
      created_at: new Date().toISOString(),
      modifications: currentEntry?.modifications || [],
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/20 py-10">
      <Card className="max-w-6xl mx-auto shadow-card">
        <CardHeader className="text-center border-b">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl font-serif">
            <FileText className="h-7 w-7" />
            Journal Officiel — Gestion des Publications
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* ── Formulaire ── */}
          <section className="border rounded-xl p-6 bg-white/60 shadow-inner">
            <h3 className="font-semibold text-lg mb-4 text-center font-serif">
              {editingEntry
                ? "Modification d'une publication"
                : "Nouvelle publication officielle"}
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Titre de la publication"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nor">Numéro NOR</Label>
                <Input
                  id="nor"
                  value={formData.nor_number}
                  onChange={(e) =>
                    setFormData({ ...formData, nor_number: e.target.value })
                  }
                  placeholder="Ex : BDL2025-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date de publication</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.publication_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      publication_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="content">Contenu officiel</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) =>
                  setFormData({ ...formData, content: value })
                }
                placeholder="Texte de la publication officielle..."
              />
              <p className="text-xs text-muted-foreground">
                💡 Utilisez les titres (Titre 1, Titre 2, Titre 3) pour
                structurer votre document et permettre le pliage/dépliage des
                sections
              </p>
              {/* Avertissement si une modification va être enregistrée */}
              {editingEntry && formData.content !== originalContent && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  ⚠️ Le contenu a été modifié — un diff sera enregistré et
                  visible publiquement dans l'article.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={handleSubmit}>
                {editingEntry ? "Mettre à jour" : "Publier"}
              </Button>
              {editingEntry && (
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
              {formData.content && (
                <Button variant="secondary" onClick={handlePreview}>
                  Prévisualiser
                </Button>
              )}
            </div>
          </section>

          {/* ── Prévisualisation ── */}
          {previewEntry && (
            <section className="border-2 border-blue-300 rounded-xl p-6 bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg font-serif">
                  Prévisualisation
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewEntry(null)}
                >
                  Fermer
                </Button>
              </div>
              <ArticleRenderer entry={previewEntry} />
            </section>
          )}

          {/* ── Liste des publications ── */}
          <section>
            <h3 className="font-semibold text-lg mb-4 font-serif">
              Publications récentes
            </h3>

            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Aucune publication n'a encore été enregistrée.
                </p>
              ) : (
                entries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="bg-muted/30 font-serif hover:shadow-md transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-bold text-lg">{entry.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            NOR : {entry.nor_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.publication_date).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </p>
                          {entry.modifications &&
                            entry.modifications.length > 0 && (
                              <p className="text-xs text-amber-600 font-semibold">
                                {entry.modifications.length} modification
                                {entry.modifications.length > 1 ? "s" : ""}{" "}
                                enregistrée
                                {entry.modifications.length > 1 ? "s" : ""}
                              </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewEntry(entry)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
