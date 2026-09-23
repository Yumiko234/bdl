export interface Skill {
  name: string;
  level: number; // 0 à 100
}

export interface TimelineEntry {
  date: string;   // ex: "2023", "Sept. 2024"
  title: string;
  description?: string;
}

export interface Socials {
  github?: string;
  linkedin?: string;
  instagram?: string;
  email?: string;
  website?: string;
  discord?: string;
}

export interface Developer {
  slug: string;               // utilisé dans l'URL /developpers/:slug
  fullName: string;
  handle?: string;             // pseudo / @username affiché façon "terminal"
  role: string;                // rôle sur le projet BDL
  tagline: string;             // phrase d'accroche (effet machine à écrire)
  accent: string;              // couleur d'accent HSL, ex "45 100% 51%"
  accentSoft?: string;         // variante plus douce pour les fonds, optionnel
  avatarInitials: string;      // repli si pas de photo
  avatarUrl?: string;          // [À PERSONNALISER] chemin vers une photo/avatar si tu en as un
  skillsLabel?: string,        // Pour moi car je veux mettre droit
  bio: string[];               // paragraphes de la biographie
  stack: Skill[];              // compétences techniques mises en avant
  funFacts?: string[];         // anecdotes / fun facts
  timeline?: TimelineEntry[];  // petit historique perso ou sur le projet
  quote?: string;              // citation / punchline signature
  terminalBoot?: string[];     // lignes façon "boot" de terminal dans le hero
  socials?: Socials;
}

export const developers: Developer[] = [
  {
    slug: "alexandre-lejal",
    fullName: "Alexandre Lejal",
    handle: "@Yumiko234",
    role: "Consultant — Fondateur du site",
    tagline: "Je suis censé être en L1 Droit, qu'est-ce que je fou là ?",
    accent: "217 91% 55%", 
    avatarInitials: "AL",
    avatarUrl: "https://ppmlhjcwdyaarbqpngla.supabase.co/storage/v1/object/public/avatars/avatars/13017c3d-e4bb-4e30-aed1-721e321512d7-1772204554404.jpg",
    bio: [

      "À l'origine Président du Bureau, j'ai voulu lui donner une seconde vie en le mettant à l'ère du numérique. Les actus, sondages, JoBDL, intranet, etc... c'est mon œuvre !",
      "Heureusement que Maël est là, il m'apporte une réelle expertise et sait trouver les petits bugs là où je ne vois qu'une raison de m'énnerver.",
    ],
    skillsLabel: "Droit",
    stack: [
      { name: "Diplomatie", level: 100 },
      { name: "Droi constit", level: 85 },
      { name: "Institutions judiciaires", level: 88 },
      { name: "Eco po", level: 5 },
    ],
    funFacts: [
      "A été plus investi dans le BDL que dans sa scolarité.",
      "Vous voulez aller à EuropaPark version St-André ?",
      "Les chiffres mentionnés sont 100% authentiques.",
    ],
    timeline: [
      { date: "Septembre 2025", title: "Découverte", description: "Je découvre que le BDL a un site internet, malheureusement totalement inactif depuis 2020 et fait avec Wix."},
      { date: "Octobre 2025", title: "Lancement du projet", description: "Première version du site du BDL, de zéro. De base j'étais en voyage scolaire à NYC." },
      { date: "Février 2026", title: "Refonte complète", description: "Nouvelle architecture, back-office et système de comptes." },
      { date: "Aujourd'hui", title: "Amélioration continue", description: "De nouvelles fonctionnalités ajoutées régulièrement, avec Maël." },
    ],
    quote: "« Là où nait l'ambition, s'élève la grandeur » ; c'est de moi !",
    terminalBoot: [
      "whoami",
      "> alexandre-lejal",
      "cat role.txt",
      "> Fondateur & développeur du site du BDL",
    ],
    socials: {
      github: "https://github.com/Yumiko234",
      linkedin: "https://fr.linkedin.com/in/alexandre-lejal",
      email: "admin@bdl-saintandre.fr",
      instagram: "https://instagram.com/al.lejal",
    },
  },
  {
    slug: "mael-vicq",
    fullName: "Maël Vicq",
    handle: "@mael-vicq", // [À PERSONNALISER] pseudo réel si différent
    role: "Développeur — Co-mainteneur du site", // [À PERSONNALISER]
    tagline: "Ici pour coder, rester pour les bugs en prod.", // [À PERSONNALISER]
    accent: "45 100% 51%", // doré/accent du site
    avatarInitials: "MV",
    bio: [
      // [À PERSONNALISER] — remplace par ta vraie bio
      "Deuxième développeur du projet, j'interviens sur le site du Bureau des Lycéens pour faire évoluer les fonctionnalités et améliorer l'expérience de tous les élèves.",
      "J'aime particulièrement quand une interface devient à la fois simple à utiliser et agréable à regarder — sans sacrifier la performance.",
    ],
    stack: [
      // [À PERSONNALISER] — ajuste tes compétences et niveaux
      { name: "React / TypeScript", level: 80 },
      { name: "UI / UX", level: 82 },
      { name: "Tailwind CSS", level: 78 },
      { name: "Supabase / SQL", level: 65 },
    ],
    funFacts: [
      // [À PERSONNALISER]
      "Toujours partant pour discuter d'une nouvelle idée de fonctionnalité.",
    ],
    timeline: [
      // [À PERSONNALISER]
      { date: "2024", title: "Arrivée sur le projet", description: "Rejoint le développement du site du BDL." },
      { date: "Aujourd'hui", title: "Contributions actives", description: "Travaille sur de nouvelles fonctionnalités avec Alexandre." },
    ],
    quote: "// TODO: écrire une citation qui claque ici",
    terminalBoot: [
      "whoami",
      "> mael-vicq",
      "cat role.txt",
      "> Développeur du site du BDL",
    ],
    socials: {
      // [À PERSONNALISER] — ajoute ses vrais liens
      github: "https://github.com/",
      linkedin: "https://www.linkedin.com/",
    },
  },
];

export const getDeveloperBySlug = (slug?: string): Developer | undefined =>
  developers.find((d) => d.slug === slug);