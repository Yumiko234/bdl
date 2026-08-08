import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import LegalPageLayout, { LegalTocEntry } from "@/components/legal/LegalPageLayout";
import { LegalSection, TodoNote, CheckNote } from "@/components/legal/LegalSection";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LAST_UPDATED = "8 août 2026"; // [À COMPLÉTER] mettre à jour à chaque modification

const TOC: LegalTocEntry[] = [
  { id: "responsable", label: "Responsable de traitement" },
  { id: "collecte", label: "Données collectées" },
  { id: "finalites", label: "Finalités et bases légales" },
  { id: "mineurs", label: "Utilisateurs mineurs" },
  { id: "destinataires", label: "Destinataires des données" },
  { id: "hebergement", label: "Sous-traitants et hébergement" },
  { id: "conservation", label: "Durées de conservation" },
  { id: "cookies", label: "Cookies et traceurs" },
  { id: "securite", label: "Sécurité des données" },
  { id: "droits", label: "Vos droits" },
  { id: "modification", label: "Modification de la politique" },
  { id: "contact", label: "Contact" },
];

const Confidentialite = () => {
  useEffect(() => {
    document.title = "Politique de confidentialité – Bureau des Lycéens";
  }, []);

  return (
    <LegalPageLayout
      icon={<ShieldCheck className="h-8 w-8" />}
      eyebrow="Document légal"
      title="Politique de confidentialité"
      intro="Comment le Bureau des Lycéens collecte, utilise et protège vos données personnelles sur ce site, conformément au RGPD."
      lastUpdated={LAST_UPDATED}
      toc={TOC}
    >
      <LegalSection id="responsable" title="1. Responsable de traitement">
        <p>
          Le responsable du traitement des données collectées via le Site
          est :
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-1">
          <p className="font-semibold text-foreground">
             Bureau des Lycéens du Lycée Saint-André
          </p>
          <p>19 Rue Rapp, 68000 Colmar,Haut-Rhin, France
          </p>
          <p>
            Contact :{" "}
            <a href="mailto:contact@bdl-saintandre.fr">
              contact@bdl-saintandre.fr
            </a>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-1">
          <p className="font-semibold text-foreground">
             Délégué à la Protection des Données (DPO)
          </p>
          <p>Alexandre LEJAL
          </p>
          <p>
            Contact :{" "}
            <a href="mailto:admin@bdl-saintandre.fr">
              admin@bdl-saintandre.fr
            </a>
          </p>
        </div>
      </LegalSection>

      <LegalSection id="collecte" title="2. Quelles données collectons-nous ?">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Catégorie</TableHead>
              <TableHead>Exemples</TableHead>
              <TableHead>Quand ?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-foreground">Données de compte</TableCell>
              <TableCell>Nom complet, e-mail, mot de passe (chiffré via Supabase Auth)</TableCell>
              <TableCell>Création de compte</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Données de profil</TableCell>
              <TableCell>Photo de profil, informations complémentaires</TableCell>
              <TableCell>Utilisation de l'espace membre</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Données de participation</TableCell>
              <TableCell>Réponses aux sondages, votes aux scrutins</TableCell>
              <TableCell>Participation aux scrutins/sondages</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Données de contact</TableCell>
              <TableCell>Nom, e-mail, message</TableCell>
              <TableCell>Formulaire de contact / support</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Données techniques</TableCell>
              <TableCell>Adresse IP, pages consultées, statistiques d'audience</TableCell>
              <TableCell>Navigation sur le Site (Vercel Analytics)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Certificats</TableCell>
              <TableCell>Informations nécessaires à la vérification d'un certificat</TableCell>
              <TableCell>Utilisation de cette fonctionnalité</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p>
          Nous ne collectons <strong>aucune donnée sensible</strong> au sens
          de l'article 9 du RGPD (santé, opinions religieuses, origine,
          etc.) dans le cadre normal d'utilisation du Site. Les Utilisateurs
          sont invités à ne jamais transmettre ce type de données via le
          formulaire de contact ou leur profil.
        </p>
      </LegalSection>

      <LegalSection id="finalites" title="3. Pourquoi collectons-nous ces données ?">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Finalité</TableHead>
              <TableHead>Base légale (RGPD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Créer et gérer votre compte, votre profil et votre accès à l'Intranet</TableCell>
              <TableCell>Exécution des CGU (art. 6.1.b)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Organiser les scrutins et sondages, comptabiliser et publier les résultats</TableCell>
              <TableCell>Intérêt légitime (art. 6.1.f) / consentement pour les sondages facultatifs</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Répondre à vos demandes (contact, support)</TableCell>
              <TableCell>Intérêt légitime (art. 6.1.f)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mesurer l'audience du Site (Vercel Analytics)</TableCell>
              <TableCell>Intérêt légitime ou consentement selon la configuration</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Assurer la sécurité du Site (fraude aux votes, usurpation)</TableCell>
              <TableCell>Intérêt légitime (art. 6.1.f)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Respecter nos obligations légales</TableCell>
              <TableCell>Obligation légale (art. 6.1.c)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </LegalSection>

      <LegalSection id="mineurs" title="4. Utilisateurs mineurs">
        <p>
          Une partie importante des Utilisateurs du Site est mineure,
          s'agissant d'un site destiné à la communauté d'un lycée.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Les mineurs de 15 ans et plus peuvent consentir seuls aux
            traitements fondés sur le consentement (article 45 de la loi
            Informatique et Libertés).
          </li>
          <li>
            Pour les mineurs de moins de 15 ans, la création de compte
            suppose le consentement conjoint du mineur et d'au moins un
            titulaire de l'autorité parentale.
          </li>
          <li>
            Nous nous engageons à ne collecter que les données strictement
            nécessaires au fonctionnement du Site et à ne jamais utiliser
            les données des mineurs à des fins de prospection commerciale
            ou de profilage publicitaire.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="destinataires" title="5. Qui a accès à vos données ?">
        <p>Vos données sont destinées :</p>
        <ul className="list-disc pl-5 space-y-1.5">
            <li>
                au Délégué à la Protection des Données, Gestionnaire du Site, actuellement Alexandre LEJAL ; 
            </li>
          <li>
            aux membres habilités du BDL disposant d'un accès exévutig
            (gestion de l'Intranet, des scrutins, des sondages, du support) ;
          </li>
          <li>
            le cas échéant, à l'administration du Lycée Saint-André, dans la
            limite de ses missions de tutelle sur la vie lycéenne ;
          </li>
          <li>à nos sous-traitants techniques (voir section suivante) ;</li>
          <li>
            aux autorités administratives ou judiciaires, sur demande et
            dans les limites prévues par la loi.
          </li>
        </ul>
        <p>Nous ne vendons ni ne louons vos données personnelles à des tiers.</p>
      </LegalSection>

      <LegalSection id="hebergement" title="6. Sous-traitants et hébergement des données">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prestataire</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Localisation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-foreground">Supabase Inc.</TableCell>
              <TableCell>Base de données, authentification, stockage des fichiers</TableCell>
              <TableCell>Irlande — Union européenne</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Vercel Inc.</TableCell>
              <TableCell>Fonctions serveur du site</TableCell>
              <TableCell>Paris, France — région cdg1, Union européenne</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Vercel Inc.</TableCell>
              <TableCell>Mesure d'audience (Vercel Analytics)</TableCell>
              <TableCell>États-Unis (aucun choix de région disponible)</TableCell>
            </TableRow>
          </TableBody>
        </Table>


        <p>
          Seules les données collectées par <strong>Vercel Analytics</strong>{" "}
          (mesure d'audience : pages consultées, référent, informations
          dérivées de l'adresse IP, agrégées et non identifiantes) font
          l'objet d'un traitement par Vercel Inc. aux États-Unis. Ce
          transfert est encadré par le cadre de protection des données{" "}
          <strong>UE-États-Unis (Data Privacy Framework)</strong>, auquel
          Vercel est certifiée, constituant une garantie reconnue par la
          Commission européenne au titre de l'article 45 du RGPD. Pour plus
          de détails, consultez la{" "}
          <a
            href="https://vercel.com/legal/privacy-notice"
            target="_blank"
            rel="noopener noreferrer"
          >
            politique de confidentialité de Vercel
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="conservation" title="7. Durées de conservation">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type de données</TableHead>
              <TableHead>Durée de conservation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Compte utilisateur actif (profil, e-mail, nom)</TableCell>
              <TableCell>Durée de la scolarité au Lycée Saint-André</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Compte inactif</TableCell>
              <TableCell>Suppression après deux (2) d'inactivité</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Résultats des scrutins et sondages</TableCell>
              <TableCell>Conservés à des fins d'archive institutionnelle ; identité liée à un vote secret non conservée au-delà de la clôture</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Messages de contact/support</TableCell>
              <TableCell>Deux (2) ans à compter du dernier contact</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Données de connexion / logs techniques</TableCell>
              <TableCell>Douze (12) mois</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies et traceurs">
        <p>Le Site utilise :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            des <strong>cookies techniques essentiels</strong>, notamment
            pour la gestion de votre session de connexion (Supabase Auth) —
            ces cookies ne nécessitent pas de consentement préalable,
            conformément aux recommandations de la CNIL ;
          </li>
          <li>
            <strong>Vercel Analytics</strong>, un outil de mesure d'audience
            qui ne dépose pas de cookies traceurs persistants (identification
            de session par empreinte technique de courte durée) et dont les
            données sont traitées de façon agrégée par Vercel Inc.
            (États-Unis), sous garantie du Data Privacy Framework
            UE-États-Unis (voir section 6).
          </li>
        </ul>
        <p>
          Vous pouvez à tout moment configurer votre navigateur pour
          refuser les cookies non essentiels, sans que cela n'affecte les
          fonctionnalités essentielles du Site (connexion, vote).
        </p>
      </LegalSection>

      <LegalSection id="securite" title="9. Sécurité de vos données">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles
          raisonnables pour protéger vos données contre la perte, l'accès
          non autorisé, la divulgation ou l'altération, notamment :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>chiffrement des mots de passe (géré par Supabase Auth) ;</li>
          <li>contrôle d'accès par rôles pour l'espace d'administration ;</li>
          <li>connexion sécurisée (HTTPS) à l'ensemble du Site.</li>
        </ul>
        <p>
          Aucun système n'étant totalement infaillible, nous vous invitons à
          choisir un mot de passe robuste et à ne jamais le communiquer à un
          tiers.
        </p>
      </LegalSection>

      <LegalSection id="droits" title="10. Vos droits">
        <p>
          Conformément au RGPD, vous disposez des droits suivants sur vos
          données personnelles :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>droit d'accès</strong> : obtenir la confirmation que vos données sont traitées et en obtenir une copie ;</li>
          <li><strong>droit de rectification</strong> : corriger des données inexactes ou incomplètes ;</li>
          <li><strong>droit à l'effacement</strong> : demander la suppression de vos données, notamment de votre compte ;</li>
          <li><strong>droit à la limitation</strong> du traitement ;</li>
          <li><strong>droit d'opposition</strong>, pour les traitements fondés sur l'intérêt légitime ;</li>
          <li><strong>droit à la portabilité</strong> de vos données, lorsque cela est techniquement applicable ;</li>
          <li><strong>droit de définir des directives</strong> relatives au sort de vos données après votre décès.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à{" "}
          <a href="mailto:admin@bdl-saintandre.fr">
            admin@bdl-saintandre.fr
          </a>
          , en précisant votre identité. Une réponse vous sera apportée dans
          un délai maximum d'un mois.
        </p>
        <p>
          Si vous estimez, après nous avoir contactés, que vos droits ne
          sont pas respectés, vous pouvez introduire une réclamation auprès
          de la{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            Commission Nationale de l'Informatique et des Libertés (CNIL)
          </a>
          , 3 place de Fontenoy, 75007 Paris.
        </p>
      </LegalSection>

      <LegalSection id="modification" title="11. Modification de la présente politique">
        <p>
          Nous pouvons être amenés à modifier la présente Politique de
          confidentialité, notamment pour l'adapter à toute évolution
          légale, réglementaire, jurisprudentielle ou technique. La version
          en vigueur est celle publiée sur le Site à la date de votre
          consultation.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
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
            Voir aussi les <Link to="/legal/mentions-legales">Mentions légales</Link> et les{" "}
            <Link to="/legal/cgu">CGU</Link> du Site.
          </p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default Confidentialite;