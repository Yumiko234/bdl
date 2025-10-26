import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  content: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

const JOBDL = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('official_journal' as any)
      .select('*')
      .order('publication_date', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement du journal");
    } else {
      setEntries(data as unknown as JournalEntry[]);
    }
  };

  const getRoleLabel = (role: string | null): string => {
    if (!role) return "BDL";
    const labels: Record<string, string> = {
      'president': 'Le Président',
      'vice_president': 'La Vice-Présidente',
      'secretary_general': 'La Secrétaire Générale',
      'communication_manager': 'Le Responsable Communication'
    };
    return labels[role] || "BDL";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Journal Officiel du BDL</h1>
              <p className="text-xl">Communications officielles du Bureau des Lycéens</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              {entries.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucune publication pour le moment.
                  </CardContent>
                </Card>
              ) : (
                entries.map((entry) => (
                  <Card key={entry.id} className="shadow-card">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-2xl">{entry.title}</CardTitle>
                          <CardDescription className="italic mt-2">
                            NOR : {entry.nor_number}
                          </CardDescription>
                          <CardDescription>
                            Publié le {new Date(entry.publication_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        >
                          {expandedEntry === entry.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    {expandedEntry === entry.id && (
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert mb-4"
                          dangerouslySetInnerHTML={{ __html: entry.content }}
                        />
                        {entry.author_name && (
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            <span className="text-sm text-muted-foreground">
                              Par {entry.author_name}
                              {entry.author_role && ` - ${getRoleLabel(entry.author_role)}`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JOBDL;