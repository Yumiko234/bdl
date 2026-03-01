import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight } from "lucide-react";
import "@/styles/journal.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface Modification {
  date: string;
  diff: DiffPart[];
}

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  content: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
  modifications?: Modification[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fusionne tous les diffs successifs en un seul rendu HTML inline.
 * Pour chaque modification, on annote les mots :
 *   - supprimés : <del class="diff-removed">
 *   - ajoutés   : <ins class="diff-added">
 * Chaque bloc de changements est annoté de sa date en exposant.
 *
 * On empile les modifications : la version finale visible est le texte
 * reconstruit avec toutes les marques visibles.
 */
const buildAnnotatedHTML = (modifications: Modification[]): string => {
  if (!modifications || modifications.length === 0) return "";

  // On reconstruit un HTML annoté pour chaque modification,
  // en les concaténant toutes dans un seul flux de texte.
  // Les modifications sont affichées dans l'ordre chronologique.
  return modifications
    .map((mod) => {
      const dateStr = new Date(mod.date).toLocaleDateString("fr-FR");
      const hasChanges = mod.diff.some((p) => p.added || p.removed);
      if (!hasChanges) return null;

      // Groupe les parties consécutives changed pour attacher la date une seule fois
      let html = "";
      let inChangeBlock = false;
      let changeBlock = "";

      mod.diff.forEach((part, idx) => {
        if (part.removed) {
          changeBlock += `<del class="diff-removed">${escapeHTML(part.value)}</del>`;
          inChangeBlock = true;
        } else if (part.added) {
          changeBlock += `<ins class="diff-added">${escapeHTML(part.value)}</ins>`;
          inChangeBlock = true;
        } else {
          // Partie inchangée : on ferme le bloc de changement si besoin
          if (inChangeBlock) {
            html += `<span class="diff-block">${changeBlock}<sup class="diff-date">[${dateStr}]</sup></span>`;
            changeBlock = "";
            inChangeBlock = false;
          }
          html += escapeHTML(part.value);
        }

        // Dernier élément
        if (idx === mod.diff.length - 1 && inChangeBlock) {
          html += `<span class="diff-block">${changeBlock}<sup class="diff-date">[${dateStr}]</sup></span>`;
        }
      });

      return html;
    })
    .filter(Boolean)
    .join("");
};

const escapeHTML = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Injecte le HTML annoté (diff) dans le HTML de l'article.
 *
 * Stratégie : le diff opère sur le texte brut de l'article.
 * On reconstruit le HTML en remplaçant le contenu textuel des blocs
 * (p, li, td…) par le diff annoté, en préservant la structure des titres.
 *
 * Pour garder la structure du RichTextEditor (headings + paragraphes),
 * on utilise un DOMParser, on identifie le texte brut de chaque nœud feuille,
 * et on remplace le texte par le diff correspondant.
 */
const injectDiffIntoContent = (
  htmlContent: string,
  modifications: Modification[]
): string => {
  if (!modifications || modifications.length === 0) return htmlContent;

  // Filtre les modifications au nouveau format uniquement (avec diff[])
  // Les anciennes entrées { oldText, newText, position } sont ignorées silencieusement
  const validMods = modifications.filter(
    (m) => Array.isArray((m as any).diff) && (m as any).diff.length > 0
  );
  if (validMods.length === 0) return htmlContent;

  const lastMod = validMods[validMods.length - 1];

  let diffHTML = "";
  const dateStr = new Date(lastMod.date).toLocaleDateString("fr-FR");

  lastMod.diff.forEach((part) => {
    if (part.removed) {
      diffHTML += `<del class="diff-removed">${escapeHTML(part.value)}</del>`;
    } else if (part.added) {
      diffHTML += `<ins class="diff-added">${escapeHTML(part.value)}</ins><sup class="diff-date">[${dateStr}]</sup>`;
    } else {
      diffHTML += escapeHTML(part.value);
    }
  });

  // On parse le HTML original, on identifie les blocs de texte non-heading
  // et on remplace leur contenu par le diffHTML (une seule injection dans
  // le premier bloc de texte trouvé — le diff couvre tout le texte brut)
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const headingTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

  let injected = false;
  const result: string[] = [];

  doc.body.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      if (!injected && node.textContent?.trim()) {
        injected = true;
        result.push(diffHTML);
      }
      return;
    }

    const tag = node.tagName.toLowerCase();

    if (headingTags.has(tag)) {
      // Titres : on préserve intact
      result.push(node.outerHTML);
    } else if (!injected) {
      // Premier bloc de texte : on y place tout le diff
      injected = true;
      // Préserver les attributs du nœud (class, style…)
      const attrs = Array.from(node.attributes)
        .map((a) => `${a.name}="${a.value}"`)
        .join(" ");
      result.push(`<${tag}${attrs ? " " + attrs : ""}>${diffHTML}</${tag}>`);
    }
    // Les blocs suivants sont ignorés : leur contenu est déjà dans le diff
  });

  return result.join("\n");
};

// ─── Composant ArticleContent ─────────────────────────────────────────────────

const ArticleContent = ({ entry }: { entry: JournalEntry }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (id: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
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
          level: level,
          htmlContent: "",
          children: [],
        };

        while (
          currentPath.length > 0 &&
          currentPath[currentPath.length - 1].level >= level
        ) {
          currentPath.pop();
        }

        if (currentPath.length === 0) {
          tree.push(newSection);
        } else {
          currentPath[currentPath.length - 1].children.push(newSection);
        }
        currentPath.push(newSection);
      } else {
        const target = currentPath[currentPath.length - 1];
        const html =
          node instanceof HTMLElement ? node.outerHTML : node.textContent || "";
        if (target) {
          target.htmlContent += html;
        } else if (html.trim()) {
          tree.push({
            id: `intro-${idx}`,
            title: "",
            level: 0,
            htmlContent: html,
            children: [],
          });
        }
      }
    });

    const renderTree = (nodes: Section[]) => {
      return nodes.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        const isHeader = section.level > 0;

        const levelContainerStyles: Record<number, string> = {
          1: "border-l-4 border-[#FFD700] bg-blue-50/20",
          2: "border-l-4 border-blue-200",
          3: "border-l-2 border-gray-300",
          4: "border-l-2 border-gray-200",
        };

        const levelTextStyles: Record<number, string> = {
          1: "text-2xl font-bold",
          2: "text-xl font-bold",
          3: "text-lg font-semibold",
          4: "text-base font-medium italic",
        };

        return (
          <div
            key={section.id}
            className={`${isHeader ? `mt-2 ${levelContainerStyles[section.level] || ""} pl-4` : "mb-2"}`}
          >
            {isHeader && (
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-2 w-full text-left hover:bg-white/50 py-1 px-2 rounded transition-all group"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#07419e] flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-[#07419e] flex-shrink-0" />
                )}
                <span
                  className={`${levelTextStyles[section.level]} ${
                    section.level <= 2 ? "text-[#07419e]" : "text-gray-800"
                  }`}
                >
                  {section.title}
                </span>
              </button>
            )}

            {!isCollapsed && (
              <div className={isHeader ? "mt-1 ml-6" : ""}>
                <div
                  className="text-justify font-normal journal-article prose-sm max-w-none last:[&_p]:mb-0"
                  dangerouslySetInnerHTML={{ __html: section.htmlContent }}
                />
                {section.children.length > 0 && (
                  <div className="mt-1 space-y-1 font-normal">
                    {renderTree(section.children)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });
    };

    if (tree.length === 0) {
      return (
        <div
          className="journal-article font-normal"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    return <div className="space-y-1 font-normal">{renderTree(tree)}</div>;
  };

  // Injecte le diff directement dans le HTML avant le rendu
  const contentToRender = injectDiffIntoContent(
    entry.content,
    entry.modifications || []
  );

  return (
    <article className="text-black font-normal">
      {renderCollapsibleContent(contentToRender)}
    </article>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const JobdlArticle = () => {
  const { nor } = useParams<{ nor: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!nor) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("official_journal")
        .select("*")
        .eq("nor_number", nor)
        .single();

      if (error) {
        console.error("Erreur Supabase :", error);
        setError(
          "Impossible de charger la publication officielle demandée. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter la Secrétaire Générale."
        );
      } else {
        setEntry(data as JournalEntry);
      }

      setLoading(false);
    };

    fetchEntry();
  }, [nor]);

  const getRoleLabel = (role: string | null): string => {
    if (!role) return "Bureau des Lycéens";
    const labels: Record<string, string> = {
      president: "Le Président",
      vice_president: "La Vice-Présidente",
      secretary_general: "La Secrétaire Générale",
      communication_manager:
        "Le Directeur de la Communauté et de la Communication",
    };
    return labels[role] || "Bureau des Lycéens";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-lg text-muted-foreground">
        Chargement de la publication officielle...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-lg text-red-700">
        {error}
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-lg text-muted-foreground">
        Aucune publication trouvée pour ce numéro NOR.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9] font-[Times_New_Roman]">
      <Navigation />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="border border-[#FFD700] rounded-2xl bg-white/95 shadow-card p-10">
            <h1 className="text-4xl font-bold mb-4 text-[#07419e] text-center">
              {entry.title}
            </h1>
            <p className="text-sm text-center text-muted-foreground italic mb-6">
              NOR : {entry.nor_number} — publié le{" "}
              {new Date(entry.publication_date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <ArticleContent entry={entry} />

            {entry.author_name && (
              <div className="mt-8 pt-4 border-t text-right text-sm text-gray-600 italic">
                {getRoleLabel(entry.author_role)} : {entry.author_name}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JobdlArticle;
