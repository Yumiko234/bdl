import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

// ─── Contenu ──────────────────────────────────────────────────────────────────
// Anciennement en bas de Documents.tsx. Migré ici car ces questions ne parlent
// pas de documents mais du BDL en général (adhésion, contact, clubs, intranet...).

const faq = [
  {
    question: "Comment rejoindre le BDL en tant que membre ?",
    answer:
      "Pour devenir membre du BDL, vous devez être élève au Lycée général Saint-André et vous présenter à la Vie Scolaire ou à un membre de l'Exécutif. Renseignez-vous auprès de la Secrétaire Générale pour plus d'informations.",
  },
  {
    question: "Comment puis-je contacter le BDL ?",
    answer:
      "Vous pouvez nous contacter via le formulaire de contact sur notre site ou nous envoyer un email à contact@bdl-saintandre.fr",
  },
  {
    question: "Comment créer un nouveau club ?",
    answer: "La création de club n'est malheureusement pas possible pour le moment.",
  },
  {
    question: "Comment accéder à l'intranet ?",
    answer:
      "Vous avez la possibilité de vous créer un compte via le formulaire dédié sur la page intranet. Veuillez renseigner des informations valides. En cas de perte ou de problème, contactez l'Équipe Technique.",
  },
  {
    question: "Puis-je proposer un événement ?",
    answer:
      "Absolument ! Le BDL encourage toutes les initiatives. Soumettez votre projet via le formulaire de contact en détaillant votre idée, le public visé et le budget estimé. Le BDL étudiera votre proposition et vous répondra sous 15 jours.",
  },
  {
    question: "Comment et par qui sont gérées mes données ?",
    answer: "Vous pouvez consulter notre Politique de Confidentialité directement depuis le centre juridique. Pour tout complément d'information, vous avez la possibilité de contacter le Délégué à la Proctection des données."
  },
];

// ─── Composant ────────────────────────────────────────────────────────────────

const FAQ = () => {
  useSEO({
    title: "FAQ – Bureau des Lycéens",
    description:
      "Questions fréquentes sur le Bureau des Lycéens : adhésion, contact, clubs, intranet, événements.",
    url: "/faq",
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Bannière */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold flex items-center justify-center gap-3">
                <HelpCircle className="h-10 w-10" />
                Foire Aux Questions
              </h1>
              <p className="text-xl">
                Les réponses aux questions les plus fréquentes sur le BDL
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faq.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-lg px-6 shadow-card bg-card"
                  >
                    <AccordionTrigger className="text-left text-lg font-bold text-primary hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground leading-relaxed pb-5">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <p className="text-center text-muted-foreground mt-10">
                Vous ne trouvez pas la réponse à votre question ?{" "}
                <Link to="/contact" className="text-primary font-semibold hover:underline">
                  Contactez-nous
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;