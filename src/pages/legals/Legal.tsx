import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, FileText, Shield, ArrowRight, Mail } from "lucide-react";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

const Legal = () => {
  useEffect(() => {
    document.title = "Documents juridiques & RGPD – Bureau des Lycéens";
  }, []);

  const documents = [
    {
      title: "Mentions Légales",
      href: "/legal/mentions-legales",
      icon: Scale,
      description: "Identité de l'éditeur, responsabilités juridiques, directeur de la publication et hébergement de nos plateformes numériques.",
      badge: "Informations éditeur",
    },
    {
      title: "Conditions Générales d'Utilisation",
      href: "/legal/cgu",
      icon: FileText,
      description: "Règles d'accès, modalités d'utilisation des services de l'intranet, droits d'auteur et obligations des utilisateurs.",
      badge: "Cadre contractuel",
    },
    {
      title: "Politique de Confidentialité",
      href: "/legal/confidentialite",
      icon: Shield,
      description: "Traitements de vos données à caractère personnel, durées de conservation, sécurité et exercice de vos droits RGPD.",
      badge: "Protection des données",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        <MaintenanceOverlay>
          {/* Section Hero */}
          <section className="py-16 gradient-institutional text-white">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center space-y-4">
                <Scale className="h-20 w-20 mx-auto text-amber-400" />
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Centre Juridique & Conformité
                </h1>
                <p className="text-xl text-slate-200">
                  Consultez l'ensemble des documents encadrant nos services numériques et la protection de vos données
                </p>
              </div>
            </div>
          </section>

          {/* Cartes des documents */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {documents.map((doc) => {
                    const IconComponent = doc.icon;
                    return (
                      <Card key={doc.href} className="shadow-elegant flex flex-col justify-between hover:border-primary/50 transition-colors">
                        <CardHeader className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-lg gradient-institutional flex items-center justify-center text-amber-400">
                              <IconComponent className="h-6 w-6" />
                            </div>
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border">
                              {doc.badge}
                            </span>
                          </div>
                          <CardTitle className="text-xl font-bold">{doc.title}</CardTitle>
                          <CardDescription className="text-sm leading-relaxed">
                            {doc.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Button asChild className="w-full group" variant="default">
                            <Link to={doc.href} className="flex items-center justify-center space-x-2">
                              <span>Consulter le document</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Encadré d'information RGPD / Contact */}
                <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0 mt-1">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold">Exercice de vos droits (RGPD)</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Conformément au Règlement Général sur la Protection des Données (RGPD n° 2016/679) et à la loi Informatique et Libertés modifiée, vous disposez d'un droit d'accès, de rectification, de limitation et de suppression des données vous concernant.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pour toute question ou demande d'exercice de vos droits, vous pouvez contacter le Délégué à la Protection des Données (DPO) à l'adresse suivante :{" "}
                        <a href="mailto:admin@bdl-saintandre.fr" className="text-primary font-medium underline hover:text-primary/80">
                          admin@bdl-saintandre.fr
                        </a>.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
};

export default Legal;