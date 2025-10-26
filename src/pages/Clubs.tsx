import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const Clubs = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Clubs & Vie Scolaire</h1>
              <p className="text-xl">Section en cours de développement</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-card border-2 border-primary/20">
                <CardContent className="p-12 text-center space-y-4">
                  <h2 className="text-3xl font-bold">Fonctionnalité en attente de validation de la Direction.</h2>
                  <p className="text-lg text-muted-foreground">
                    La section clubs sera bientôt disponible après approbation par la direction de l'établissement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Clubs;