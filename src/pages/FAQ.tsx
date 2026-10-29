import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const L = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} className="text-primary underline decoration-dotted underline-offset-2 hover:opacity-75 transition-opacity">
    {children}
  </Link>
);

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-primary underline decoration-dotted underline-offset-2 hover:opacity-75 transition-opacity">
    {children}
  </a>
);

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    title: "Le BDL en général",
    items: [
      {
        question: "Qu'est-ce que le Bureau des Lycéens (BDL) ?",
        answer: <>
          Le Bureau des Lycéens est l'association représentative des élèves du Lycée Saint-André.
          Il organise la vie associative et culturelle du lycée, défend les intérêts des élèves auprès
          de l'administration et propose des activités, événements et services à toute la communauté lycéenne.{" "}
          <L to="/bdl">En savoir plus sur le BDL →</L>
        </>,
      },
      {
        question: "Quels sont les rôles au sein du BDL ?",
        answer: <>
          Le BDL est organisé selon une hiérarchie de rôles. Du plus haut au plus bas : Administrateur,
          Président·e, Vice-Président·e, Secrétaire Général·e, Directeur·rice de la Communication,
          Membre BDL, Vie Scolaire, puis Lycéen connecté. Le <L to="/bdl">Bureau Exécutif</L> est
          composé des 4 premiers rôles élus. Chaque rôle donne accès à des fonctionnalités différentes
          sur la plateforme.
        </>,
      },
      {
        question: "Comment rejoindre le BDL en tant que membre ?",
        answer: <>
          Pour devenir membre du BDL, rapprochez-vous d'un membre de l'Exécutif ou de la Secrétaire Générale,
          ou écrivez-nous via le <L to="/contact">formulaire de contact</L>. L'adhésion est ouverte à tous
          les lycéens du Lycée Saint-André motivés, quelle que soit la classe.
        </>,
      },
      {
        question: "Comment se déroulent les élections du BDL ?",
        answer: <>
          Les élections ont lieu chaque année scolaire. Un <L to="/scrutin">scrutin en ligne</L> est organisé
          sur la plateforme. Seuls les membres BDL enregistrés peuvent voter - le vote est irrévocable une fois
          validé. Le Président·e et l'Administrateur·rice sont neutres et ne participent pas au vote. Les résultats
          sont calculés à la majorité absolue des suffrages exprimés.
        </>,
      },
      {
        question: "Où trouver l'historique des BDL précédents ?",
        answer: <>
          L'historique complet de tous les bureaux précédents est disponible dans
          la <L to="/bdl/historique">rubrique Historique BDL</L>. Chaque année est détaillée avec les membres
          et leurs fonctions.
        </>,
      },
    ],
  },
  {
    title: "Compte & Intranet",
    items: [
      {
        question: "Comment créer un compte sur la plateforme ?",
        answer: <>
          Rendez-vous sur la <L to="/auth">page de connexion</L>, onglet « Inscription ». Renseignez
          votre prénom, nom (en majuscules), classe (Seconde, Première ou Terminale), adresse e-mail et
          un mot de passe d'<strong>au moins 12 caractères</strong>. Vous devez accepter
          les <L to="/legal/cgu">CGU</L>, la <L to="/legal/confidentialite">Politique de Confidentialité</L> et
          les <L to="/legal/mentions-legales">Mentions Légales</L> pour finaliser l'inscription.
        </>,
      },
      {
        question: "J'ai oublié mon mot de passe, que faire ?",
        answer: <>
          Sur la <L to="/auth">page de connexion</L>, cliquez sur « Mot de passe oublié » et saisissez
          votre adresse e-mail. Un lien de réinitialisation vous sera envoyé - vérifiez vos spams.
          Important : <strong>ouvrez ce lien sur le même navigateur</strong> que celui utilisé pour faire
          la demande, sinon il sera invalide. En cas de problème, contactez le <L to="/support">support</L>.
        </>,
      },
      {
        question: "Quelle est la règle pour le mot de passe ?",
        answer: <>
          Le mot de passe doit contenir <strong>au moins 12 caractères</strong>. Cette règle s'applique
          aussi bien à l'inscription qu'au changement de mot de passe depuis votre <L to="/profile">profil</L>.
          Choisissez un mot de passe robuste, différent de ceux utilisés sur d'autres services.
        </>,
      },
      {
        question: "Comment modifier mes informations de profil ?",
        answer: <>
          Connectez-vous puis rendez-vous sur votre <L to="/profile">page Profil</L>. Vous pouvez y modifier
          votre prénom, nom, classe, adresse e-mail (une confirmation sera envoyée), photo de profil et mot
          de passe. Le nom est automatiquement converti en majuscules. Si vous modifiez votre email, un lien
          de confirmation vous sera envoyé à la nouvelle adresse.
        </>,
      },
      {
        question: "Mes informations de compte sont-elles vérifiées ?",
        answer: <>
          Oui. Des informations valides (nom réel, classe correcte, e-mail fonctionnel) sont requises.
          L'équipe technique peut vérifier ces données et suspendre un compte incorrect. En cas de litige,
          contactez le <L to="/support">support</L>.
        </>,
      },
    ],
  },
  {
    title: "Scrutins & Votes",
    items: [
      {
        question: "Qui peut voter aux scrutins ?",
        answer: <>
          Seuls les <strong>membres BDL enregistrés</strong> peuvent voter (rôles : Membre BDL, ComCom,
          Secrétaire Général·e, Vice-Président·e, Vie Scolaire). Les lycéens connectés sans rôle BDL
          peuvent consulter les scrutins mais pas voter. Le·la Président·e et l'Administrateur·rice
          restent neutres et ne votent pas.
        </>,
      },
      {
        question: "Mon vote est-il modifiable ?",
        answer: <>
          <strong>Non.</strong> Avant de valider, un dialogue de confirmation s'affiche. Une fois votre
          vote enregistré, il est définitif et ne peut plus être modifié. Réfléchissez bien avant de
          confirmer. Rendez-vous sur la <L to="/scrutin">page Scrutins</L> pour consulter les scrutins ouverts.
        </>,
      },
      {
        question: "Comment sont calculés les résultats d'un scrutin ?",
        answer: <>
          Les résultats affichent : nombre de votants, suffrages exprimés (Pour + Contre), majorité absolue
          requise, et le détail Pour / Contre / Abstention. Le verdict est automatique :
          si les votes « Pour » dépassent la majorité absolue des suffrages exprimés, le scrutin
          est <strong>ADOPTÉ</strong>, sinon <strong>REJETÉ</strong>. Pour les scrutins non secrets,
          le détail nominatif est consultable.
        </>,
      },
      {
        question: "Qu'est-ce qu'un scrutin secret ?",
        answer: <>
          Un scrutin secret affiche uniquement les totaux agrégés (Pour, Contre, Abstention) sans révéler
          qui a voté quoi. Les scrutins non secrets permettent de voir le détail nominatif des votes une
          fois le scrutin clôturé. La nature du scrutin est définie par le Bureau à sa création.
        </>,
      },
    ],
  },
  {
    title: "Événements, Actualités & Documents",
    items: [
      {
        question: "Comment m'inscrire à un événement organisé par le BDL ?",
        answer: <>
          Les événements sont annoncés dans la <L to="/events">rubrique Événements</L> et sur nos réseaux
          sociaux. Certains sont en accès libre, d'autres nécessitent une inscription via un formulaire dédié.
          Vous pouvez aussi ajouter un événement à votre calendrier personnel en téléchargeant le fichier
          <strong>.ics</strong> depuis la fiche de l'événement.
        </>,
      },
      {
        question: "Puis-je proposer un événement ou un projet ?",
        answer: <>
          Absolument ! Soumettez votre idée via le <L to="/contact">formulaire de contact</L> en détaillant
          la thématique, le public visé et le budget estimé. Le BDL vous répondra dans les meilleurs délais.
        </>,
      },
      {
        question: "Comment réagir à une actualité ?",
        answer: <>
          Dans la <L to="/actualites">rubrique Actualités</L>, chaque article dispose d'un système de
          réactions (👍 ❤️ 🎉 😮). Vous devez être <L to="/auth">connecté</L> pour réagir. Les noms
          des personnes ayant réagi sont affichés (3 maximum + le nombre restant).
        </>,
      },
      {
        question: "Où trouver les formulaires et documents officiels ?",
        answer: <>
          La <L to="/documents">bibliothèque de documents</L> regroupe règlements, comptes-rendus,
          formulaires et autres fichiers officiels. Vous pouvez prévisualiser les PDFs directement
          sur le site ou les télécharger. Utilisez la recherche et les filtres par catégorie pour
          trouver rapidement ce que vous cherchez.
        </>,
      },
      {
        question: "Qu'est-ce que le Journal Officiel du BDL ?",
        answer: <>
          Le <L to="/jo">Journal Officiel du BDL (JoBDL)</L> est le registre de toutes les publications
          officielles du Bureau : décisions, délibérations, annonces formelles. Chaque entrée possède
          un numéro NOR (Numéro d'Ordre de Référence) qui permet de l'identifier et de la retrouver
          facilement via la recherche.
        </>,
      },
    ],
  },
  {
    title: "Sondages",
    items: [
      {
        question: "Qui peut répondre à un sondage ?",
        answer: <>
          Les sondages sont accessibles à tous, sans connexion requise pour répondre. Vous devez
          renseigner votre nom et prénom, sauf si le sondage autorise les réponses anonymes.
          Si un sondage est limité à une réponse par personne, une vérification par nom est effectuée
          (insensible à la casse).
        </>,
      },
      {
        question: "Puis-je consulter les résultats d'un sondage ?",
        answer: <>
          Les résultats des sondages <strong>clos</strong> sont réservés aux utilisateurs{" "}
          <L to="/auth">connectés</L>. Ils s'affichent sous forme de camembert pour les QCM et en
          texte libre pour les réponses ouvertes. Les sondages de type « Formulaire » n'ont pas de
          résultats publics même après fermeture. Rendez-vous sur la <L to="/sondage">page Sondages</L>.
        </>,
      },
    ],
  },
  {
    title: "Conférences en ligne",
    items: [
      {
        question: "Qu'est-ce que la fonctionnalité de conférence du BDL ?",
        answer: <>
          Le BDL propose des <L to="/conference">conférences en ligne</L> via LiveKit (WebRTC). Elles
          permettent d'organiser des réunions, débats ou présentations en visioconférence. Les fonctionnalités
          incluent : micro, caméra, partage d'écran, chat, réactions, lever la main, sondages en direct
          (pour les modérateurs) et mode Picture-in-Picture.
        </>,
      },
      {
        question: "Quel est mon rôle dans une conférence ?",
        answer: <>
          Par défaut, les lycéens rejoignent en tant qu'<strong>Auditeur</strong> (micro et caméra
          désactivés). Le modérateur (membre Exécutif BDL) peut vous promouvoir Speaker pour vous
          donner la parole, ou Co-modérateur. Vous pouvez lever la main pour signaler que vous
          souhaitez intervenir. Les conférences sont créées exclusivement par les membres de l'Exécutif BDL.
        </>,
      },
      {
        question: "Puis-je rejoindre une conférence sans compte ?",
        answer: <>
          Oui, si le modérateur a activé l'option « Invités autorisés » lors de la création. Dans ce cas,
          vous pouvez rejoindre via un lien de partage (<code>/conference?join=[id]</code>) en renseignant
          simplement un nom d'affichage, sans créer de compte.
        </>,
      },
      {
        question: "Quelles données sont collectées lors d'une conférence ?",
        answer: <>
          LiveKit traite temporairement les flux audio/vidéo et les métadonnées de connexion (adresse IP,
          durée de session) pour le bon fonctionnement du service. Ces données ne sont pas conservées
          au-delà de la session. Consultez notre{" "}
          <L to="/legal/confidentialite">Politique de Confidentialité</L> pour plus de détails.
        </>,
      },
    ],
  },
  {
    title: "Certificat BDL",
    items: [
      {
        question: "Qu'est-ce que le Certificat BDL ?",
        answer: <>
          Le Certificat BDL est un document officiel attestant de votre engagement et de votre fonction
          au sein du Bureau des Lycéens. Il peut être utile pour valoriser votre parcours (dossier
          Parcoursup, CV, etc.). Il est émis par l'Exécutif BDL et contient votre nom, votre fonction
          et l'année d'exercice.
        </>,
      },
      {
        question: "Comment vérifier l'authenticité d'un Certificat BDL ?",
        answer: <>
          Rendez-vous sur la <L to="/certificat-verif">page de vérification de certificat</L>, accessible
          via le QR code présent sur le document ou directement depuis l'accueil. Saisissez le numéro
          de certificat ou le prénom et nom de la personne. Le système confirme instantanément la validité,
          la fonction exercée et la période.
        </>,
      },
    ],
  },
  {
    title: "Contact & Support",
    items: [
      {
        question: "Comment contacter le BDL ?",
        answer: <>
          Via le <L to="/contact">formulaire de contact</L> (sans connexion requise) ou directement
          à <A href="mailto:contact@bdl-saintandre.fr">contact@bdl-saintandre.fr</A>.
          Si vous êtes connecté, privilégiez le <L to="/support">support en ligne</L> pour un meilleur
          suivi avec historique de vos échanges. <strong>Attention :</strong> le formulaire de contact
          est limité à un envoi toutes les 30 minutes.
        </>,
      },
      {
        question: "Comment déposer une demande d'audience ?",
        answer: <>
          Depuis le <L to="/support">support en ligne</L> (connexion requise), sélectionnez le type
          « Demande d'audience auprès du BDL ». Précisez l'objet de votre demande et vos disponibilités.
          La demande est examinée par la Présidente, le Vice-Président·e, la Secrétaire Générale ou
          la Directrice de la Communication. Vous recevrez une réponse directement dans votre fil de support.
        </>,
      },
      {
        question: "Comment fonctionne le support en ligne ?",
        answer: <>
          Le <L to="/support">support</L> fonctionne comme une messagerie avec tickets. Après avoir
          soumis votre demande, vous pouvez suivre son statut (En attente → En cours → Traité) et
          échanger des messages avec l'équipe. Utilisez <kbd>Ctrl+Entrée</kbd> pour envoyer rapidement
          un message. Un ticket clôturé ne peut plus recevoir de réponse.
        </>,
      },
      {
        question: "Y a-t-il des clubs au lycée ?",
        answer: <>
          La section clubs est en cours de développement et en <strong>attente de validation par
          la Direction de l'établissement</strong>. Elle sera accessible dès validation obtenue.
          Pour toute question sur les clubs existants, contactez-nous via
          le <L to="/contact">formulaire de contact</L>.
        </>,
      },
    ],
  },
  {
    title: "Boîte à idées",
    items: [
      {
        question: "C'est quoi la boîte à idées ?",
        answer: <>
          La <L to="/idees">boîte à idées</L> te permet de soumettre des suggestions, des projets ou
          des améliorations directement au BDL. L'exécutif lit chaque idée et peut te répondre
          directement depuis l'interface d'administration.
        </>,
      },
      {
        question: "Qui peut soumettre une idée ?",
        answer: <>
          N'importe quel lycéen connecté à la plateforme peut soumettre une idée. Si tu n'as pas encore
          de compte, rends-toi sur la page <L to="/auth">Connexion</L> pour en créer un.
        </>,
      },
      {
        question: "Puis-je soumettre une idée anonymement ?",
        answer: <>
          Oui. Sur la page <L to="/idees">boîte à idées</L>, active simplement le mode anonyme avant
          d'envoyer. Ton nom ne sera pas affiché à l'exécutif. Ton identifiant interne reste associé
          pour éviter les abus, mais n'est jamais visible.
        </>,
      },
      {
        question: "Qui peut voir les idées soumises ?",
        answer: <>
          Seul l'exécutif BDL (Président·e, Vice-Président·e, Secrétaire Général·e, Directeur·rice de
          la Communication, Administrateur·rice) peut consulter et répondre aux idées. Chaque lycéen
          ne voit que ses propres soumissions et les réponses du BDL.
        </>,
      },
    ],
  },
  {
    title: "Données personnelles & Vie privée",
    items: [
      {
        question: "Comment et par qui sont gérées mes données personnelles ?",
        answer: <>
          Vos données sont gérées par le Bureau des Lycéens dans le respect du RGPD. Elles sont hébergées
          sur des serveurs sécurisés (infrastructure européenne) et ne sont jamais revendues à des tiers.
          Consultez notre <L to="/legal/confidentialite">Politique de Confidentialité</L> pour tous les
          détails, ou contactez notre Délégué à la Protection des Données via
          le <L to="/contact">formulaire de contact</L>.
        </>,
      },
      {
        question: "Comment supprimer mon compte ?",
        answer: <>
          Envoyez une demande explicite à <A href="mailto:contact@bdl-saintandre.fr">contact@bdl-saintandre.fr</A>{" "}
          depuis l'adresse e-mail liée à votre compte. Le BDL s'engage à traiter votre demande dans un
          délai de <strong>30 jours</strong> conformément au RGPD.
        </>,
      },
      {
        question: "Où trouver les documents juridiques du BDL ?",
        answer: <>
          Les <L to="/legal/cgu">Conditions Générales d'Utilisation</L>,
          la <L to="/legal/confidentialite">Politique de Confidentialité</L> et
          les <L to="/legal/mentions-legales">Mentions Légales</L> sont accessibles en bas de chaque
          page du site (footer) ou depuis le <L to="/legal">Centre Juridique</L>.
        </>,
      },
    ],
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
        <MaintenanceOverlay>
        {/* Bannière */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold flex items-center justify-center gap-3">
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
            <div className="max-w-3xl mx-auto space-y-12">
              {faqCategories.map((cat, catIndex) => (
                <div key={catIndex}>
                  <h2 className="text-xl font-bold text-primary mb-4 pb-2 border-b border-primary/20">
                    {cat.title}
                  </h2>
                  <Accordion type="single" collapsible className="space-y-3">
                    {cat.items.map((item, itemIndex) => (
                      <AccordionItem
                        key={itemIndex}
                        value={`cat-${catIndex}-item-${itemIndex}`}
                        className="border rounded-lg px-6 shadow-card bg-card"
                      >
                        <AccordionTrigger className="text-left font-semibold text-primary hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-foreground leading-relaxed pb-5">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}

              <p className="text-center text-muted-foreground">
                Vous ne trouvez pas la réponse à votre question ?{" "}
                <Link to="/contact" className="text-primary font-semibold hover:underline">
                  Contactez-nous
                </Link>
              </p>
            </div>
          </div>
        </section>
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;