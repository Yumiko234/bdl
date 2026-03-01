import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Reconstruit le texte final (version en vigueur) depuis la liste de diff.
 * On garde les parties "ajoutées" et "inchangées", on retire les "supprimées".
 */
const buildCurrentText = (diff: DiffPart[]): string =>
  diff
    .filter((p) => !p.removed)
    .map((p) => p.value)
    .join("");

// ─── Composant : rendu inline du diff (style suivi de modifications) ──────────

/**
 * Affiche le texte avec :
 *   - texte supprimé  : rouge, barré
 *   - texte ajouté    : vert, souligné
 *   - texte inchangé  : normal
 */
const DiffInline = ({ diff }: { diff: DiffPart[] }) => (
  <span>
    {diff.map((part, idx) => {
      if (part.removed)
        return (
          <span
            key={idx}
            className="line-through text-red-600 bg-red-50 px-0.5 rounded"
            title="Texte supprimé"
          >
            {part.value}
          </span>
        );
      if (part.added)
        return (
          <span
            key={idx}
            className="underline text-green-700 bg-green-50 px-0.5 rounded"
            title="Texte ajouté"
          >
            {part.value}
          </span>
        );
      return <span key={idx}>{part.value}</span>;
    })}
  </span>
);

// ─── Composant : section de l'historique des modifications ───────────────────

const ModificationsHistory = ({
  modifications,
}: {
  modifications: Modification[];
}) => {
  const [open, setOpen] = useState(false);

  if (!modifications || modifications.length === 0) return null;

  return (
    <section className="mt-10 border-t pt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {modifications.length} modification{modifications.length > 1 ? "s" : ""}{" "}
        apportée{modifications.length > 1 ? "s" : ""} à cet article
      </button>

      {open && (
        <div className="mt-4 space-y-6">
          {modifications.map((mod, idx) => (
            <div
              key={idx}
              className="border border-amber-200 rounded-xl bg-amber-50/40 p-5"
            >
              <p className="text-xs text-amber-700 font-semibold mb-3">
                Modification n°{idx + 1} — publiée le{" "}
                {formatDate(mod.date)}
              </p>

              {/* Légende */}
              <div className="flex gap-4 text-xs mb-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
                  Texte supprimé
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
                  Texte ajouté
                </span>
              </div>

              {/* Diff inline */}
              <div className="text-sm leading-relaxed font-serif text-gray-800 text-justify">
                <DiffInline diff={mod.diff} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Composant : rendu de l'article avec sections repliables ─────────────────

const ArticleRenderer = ({ content }: { content: string }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCollapsibleContent = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
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
        const htmlStr =
          node instanceof HTMLElement
            ? node.outerHTML
            : node.textContent || "";
        if (target) target.htmlContent += htmlStr;
        else if (htmlStr.trim())
          tree.push({
            id: `intro-${idx}`,
            title: "",
            level: 0,
            htmlContent: htmlStr,
            children: [],
          });
      }
    });

    const levelStyles: Record<number, string> = {
      1: "text-2xl font-black border-l-4 border-[#07419e] bg-blue-50/30",
      2: "text-xl font-bold border-l-4 border-blue-300",
      3: "text-lg font-semibold border-l-2 border-gray-300",
      4: "text-base font-medium border-l-2 border-gray-200 italic text-gray-600",
    };

    const renderTree = (nodes: Section[]): React.ReactNode =>
      nodes.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        const isHeader = section.level > 0;

        return (
          <div
            key={section.id}
            className={isHeader ? `mt-4 ${levelStyles[section.level] || ""} pl-4` : "mb-4"}
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
                  <div className="mt-2 space-y-2">{renderTree(section.children)}</div>
                )}
              </div>
            )}
          </div>
        );
      });

    return <div className="space-y-2">{renderTree(tree)}</div>;
  };

  return renderCollapsibleContent(content);
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NorPage() {
  const { nor } = useParams<{ nor: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!nor) return;

    const fetchEntry = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("official_journal" as any)
        .select("*")
        .eq("nor_number", nor)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setEntry(data as unknown as JournalEntry);
      }
      setLoading(false);
    };

    fetchEntry();
  }, [nor]);

  // ── États de chargement ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground text-sm animate-pulse">
          Chargement de l'article…
        </p>
      </div>
    );
  }

  if (notFound || !entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/20">
        <p className="text-lg font-serif text-gray-600">
          Article introuvable — NOR : <strong>{nor}</strong>
        </p>
        <Button asChild variant="outline">
          <Link to="/journal-officiel">← Retour au Journal Officiel</Link>
        </Button>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  const hasModifications =
    entry.modifications && entry.modifications.length > 0;

  return (
    <div className="min-h-screen bg-muted/10 py-10 px-4">
      {/* En-tête de navigation */}
      <div className="max-w-4xl mx-auto mb-6">
        <Button asChild variant="ghost" size="sm" className="text-gray-500 hover:text-gray-800">
          <Link to="/journal-officiel">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Journal Officiel du BDL
          </Link>
        </Button>
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto border border-[#FFD700] rounded-2xl bg-white/95 shadow-lg p-6 md:p-12 font-serif">

        {/* Bandeau "consolidé" si des modifications existent */}
        {hasModifications && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-800">
            <span className="font-bold">⚠ Version consolidée</span> — Cet
            article a fait l'objet de{" "}
            {entry.modifications!.length} modification
            {entry.modifications!.length > 1 ? "s" : ""} depuis sa publication
            initiale. Le texte ci-dessous est la version en vigueur.
          </div>
        )}

        {/* Titre & métadonnées */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-[#07419e] mb-3 leading-tight">
          {entry.title}
        </h1>

        <div className="text-center text-sm text-gray-500 italic mb-8 space-y-1">
          <p>
            <span className="font-medium text-gray-700">NOR</span> :{" "}
            {entry.nor_number}
          </p>
          <p>
            Publié le{" "}
            <span className="font-medium text-gray-700">
              {formatDate(entry.publication_date)}
            </span>
          </p>
        </div>

        {/* Séparateur décoratif */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-[#FFD700]" />
          <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
          <div className="flex-1 h-px bg-[#FFD700]" />
        </div>

        {/* Contenu de l'article */}
        <div className="text-black leading-relaxed">
          <ArticleRenderer content={entry.content} />
        </div>

        {/* Signature */}
        {entry.author_name && (
          <div className="mt-10 pt-6 border-t text-right text-sm text-gray-600 italic">
            {entry.author_role === "president"
              ? "Le Président"
              : entry.author_role === "vice_president"
              ? "La Vice-Présidente"
              : entry.author_role === "secretary_general"
              ? "Le Secrétaire Général"
              : "Bureau des Lycéens"}{" "}
            : {entry.author_name}
          </div>
        )}

        {/* ── Historique des modifications ── */}
        <ModificationsHistory modifications={entry.modifications || []} />

      </article>

      {/* Pied de page légal */}
      <p className="max-w-4xl mx-auto mt-6 text-center text-xs text-gray-400 font-serif">
        Journal Officiel du Bureau des Lycéens — Les modifications sont
        enregistrées de manière irréversible et datées.
      </p>
    </div>
  );
}
