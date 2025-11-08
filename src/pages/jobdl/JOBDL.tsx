import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
}

const JOBDL = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const loadEntries = async () => {
      const { data, error } = await supabase
        .from("official_journal" as any)
        .select("id,title,nor_number,publication_date,author_name,author_role")
        .order("publication_date", { ascending: false });

      if (error) {
        toast.error("Erreur lors du chargement du journal");
      } else if (data) {
        setEntries(data as unknown as JournalEntry[]);
        setFilteredEntries(data as unknown as JournalEntry[]);
      }
    };

    loadEntries();
  }, []);

  // Filtrage progressif par NOR (affinage au fur et à mesure)
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") {
      setFilteredEntries(entries);
      return;
    }

    const filtered = entries.filter((entry) =>
      entry.nor_number.toLowerCase().includes(term)
    );

    setFilteredEntries(filtered);
  }, [searchTerm, entries]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 py-16">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">
                Journal Officiel du Bureau des Lycéens
              </h1>
              <p className="text-xl">
                Communications et décisions officielles du Bureau des Lycéens
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto mb-10">
              <Input
                type="text"
                placeholder="Rechercher un article par NOR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 text-lg border rounded-lg shadow-sm focus:ring-2 focus:ring-[#07419e]"
              />
            </div>

            <div className="max-w-4xl mx-auto space-y-10">
              {filteredEntries.length === 0 ? (
                <Card className="shadow-card">
                  <CardHeader className="p-8 text-center text-muted-foreground">
                    {searchTerm
                      ? "Aucun article ne correspond à ce numéro NOR."
                      : "Aucune publication pour le moment."}
                  </CardHeader>
                </Card>
              ) : (
                filteredEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="shadow-card hover:shadow-elegant transition-all duration-300"
                  >
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                          {entry.title}
                        </CardTitle>
                        <CardDescription className="italic mt-1">
                          NOR : {entry.nor_number}
                        </CardDescription>
                        <CardDescription>
                          Publié le{" "}
                          {new Date(entry.publication_date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </CardDescription>
                      </div>

                      <a
                        href={`/jobdl/${entry.nor_number}`}
                        className="mt-4 sm:mt-0 inline-block px-5 py-2 bg-[#07419e] text-white rounded-lg font-semibold hover:bg-[#052a70] transition-colors"
                      >
                        Voir l’article
                      </a>
                    </CardHeader>
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
