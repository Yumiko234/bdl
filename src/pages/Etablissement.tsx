import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EstablishmentSection {
  id: string;
  title: string;
  content: string;
  display_order: number;
}

const Etablissement = () => {
  const [sections, setSections] = useState<EstablishmentSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from('establishment_info')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections((data as any) || []);
    } catch (error) {
      console.error('Error loading sections:', error);
      toast.error("Erreur lors du chargement des informations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Le Lycée Saint-André</h1>
              <p className="text-xl">Ouvert à tous, le Collège Épiscopal Saint André offre un regard chrétien sur l’éducation, pour permettre à chaque jeune de devenir libre et responsable.</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement des informations...</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {sections.map((section) => (
                    <Card key={section.id} className="shadow-card">
                      <CardHeader>
                        <CardTitle>{section.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Etablissement;
