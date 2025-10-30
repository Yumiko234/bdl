import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/journal.css";

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  content: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
}

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

  const getRoleLabel = (role: string | null): string => {
    if (!role) return "Bureau des Lycéens";
    const labels: Record<string, string> = {
      president: "Le Président",
      vice_president: "La Vice-Présidente",
      secretary_general: "La Secrétaire Générale",
      communication_manager: "Le Responsable Communication",
    };
    return labels[role] || "Bureau des Lycéens";
  };

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

            <article
              className="journal-article text-justify leading-relaxed text-black"
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />

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