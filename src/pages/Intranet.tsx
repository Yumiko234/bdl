import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Users, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Intranet = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <Shield className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Bienvenue sur l'Intranet</h1>
              <p className="text-xl">Espace réservé aux membres authentifiés</p>
              <Button variant="outline" onClick={signOut} className="border-white text-black hover:bg-white hover:text-primary">
                Se déconnecter
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/admin">
                  <Card className="h-full transition-all hover:shadow-elegant hover:-translate-y-1">
                    <CardContent className="p-6 space-y-4">
                      <div className="w-12 h-12 rounded-lg gradient-institutional flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold">
                        Administration BDL
                      </h3>
                      <p className="text-muted-foreground">
                        Gérer le site et les demandes (réservé au BDL)
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Card className="shadow-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-lg gradient-institutional flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      Forum de Classe | Fonctionnalité en développement
                    </h3>
                    <p className="text-muted-foreground">
                      Discussions avec les élèves de votre classe
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
                      <Users className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      Annuaire | Fonctionnalité en développement
                    </h3>
                    <p className="text-muted-foreground">
                      Liste des membres et délégués de classe
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">Contenu de l'Intranet</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Documents Classifiés",
                    description: "Accès aux comptes-rendus détaillés et documents internes du BDL"
                  },
                  {
                    title: "Forum de Classe",
                    description: "Discussions et échanges avec les élèves de votre classe"
                  },
                  {
                    title: "Gestion BDL",
                    description: "Outils de gestion pour les membres du Bureau des Lycéens"
                  },
                  {
                    title: "Demandes d'Audience",
                    description: "Interface de gestion des demandes pour la Présidence"
                  }
                ].map((feature, index) => (
                  <Card key={index} className="shadow-card">
                    <CardContent className="p-6 space-y-2">
                      <h3 className="text-lg font-bold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
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

export default Intranet;
