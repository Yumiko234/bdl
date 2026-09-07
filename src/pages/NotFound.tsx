import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, MessageCircle, Compass } from "lucide-react";

const QUICK_LINKS = [
  { label: "L'Établissement", href: "/etablissement" },
  { label: "Le BDL", href: "/bdl" },
  { label: "Actualités", href: "/actualites" },
  { label: "Contact", href: "/contact" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Page introuvable – Bureau des Lycéens";
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        <section className="gradient-institutional text-white py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-5">
              <div className="mx-auto w-fit p-4 bg-white/10 rounded-2xl">
                <Compass className="h-10 w-10" />
              </div>
              <p className="text-7xl md:text-8xl font-extrabold tracking-tight">
                404
              </p>
              <h1 className="text-2xl md:text-3xl font-bold">
                Cette page n'existe pas, ou plus.
              </h1>
              <p className="text-white/80 leading-relaxed">
                La page que vous cherchez a peut-être été déplacée, renommée,
                ou n'a jamais existé. Vérifiez l'adresse, ou repartez depuis
                l'accueil.
              </p>
              <code className="inline-block text-xs md:text-sm text-white/60 bg-white/10 rounded-md px-3 py-1.5 mt-1 break-all">
                {location.pathname}
              </code>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="gap-2" onClick={() => navigate("/")}>
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    window.history.length > 1 ? navigate(-1) : navigate("/")
                  }
                >
                  <ArrowLeft className="h-4 w-4" />
                  Page précédente
                </Button>
              </div>

              <Card className="shadow-card">
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm font-semibold text-foreground">
                    Pages fréquemment consultées
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {QUICK_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="text-sm rounded-lg border border-border px-3.5 py-2.5 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                Si vous pensez qu'il s'agit d'une erreur, contactez la{" "}
                <Link to="/contact" className="text-primary underline underline-offset-2">
                  Secrétaire Générale
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;