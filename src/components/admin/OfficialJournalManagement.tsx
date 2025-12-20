import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Edit, Trash2, ChevronDown, ChevronRight, Eye } from "lucide-react";
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
  created_at: string;
  modifications?: Modification[];
}

// --- Composant de rendu de l'article ---
const ArticleRenderer = ({ entry }: { entry: JournalEntry }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

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

  const toggleSection = (index: number) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(index)) {
      newCollapsed.delete(index);
    } else {
      newCollapsed.add(index);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderContent = (content: string, modifications?: Modification[]) => {
    let displayContent = content;

    // 1. Appliquer les visuels de modifications si existantes
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

    // 2. Parser le HTML pour gérer le pliage sélectif
    const parser = new DOMParser();
    const doc = parser.parseFromString(displayContent, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    
    const result: JSX.Element[] = [];
    let currentSection: { title: string; level: string; content: string; index: number } | null = null;
    let sectionCounter = 0;

    const flushSection = () => {
      if (currentSection) {
        const isCollapsed = collapsedSections.has(currentSection.index);
        const levelClass = currentSection.level === 'h1' ? 'text-2xl' : currentSection.level === 'h2' ? 'text-xl' : 'text-lg';
        const idx = currentSection.index;
        
        result.push(
          <div key={`section-${idx}`} className="border-l-4 border-blue-200 pl-4 my-6">
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
        // Détection de la classe d'exclusion volontaire
        const isExcluded = node.classList.contains('no-collapse') || node.classList.contains('no-collapse-true');

        if (['h1', 'h2', 'h3'].includes(tagName) && !isExcluded) {
          flushSection();
          currentSection = {
            title: node.textContent || '',
            level: tagName,
            content: '',
            index: sectionCounter++
          };
        } else if (isExcluded) {
          flushSection();
          result.push(
            <div key={`excluded-${i}`} className="journal-article no-collapse-true" dangerouslySetInnerHTML={{ __html: node.outerHTML }} />
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
    <div className="border border-[#FFD700] rounded-2xl bg-white/95 shadow-lg p-6 md:p-10">
      <h1 className="text-4xl font-bold mb-4 text-[#07419e] text-center font-serif">
        {entry.title}
      </h1>
      <p className="text-sm text-center text-gray-600 italic mb-8 font-serif">
        NOR : {entry.nor_number} — publié le{" "}
        {new Date(entry.publication_date).toLocaleDateString("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        })}
      </p>
      
      <div className="article-container">
        {renderContent(entry.content, entry.modifications)}
      </div>
      
      {entry.author_name && (
        <div className="mt-12 pt-4 border-t text-right text-sm text-gray-600 italic font-serif">
          {getRoleLabel(entry.author_role)} : {entry.author_name}
        </div>
      )}
    </div>
  );
};

// --- Composant Principal de Gestion ---
export const OfficialJournalManagement = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<JournalEntry | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    nor_number: "",
    content: "",
    publication_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("official_journal" as any)
      .select("*")
      .order("publication_date", { ascending: false });

    if (error) toast.error("Erreur de chargement");
    else setEntries(data as unknown as JournalEntry[]);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.nor_number || !formData.content) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Logique simplifiée de modification pour cet exemple
    if (editingEntry) {
      const { error } = await supabase
        .from("official_journal" as any)
        .update({
          title: formData.title,
          nor_number: formData.nor_number,
          content: formData.content,
          publication_date: formData.publication_date,
        })
        .eq("id", editingEntry);

      if (!error) {
        toast.success("Mis à jour !");
        resetForm();
        loadEntries();
      }
    } else {
      const { error } = await supabase
        .from("official_journal" as any)
        .insert({
          ...formData,
          author_id: user.id,
          author_role: "secretary_general", // À dynamiser selon vos besoins
        });

      if (!error) {
        toast.success("Publié !");
        resetForm();
        loadEntries();
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: "", nor_number: "", content: "", publication_date: new Date().toISOString().split('T')[0] });
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="shadow-xl border-t-4 border-t-[#07419e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl font-serif">
              <FileText className="text-[#07419e]" />
              Administration du Journal Officiel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Titre de l'acte</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Numéro NOR</Label>
                <Input value={formData.nor_number} onChange={e => setFormData({...formData, nor_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Date d'effet</Label>
                <Input type="date" value={formData.publication_date} onChange={e => setFormData({...formData, publication_date: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Corps du texte</Label>
              <RichTextEditor 
                value={formData.content} 
                onChange={val => setFormData({...formData, content: val})} 
              />
              <div className="flex items-center gap-2 mt-2 text-blue-600 text-xs bg-blue-50 p-2 rounded">
                <Eye className="h-3 w-3" />
                <span>Utilisez l'icône "Oeil" dans l'éditeur pour sortir un élément du système de pliage.</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm}>Réinitialiser</Button>
              <Button onClick={handleSubmit}>{editingEntry ? "Enregistrer les modifications" : "Publier au Journal Officiel"}</Button>
            </div>
          </CardContent>
        </Card>

        {/* --- Liste des publications --- */}
        <div className="grid gap-4">
          <h3 className="font-serif text-xl font-bold border-b pb-2">Archives Récentes</h3>
          {entries.map(entry => (
            <Card key={entry.id} className="hover:bg-white transition-colors">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#07419e]">{entry.title}</p>
                  <p className="text-xs text-gray-500">NOR: {entry.nor_number} | {entry.publication_date}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewEntry(entry)}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditingEntry(entry.id);
                    setFormData({
                      title: entry.title,
                      nor_number: entry.nor_number,
                      content: entry.content,
                      publication_date: entry.publication_date
                    });
                  }}><Edit className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* --- Modal de prévisualisation --- */}
        {previewEntry && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative">
              <Button 
                variant="destructive" 
                size="sm" 
                className="absolute top-4 right-4 z-10"
                onClick={() => setPreviewEntry(null)}
              >
                Fermer
              </Button>
              <div className="p-4">
                <ArticleRenderer entry={previewEntry} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
