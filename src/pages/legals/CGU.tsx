import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import LegalPageLayout, { LegalTocEntry } from "@/components/legal/LegalPageLayout";
import { LegalSection, TodoNote } from "@/components/legal/LegalSection";

const LAST_UPDATED = "8 août 2026"; // [À COMPLÉTER] mettre à jour à chaque modification

const TOC: LegalTocEntry[] = [
  { id: "objet", label: "Objet du site" },
  { id: "acces", label: "Accès au site" },
  { id: "compte", label: "Création de compte" },
  { id: "scrutins", label: "Scrutins et sondages" },
  { id: "regles", label: "Règles d'utilisation" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "donnees", label: "Données personnelles" },
  { id: "disponibilite", label: "Disponibilité du service" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "modification", label: "Modification des CGU" },
  { id: "droit", label: "Droit applicable et litiges" },
  { id: "contact", label: "Contact" },
];

const CGU = () => {
  useEffect(() => {
    document.title = "Conditions Générales d'Utilisation – Bureau des Lycéens";
  }, []);

  return (
    <LegalPageLayout
      icon={<FileText className="h-8 w-8" />}
      eyebrow="Document légal"
      title="Conditions Générales d'Utilisation"
      intro="Modalités et conditions d'accès au site du Bureau des Lycéens, incluant l'espace membre, les scrutins et les sondages."
      lastUpdated={LAST_UPDATED}
      toc={TOC}
    >
      <LegalSection id="objet" title="Article 1 — Objet du site">
        <p>
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU »)
          ont pour objet de définir les modalités et conditions dans
          lesquelles le Bureau des Lycéens du Lycée Saint-André (ci-après «
          le BDL », « nous ») met à disposition son site internet (ci-après
          « le Site »), ainsi que les droits et obligations des personnes qui
          le consultent ou l'utilisent (ci-après « l'Utilisateur », «
          vous »).
        </p>
        <p>
          L'accès et l'utilisation du Site impliquent l'acceptation pleine
          et entière des présentes CGU. Les informations relatives à
          l'éditeur du Site figurent dans les{" "}
          <Link to="/legal/mentions-legales">Mentions légales</Link>.
        </p>
        <p>Le Site permet notamment :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>de consulter des informations institutionnelles (établissement, BDL) ;</li>
          <li>de consulter l'actualité, les événements et le calendrier de la vie lycéenne ;</li>
          <li>d'accéder à des documents (comptes rendus, ressources, publications type « JoBDL ») ;</li>
          <li>de créer un compte personnel et d'accéder à un espace membre (« Intranet »), incluant un profil utilisateur ;</li>
          <li>de participer à des <strong>scrutins</strong> (élections, votes) et à des <strong>sondages</strong> organisés par le BDL ;</li>
          <li>de vérifier des certificats (page « Certificat-Verif ») ;</li>
          <li>de contacter le BDL et d'accéder à un espace de support/assistance.</li>
        </ul>
        <p>
          Certaines fonctionnalités sont accessibles librement, d'autres
          nécessitent la création d'un compte utilisateur.
        </p>
      </LegalSection>

      <LegalSection id="acces" title="Article 2 — Accès au site">
        <p>
          Le Site est accessible gratuitement à toute personne disposant
          d'un accès à internet. Tous les frais afférents à cet accès
          (matériel informatique, connexion internet, etc.) sont à la charge
          exclusive de l'Utilisateur.
        </p>
        <p>
          Le BDL met en œuvre les moyens raisonnables à sa disposition pour
          assurer un accès de qualité au Site, mais n'est tenu à aucune
          obligation d'y parvenir. Le Site peut être interrompu à tout
          moment, notamment à des fins de maintenance, sans que cela
          n'engage la responsabilité du BDL.
        </p>
        <p>
          Le Site s'adresse en priorité à la communauté du Lycée
          Saint-André (élèves, personnels, familles). Certaines
          fonctionnalités (Intranet, scrutins, profil) peuvent être
          réservées aux membres de cette communauté disposant d'une adresse
          e-mail valide et/ou d'un statut vérifié.
        </p>
      </LegalSection>

      <LegalSection id="compte" title="Article 3 — Création de compte et espace personnel">
        <h3 className="font-semibold text-foreground pt-1">3.1 Inscription</h3>
        <p>
          La création d'un compte requiert la fourniture d'une adresse
          e-mail valide, d'un mot de passe et de votre nom complet.
          L'Utilisateur s'engage à fournir des informations exactes, à jour
          et complètes, et à les maintenir à jour.
        </p>

        <h3 className="font-semibold text-foreground pt-1">3.2 Utilisateurs mineurs</h3>
        <p>
          Le Site étant destiné à la communauté d'un établissement scolaire
          du second degré, une part significative des Utilisateurs peut
          être <strong>mineure</strong>.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Conformément à l'article 45 de la loi Informatique et Libertés,
            un mineur peut, dès l'âge de 15 ans, consentir seul à un
            traitement de ses données personnelles fondé sur le
            consentement, dans le cadre d'une offre directe de services de
            la société de l'information.
          </li>
          <li>
            <strong>Pour les Utilisateurs de moins de 15 ans</strong>,
            l'inscription et la création d'un compte sont subordonnées à
            l'autorisation conjointe de l'Utilisateur et d'au moins un
            titulaire de l'autorité parentale.
          </li>
          <li>
            Le BDL se réserve le droit de demander une vérification ou de
            suspendre un compte en cas de doute raisonnable sur le respect
            de cette condition.
          </li>
        </ul>

        <h3 className="font-semibold text-foreground pt-1">3.3 Sécurité du compte</h3>
        <p>
          L'Utilisateur est seul responsable de la confidentialité de ses
          identifiants de connexion et de toute activité réalisée depuis son
          compte. Il s'engage à informer sans délai le BDL (
          <a href="mailto:contact@bdl-saintandre.fr">contact@bdl-saintandre.fr</a>
          ) de toute utilisation non autorisée de son compte.
        </p>

        <h3 className="font-semibold text-foreground pt-1">3.4 Photo de profil et contenus du compte</h3>
        <p>
          L'Utilisateur peut ajouter une photo de profil et renseigner des
          informations sur son profil. Il garantit disposer des droits
          nécessaires sur les contenus qu'il met en ligne (notamment le
          droit à l'image s'agissant de sa propre photo) et s'engage à ne
          publier aucun contenu illicite, injurieux, diffamatoire, portant
          atteinte aux droits de tiers ou contraire à l'ordre public.
        </p>

        <h3 className="font-semibold text-foreground pt-1">3.5 Suppression de compte</h3>
        <p>
          L'Utilisateur peut demander la suppression de son compte et de ses
          données à tout moment en écrivant à{" "}
          <a href="mailto:contact@bdl-saintandre.fr">contact@bdl-saintandre.fr</a>
          , sous réserve des durées de conservation légalement applicables
          (voir <Link to="/legal/confidentialite">Politique de confidentialité</Link>).
        </p>
      </LegalSection>

      <LegalSection id="scrutins" title="Article 4 — Scrutins et sondages">
        <p>
          Le Site permet au BDL d'organiser des <strong>scrutins</strong> (votes, élections internes) et des <strong>sondages</strong> de
          consultation.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Seuls les Utilisateurs disposant d'un compte valide et, le cas
            échéant, remplissant les conditions d'éligibilité définies par
            le BDL peuvent participer à un scrutin ou à un sondage.
          </li>
          <li>
            Chaque Utilisateur ne peut voter ou répondre qu'une seule fois
            par scrutin ou sondage, sauf mention contraire explicite.
          </li>
          <li>
            Certains scrutins peuvent être configurés en mode{" "}
            <strong>secret</strong> : dans ce cas, le lien entre l'identité
            de l'Utilisateur et son vote n'est pas conservé de façon à en
            permettre la ré-identification, dans la limite des garanties
            techniques mises en œuvre par le BDL.
          </li>
          <li>
            Toute tentative de fraude, de vote multiple, d'usurpation
            d'identité ou de manipulation des résultats est strictement
            interdite et peut entraîner la suspension du compte de
            l'Utilisateur concerné, sans préjudice de sanctions
            disciplinaires prévues par le règlement intérieur de
            l'établissement.
          </li>
          <li>
            Les résultats publiés sur le Site n'ont de valeur qu'informative
            et institutionnelle interne au BDL ; ils ne se substituent pas,
            le cas échéant, aux procédures officielles de l'établissement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="regles" title="Article 5 — Règles d'utilisation et comportement des utilisateurs">
        <p>En utilisant le Site, l'Utilisateur s'engage à :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>respecter la législation en vigueur ainsi que les droits des tiers ;</li>
          <li>
            ne pas porter atteinte au bon fonctionnement du Site (tentative
            d'intrusion, saturation, contournement des systèmes de
            sécurité, extraction massive de données, etc.) ;
          </li>
          <li>ne pas usurper l'identité d'un tiers ni créer de faux comptes ;</li>
          <li>
            ne publier aucun contenu à caractère injurieux, diffamatoire,
            discriminatoire, violent, pornographique ou portant atteinte à
            la dignité d'autrui ;
          </li>
          <li>
            ne pas utiliser le Site, notamment l'espace Intranet, les
            scrutins et les sondages, à des fins étrangères à la vie
            lycéenne et aux missions du BDL.
          </li>
        </ul>
        <p>
          Le non-respect de ces règles peut entraîner, selon la gravité, un
          avertissement, la suppression du contenu concerné, la suspension
          ou la suppression du compte de l'Utilisateur, sans préjudice
          d'éventuelles poursuites.
        </p>
      </LegalSection>

      <LegalSection id="propriete" title="Article 6 — Propriété intellectuelle">
        <p>
          Le contenu du Site (textes, images, logos, mise en page, code
          source, base de données, etc.) est protégé par le droit de la
          propriété intellectuelle. Sauf autorisation expresse, toute
          reproduction ou réutilisation, totale ou partielle, à des fins
          autres que strictement personnelles est interdite.
        </p>
        <p>
          Les contenus mis en ligne par les Utilisateurs (photo de profil,
          réponses aux sondages, etc.) restent la propriété de leurs
          auteurs ; ceux-ci concèdent au BDL une licence non exclusive,
          gratuite et limitée à la finalité du Site, pour la durée
          d'existence du compte.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="Article 7 — Données personnelles">
        <p>
          L'utilisation du Site entraîne la collecte et le traitement de
          données à caractère personnel (identité, e-mail, données de
          connexion, participation aux scrutins/sondages, photo de profil),
          réalisés dans le respect du RGPD et de la loi Informatique et
          Libertés.
        </p>
        <p>
          Les modalités de ce traitement (finalités, base légale, durées de
          conservation, destinataires, droits des personnes) sont détaillées
          dans la <Link to="/legal/confidentialite">Politique de confidentialité</Link> du
          Site.
        </p>
      </LegalSection>

      <LegalSection id="disponibilite" title="Article 8 — Disponibilité et évolution du service">
        <p>
          Le BDL se réserve le droit, à tout moment et sans préavis, de
          modifier, suspendre ou interrompre tout ou partie du Site,
          notamment pour des raisons de maintenance, de mise à jour ou de
          sécurité.
        </p>
        <p>
          Le BDL ne saurait être tenu responsable des conséquences d'une
          indisponibilité temporaire ou d'une interruption du Site.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" title="Article 9 — Responsabilité">
        <p>
          Le BDL met en œuvre des moyens raisonnables pour assurer
          l'exactitude des informations diffusées sur le Site, sans
          garantir l'absence d'erreurs, d'inexactitudes ou d'omissions.
        </p>
        <p>Le BDL ne pourra être tenu responsable des dommages directs ou indirects résultant :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>d'une interruption ou indisponibilité du Site ;</li>
          <li>d'un dysfonctionnement technique indépendant de sa volonté (hébergeur, opérateur, etc.) ;</li>
          <li>d'une utilisation non conforme du Site par l'Utilisateur ;</li>
          <li>de contenus publiés par des tiers ou par d'autres Utilisateurs.</li>
        </ul>
      </LegalSection>

      <LegalSection id="modification" title="Article 10 — Modification des CGU">
        <p>
          Le BDL se réserve le droit de modifier les présentes CGU à tout
          moment, notamment pour se conformer à toute évolution légale,
          réglementaire, technique ou jurisprudentielle. La version
          applicable est celle en vigueur à la date de connexion de
          l'Utilisateur, disponible en permanence sur le Site. En cas de
          modification substantielle, les Utilisateurs disposant d'un
          compte pourront en être informés par tout moyen approprié (e-mail,
          bandeau d'information sur le Site).
        </p>
      </LegalSection>

      <LegalSection id="droit" title="Article 11 — Droit applicable et litiges">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de
          différend relatif à leur interprétation ou à leur exécution, les
          parties s'efforceront de trouver une solution amiable. À défaut,
          et sous réserve des règles de compétence légalement applicables
          (notamment en présence d'un Utilisateur mineur), les tribunaux
          français seront seuls compétents.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Article 12 — Contact">
        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-1">
          <p className="font-semibold text-foreground">
            Bureau des Lycéens — Lycée Saint-André
          </p>
          <p>
            E-mail :{" "}
            <a href="mailto:contact@bdl-saintandre.fr">
              contact@bdl-saintandre.fr
            </a>
          </p>
          <p>
            Voir aussi les pages <Link to="/support">Support</Link> et{" "}
            <Link to="/contact">Contact</Link> du Site.
          </p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default CGU;