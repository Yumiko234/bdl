import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight } from "lucide-react";
import "@/styles/journal.css";

interface Modification {
  date: string;
  oldText: string;
  newText: string;
  position: number;
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

// Composant pour le rendu de l'article avec modifications et pliage
const ArticleContent = ({ entry }: { entry: JournalEntry }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(index)) {
      newCollapsed.delete(index);
    } else {
      newCollapsed.add(index);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderContentWithModifications = (content: string, modifications?: Modification[]) => {
    if (!modifications || modifications.length === 0) {
      return renderCollapsibleContent(content);
    }

    let modifiedContent = content;
    const sortedMods = [...modifications].sort((a, b) => b.position - a.position);

    sortedMods.forEach(mod => {
      const oldTextEscaped = mod.oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(oldTextEscaped, 'g');
      
      const replacement = `<span class="modification-group">
        <del class="text-red-600 line-through">${mod.oldText}</del>
        <ins class="text-green-700 no-underline font-semibold">${mod.newText}</ins>
        <sup class="text-xs text-blue-600 ml-1">[Version du ${new Date(mod.date).toLocaleDateString('fr-FR')}]</sup>
      </span>`;
      
      modifiedContent = modifiedContent.replace(regex, replacement);
    });

    return renderCollapsibleContent(modifiedContent);
  };

  const renderCollapsibleContent = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const elements = Array.from(doc.body.childNodes);
    
    const sections: { title: string; level: string; content: string; index: number }[] = [];
    let currentSection: { title: string; level: string; content: string; index: number } | null = null;
    let sectionIndex = 0;

    elements.forEach((node) => {
      if (node instanceof HTMLElement) {
        const tagName = node.tagName.toLowerCase();
        
        if (['h1', 'h2', 'h3'].includes(tagName)) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            title: node.textContent || '',
            level: tagName,
            content: '',
            index: sectionIndex++
          };
        } else if (currentSection) {
          currentSection.content += node.outerHTML;
        }
      } else if (currentSection && node.textContent?.trim()) {
        currentSection.content += node.textContent;
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    // Si pas de sections avec titres, retourner le contenu tel quel
    if (sections.length === 0) {
      return <div className="journal-article" dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return (
      <div className="space-y-4">
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.index);
          const levelClass = section.level === 'h1' ? 'text-2xl' : section.level === 'h2' ? 'text-xl' : 'text-lg';
          
          return (
            <div key={section.index} className="border-l-4 border-[#FFD700] pl-4">
              <button
                onClick={() => toggleSection(section.index)}
                className="flex items-center gap-2 w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
                <h3 className={`font-bold ${levelClass} text-[#07419e]`}>
                  {section.title}
                </h3>
              </button>
              
              {!isCollapsed && (
                <div 
                  className="mt-2 ml-7 text-justify leading-relaxed journal-article"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <article className="text-black">
        {renderContentWithModifications(entry.content, entry.modifications)}
      </article>

      {entry.modifications && entry.modifications.length > 0 && (
        <div className="mt-8 pt-4 border-t border-gray-300">
          <h3 className="font-bold text-lg mb-3 text-[#07419e]">Historique des modifications</h3>
          <div className="space-y-3">
            {entry.modifications.map((mod, idx) => (
              <div key={idx} className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 mb-1">
                  📅 {new Date(mod.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-gray-700">
                  <span className="line-through text-red-600">{mod.oldText}</span>
                  {' → '}
                  <span className="text-green-700 font-semibold">{mod.newText}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

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
        setError("Impossible de charger la publication officielle demandée. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter la Secrétaire Générale.");
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
      communication_manager: "Le Directeur de la Communauté et de la Communication",
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
