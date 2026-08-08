import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import LegalPageLayout, { LegalTocEntry } from "@/components/legal/LegalPageLayout";
import { LegalSection, TodoNote } from "@/components/legal/LegalSection";
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
  { id: "edition", label: "Édition du site" },
  { id: "developpement", label: "Développement et gestion technique" },
  { id: "hebergement", label: "Hébergement" },
  { id: "propriete", label: "Propriété intellectuelle" },
  { id: "donnees", label: "Données personnelles" },
  { id: "cookies", label: "Cookies et traceurs" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "droit", label: "Droit applicable" },
  { id: "contact", label: "Contact" },
];

const MentionsLegales = () => {
  useEffect(() => {
    document.title = "Mentions légales – Bureau des Lycéens";
  }, []);

  return (
    <LegalPageLayout
      icon={<Scale className="h-8 w-8" />}
      eyebrow="Document légal"
      title="Mentions légales"
      intro="Informations relatives à l'édition, l'hébergement et l'utilisation du site du Bureau des Lycéens, conformément à la loi pour la confiance dans l'économie numérique (LCEN)."
      lastUpdated={LAST_UPDATED}
      toc={TOC}
    >
      <LegalSection id="edition" title="1. Édition du site">
        <p>
          Conformément aux dispositions des articles 6-III et 19 de la loi n°
          2004-575 du 21 juin 2004 pour la confiance dans l'économie
          numérique (LCEN), il est porté à la connaissance des utilisateurs
          et visiteurs du présent site (ci-après « le Site ») les présentes
          mentions légales.
        </p>
        <p>L'accès et l'utilisation du Site sont soumis à l'acceptation intégrale et sans réserve des présentes mentions légales, ainsi qu'aux{" "}
          <Link to="/legal/cgu">Conditions Générales d'Utilisation</Link>.</p>

        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-2">
          <p>
            <strong>Éditeur :</strong>{" "}
         Bureau des Lycéens du Lycée Saint-André
          </p>
          <p>
            <strong>Siège :</strong> 19 Rue Rapp, 68000 Colmar — Haut-Rhin, France
          </p>
          <p>
            <strong>Adresse e-mail :</strong> contact@bdl-saintandre.fr
          </p>
          <p>
            <strong>Établissement de rattachement :</strong> Lycée
            Saint-André —{" "}
            <a href="https://www.st-andre.com" target="_blank" rel="noopener noreferrer">
              www.st-andre.com
            </a>
          </p>
        </div>

        <p>
          Le Bureau des Lycéens (BDL) est une instance représentative des
          élèves du Lycée Saint-André. Il a pour mission de favoriser l'expression, 
          la participation et l'engagement des lycéens dans la vie de l'établissement,
          d'assurer le lien permanent entre les élèves, la communauté éducative et 
          la direction, et de promouvoir les valeurs d'initiative, de respect et de 
          responsabilité.
        </p>

<div className="rounded-lg border border-border bg-muted/30 p-5 space-y-2">
          <p>
            <strong>Directrice de publication :</strong>{" "}
         Elodie ROTH
          </p>
          <p>
            <strong>Siège :</strong> 19 Rue Rapp, 68000 Colmar — Haut-Rhin, France
          </p>
          <p>
            <strong>Adresse e-mail :</strong> presidente@bdl-saintandre.fr
          </p>
          <p>
            <strong>Établissement de rattachement :</strong> Lycée
            Saint-André —{" "}
            <a href="https://www.st-andre.com" target="_blank" rel="noopener noreferrer">
              www.st-andre.com
            </a>
          </p>
        </div>
      </LegalSection>

      <LegalSection id="developpement" title="2. Développement et gestion technique du site">
        <p>Conception, développement et maintenance technique du Site :</p>
        <div className="rounded-lg border border-border bg-muted/30 p-5">
          <p className="font-semibold text-foreground">Alexandre Lejal</p>
          <a
            href="https://fr.linkedin.com/in/alexandre-lejal"
            target="_blank"
            rel="noopener noreferrer"
          >
            Profil LinkedIn
          </a>
        </div>
      </LegalSection>

      <LegalSection id="hebergement" title="3. Hébergement">
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
              <TableCell className="font-medium text-foreground">Vercel Inc.</TableCell>
              <TableCell>Hébergement du site et des fonctions serveur</TableCell>
              <TableCell>Paris, France (région cdg1, Union européenne)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-foreground">Supabase Inc.</TableCell>
              <TableCell>Base de données, authentification, stockage des fichiers</TableCell>
              <TableCell>Irlande (Union européenne)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p>
          Site web de l'hébergeur frontend :{" "}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
          . Site web de l'hébergeur des données :{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            supabase.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="propriete" title="4. Propriété intellectuelle">
        <p>
          L'ensemble des éléments composant le Site (textes, images, logos,
          graphismes, charte visuelle, icônes, vidéos, code source,
          arborescence, etc.) est, sauf mention contraire, la propriété
          exclusive du Bureau des Lycéens du Lycée Saint-André ou fait
          l'objet d'une autorisation d'utilisation.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication,
          adaptation totale ou partielle des éléments du Site, quel que soit
          le moyen ou le procédé utilisé, est interdite sans l'autorisation
          écrite préalable du développeur du Site, sauf pour un
          usage strictement personnel et non commercial.
        </p>
        <p>
          Le logo « BDL » et les visuels associés sont la propriété du
          Bureau des Lycéens. Toute exploitation non autorisée engage la
          responsabilité de son auteur.
        </p>
        <p>
          Les marques, logos et noms cités sur le Site sont la propriété de leurs
          titulaires respectifs.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="5. Données personnelles">
        <p>
          Le Site propose des fonctionnalités nécessitant la création d'un
          compte (espace Intranet, profil, participation aux scrutins et
          sondages) et collecte à ce titre des données à caractère personnel
          (adresse e-mail, mot de passe, nom complet, photo de profil,
          etc.).
        </p>
        <p>
          Ce traitement est décrit en détail dans la{" "}
          <Link to="/legal/confidentialite">Politique de confidentialité</Link> du
          Site ainsi que dans les <Link to="/legal/cgu">CGU</Link>, conformément au
          Règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et à la loi n°
          78-17 du 6 janvier 1978 modifiée « Informatique et Libertés ».
        </p>
        <p>
          Pour toute question relative à vos données personnelles ou pour
          exercer vos droits (accès, rectification, effacement, opposition,
          limitation, portabilité), vous pouvez contacter{" "}
          <a href="mailto:contact@bdl-saintandre.fr">
            contact@bdl-saintandre.fr
          </a>
          .
        </p>
        <p>
          Vous disposez également du droit d'introduire une réclamation
          auprès de la{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            Commission Nationale de l'Informatique et des Libertés (CNIL)
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies et traceurs">
        <p>
          Le Site utilise des cookies techniques essentiels à la gestion de
          la connexion (Supabase Auth), ainsi que Vercel Analytics, un outil
          de mesure d'audience. Le détail de ces traitements figure dans la{" "}
          <Link to="/legal/confidentialite">Politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" title="7. Responsabilité">
        <p>
          Le Bureau des Lycéens s'efforce d'assurer l'exactitude et la mise à
          jour des informations diffusées sur le Site, sans garantie
          d'exhaustivité ou d'absence d'erreur. Le BDL ne saurait être tenu
          responsable des dommages directs ou indirects résultant de l'accès
          ou de l'utilisation du Site, notamment en cas d'indisponibilité
          temporaire, de dysfonctionnement technique ou de contenus publiés
          par des tiers.
        </p>
        <p>
          Le Site peut contenir des liens hypertextes vers des sites tiers
          (Instagram, site du Lycée Saint-André, etc.). Le BDL n'exerce
          aucun contrôle sur ces sites et décline toute responsabilité quant
          à leur contenu.
        </p>
      </LegalSection>

      <LegalSection id="droit" title="8. Droit applicable">
        <p>
          Les présentes mentions légales sont soumises au droit français. En
          cas de litige, et à défaut de résolution amiable, les tribunaux
          français seront seuls compétents.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Contact">
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
            Instagram :{" "}
            <a
              href="https://www.instagram.com/bdllgsaintandre"
              target="_blank"
              rel="noopener noreferrer"
            >
              @bdllgsaintandre
            </a>
          </p>
          <p>
            Établissement :{" "}
            <a href="https://www.st-andre.com" target="_blank" rel="noopener noreferrer">
              www.st-andre.com
            </a>
          </p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default MentionsLegales;