import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight } from "lucide-react";
import "@/styles/journal.css";

// --- Interfaces ---
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

// --- Composant pour le rendu de l'article ---
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
    let displayContent = content;

    // Application des modifications visuelles
    if (modifications && modifications.length > 0) {
      const sortedMods = [...modifications].sort((a, b) => b.position - a.position);
      sortedMods.forEach(mod => {
        const oldTextEscaped = mod.oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(oldTextEscaped, 'g');
        const replacement = `<span class="modification-group">
          <del class="text-red-600 line-through">${mod.oldText}</del>
          <ins class="text-green-700 no-underline font-semibold">${mod.newText}</ins>
          <sup class="text-xs text-blue-600 ml-1">[v. ${new Date(mod.date).toLocaleDateString('fr-FR')}]</sup>
        </span>`;
        displayContent = displayContent.replace(regex, replacement);
      });
    }

    // Parsing pour le pliage
    const parser = new DOMParser();
    const doc = parser.parseFromString(displayContent, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    
    const result: JSX.Element[] = [];
    let currentSection: { title: string; level: string; content: string; index: number } | null = null;
    let sectionCounter = 0;

    // Fonction pour fermer et pousser une section pliable dans le résultat
    const flushSection = () => {
      if (currentSection) {
        const isCollapsed = collapsedSections.has(currentSection.index);
        const levelClass = currentSection.level === 'h1' ? 'text-2xl' : currentSection.level === 'h2' ? 'text-xl' : 'text-lg';
        const idx = currentSection.index;
        
        result.push(
          <div key={`section-${idx}`} className="border-l-4 border-[#FFD700] pl-4 my-6">
            <button
              onClick={() => toggleSection(idx)}
              className="flex items-center gap-2 w-full text-left hover:bg-gray-50 p-2 rounded transition-colors group"
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              <h3 className={`font-bold ${levelClass} text-[#07419e] group-hover:text-blue-700`}>
                {currentSection.title}
              </h3>
            </button>
            {!isCollapsed && (
              <div 
                className="mt-2 ml-7 journal-article" 
                dangerouslySetInnerHTML={{ __html: currentSection.content }} 
              />
            )}
          </div>
        );
        currentSection = null;
      }
    };

    nodes.forEach((node, i) => {
      if (node instanceof HTMLElement) {
        const tagName = node.tagName.toLowerCase();
        // Détection des éléments exclus du pliage
        const isExcluded = node.classList.contains('no-collapse') || 
                           node.classList.contains('no-collapse-true') ||
                           node.classList.contains('always-visible');

        if (['h1', 'h2', 'h3'].includes(tagName) && !isExcluded) {
          flushSection();
          currentSection = {
            title: node.textContent || '',
            level: tagName,
            content: '',
            index: sectionCounter++
          };
        } else if (isExcluded) {
          flushSection(); // On termine la section en cours avant d'afficher l'élément fixe
          result.push(
            <div key={`fixed-${i}`} className="journal-article no-collapse-true my-6" dangerouslySetInnerHTML={{ __html: node.outerHTML }} />
          );
        } else {
          if (currentSection) {
            currentSection.content += node.outerHTML;
          } else {
            result.push(<div key={`raw-${i}`} className="journal-article" dangerouslySetInnerHTML={{ __html: node.outerHTML }} />);
          }
        }
      } else if (node.textContent?.trim()) {
        if (currentSection) {
          currentSection.content += node.textContent;
        } else {
          result.push(<p key={`text-${i}`} className="journal-article">{node.textContent}</p>);
        }
      }
    });

    flushSection();
    return <div className="space-y-2">{result}</div>;
  };

  return (
    <>
      <div className="article-container">
        {renderContentWithModifications(entry.content, entry.modifications)}
      </div>

      {entry.modifications && entry.modifications.length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-[#07419e] font-serif">Historique des modifications</h3>
          <div className="space-y-3">
            {entry.modifications.map((mod, idx) => (
              <div key={idx} className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 font-serif">
                <p className="font-semibold text-slate-900 mb-1">
                  Mise à jour du {new Date(mod.date).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
                <p className="text-slate-700">
                  <span className="line-through text-red-500 opacity-70">{mod.oldText}</span>
                  {' → '}
                  <span className="text-emerald-700 font-medium">{mod.newText}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// --- Page Principale ---
const JobdlArticle = () => {
  const { nor } = useParams<{ nor: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!nor) return;
      setLoading(true);
      const { data, error: supabaseError } = await supabase
        .from("official_journal")
        .select("*")
        .eq("nor_number", nor)
        .single();

      if (supabaseError) {
        setError("Impossible de charger la publication. Elle n'existe peut-être plus.");
      } else {
        setEntry(data as JournalEntry);
      }
      setLoading(false);
    };
    fetchEntry();
  }, [nor]);

  const getRoleLabel = (role: string | null): string => {
    const labels: Record<string, string> = {
      president: "Le Président",
      vice_president: "La Vice-Présidente",
      secretary_general: "La Secrétaire Générale",
      communication_manager: "Le Directeur de la Communication",
    };
    return role ? (labels[role] || "Le Bureau") : "Le Bureau des Lycéens";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center italic text-slate-500">Chargement du document officiel...</div>;
  if (error || !entry) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">{error || "Document introuvable."}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd]">
      <Navigation />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="border border-[#FFD700] rounded-2xl bg-white shadow-xl p-6 md:p-12">
            <header className="mb-10 text-center border-b pb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#07419e] font-serif leading-tight">
                {entry.title}
              </h1>
              <div className="text-sm text-slate-500 uppercase tracking-widest font-sans">
                NOR : {entry.nor_number} — {new Date(entry.publication_date).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </div>
            </header>
            
            <ArticleContent entry={entry} />
            
            {entry.author_name && (
              <footer className="mt-16 pt-6 border-t-2 border-slate-100 text-right">
                <p className="text-slate-800 font-serif text-lg font-bold">
                  {getRoleLabel(entry.author_role)}
                </p>
                <p className="text-slate-600 font-serif italic">
                  {entry.author_name}
                </p>
              </footer>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JobdlArticle;
