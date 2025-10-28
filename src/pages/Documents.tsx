import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  file_size: string | null;
  file_url: string | null;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Build query - RLS handles filtering based on visibility and user status
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des documents");
    } else {
      setDocuments(data || []);
    }
  };

  const faq = [
    {
      question : "Comment rejoindre le BDL en tant que membre ?",
      answer: "Pour devenir membre du BDL, vous devez être élève au Lycée général Saint-André et vous présenter à la Vie Scolaire ou à un membre de l'Exécutif. Renseignez-vous auprès de la Secrétaire Générale pour plus d'informations."
    },
    {
      question: "Comment puis-je contacter le BDL ?",
      answer: "Vous pouvez nous contacter via le formulaire de contact sur notre site ou nous envoyer un email à contact@bdl-saintandre.fr"
    },
    {
      question: "Comment créer un nouveau club ?",
      answer: "La création de club n'est malheureusement pas possible pour le moment."
    },
    {
      question: "Comment accéder à l'intranet ?",
      answer: "Vous avez la possibilité de vous créer un compte via le formulaire dédié sur la page intranet. Veuillez renseigner des informations valides. En cas de perte ou de problème, contactez la Secrétaire Générale du BDL."
    },
    {
      question: "Puis-je proposer un événement ?",
      answer: "Absolument ! Le BDL encourage toutes les initiatives. Soumettez votre projet via le formulaire de contact en détaillant votre idée, le public visé et le budget estimé. Le BDL étudiera votre proposition et vous répondra sous 15 jours."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Règlements & Documents</h1>
              <p className="text-xl">Accédez aux documents officiels de l'établissement</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className="text-4xl font-bold mb-6">Documents Officiels</h2>
                {documents.length === 0 ? (
                  <Card className="shadow-card">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Aucun document disponible pour le moment.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="shadow-card">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg gradient-institutional flex items-center justify-center flex-shrink-0">
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold mb-2">{doc.title}</h3>
                                  <p className="text-muted-foreground mb-2">{doc.description}</p>
                                  <div className="flex gap-3 text-sm text-muted-foreground">
                                    <span className="font-medium text-primary">{doc.category}</span>
                                    {doc.file_size && (
                                      <>
                                        <span>•</span>
                                        <span>{doc.file_size}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {doc.file_url && (
                                  <Button 
                                    variant="outline" 
                                    className="flex items-center gap-2"
                                    onClick={() => window.open(doc.file_url!, '_blank')}
                                  >
                                    <Download className="h-4 w-4" />
                                    Télécharger
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-8">Foire Aux Questions</h2>
              <div className="space-y-4">
                {faq.map((item, index) => (
                  <Card key={index} className="shadow-card">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-3 text-primary">{item.question}</h3>
                      <p className="text-foreground leading-relaxed">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Documents;
