export interface Skill {
  name: string;
  level: number; // 0 à 100
}

export interface TimelineEntry {
  date: string; // ex: "2023", "Sept. 2024"
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
  slug: string; // utilisé dans l'URL /developpers/:slug
  fullName: string;
  handle?: string; // pseudo / @username affiché façon "terminal"
  role: string; // rôle sur le projet BDL
  tagline: string; // phrase d'accroche (effet machine à écrire)
  accent: string; // couleur d'accent HSL, ex "45 100% 51%"
  accentSoft?: string; // variante plus douce pour les fonds, optionnel
  avatarInitials: string; // repli si pas de photo
  avatarUrl?: string; // [À PERSONNALISER] chemin vers une photo/avatar si tu en as un
  skillsLabel?: string; // Pour moi car je veux mettre droit
  bio: string[]; // paragraphes de la biographie
  stack: Skill[]; // compétences techniques mises en avant
  funFacts?: string[]; // anecdotes / fun facts
  timeline?: TimelineEntry[]; // petit historique perso ou sur le projet
  quote?: string; // citation / punchline signature
  terminalBoot?: string[]; // lignes façon "boot" de terminal dans le hero
  socials?: Socials;
}

export const developers: Developer[] = [
  {
    slug: "alexandre-lejal",
    fullName: "Alexandre Lejal",
    handle: "@Yumiko234",
    role: "Consultant - Fondateur et propriétaire du site",
    tagline: "Je suis censé être en L1 Droit, qu'est-ce que je fous là ?",
    accent: "217 91% 55%",
    avatarInitials: "AL",
    avatarUrl:
      "https://ppmlhjcwdyaarbqpngla.supabase.co/storage/v1/object/public/avatars/avatars/13017c3d-e4bb-4e30-aed1-721e321512d7-1772204554404.jpg",
    bio: [
      "À l'origine Président du Bureau, j'ai voulu lui donner une seconde vie en le mettant à l'ère du numérique. Les actus, sondages, JoBDL, intranet, etc... c'est mon œuvre !",
      "Heureusement que Maël est là, il m'apporte une réelle expertise et sait trouver les petits bugs là où je ne vois qu'une raison de m'énerver.",
    ],
    skillsLabel: "Droit",
    stack: [
      { name: "Diplomatie", level: 100 },
      { name: "Droit constit", level: 50 },
      { name: "Droit privé", level: 80 },
      { name: "Institutions judiciaires", level: 88 },
      { name: "Eco po", level: 5 },
    ],
    funFacts: [
      "A été plus investi dans le BDL que dans sa scolarité.",
      "Vous voulez aller à EuropaPark version St-André ?",
      "Les chiffres mentionnés sont 100% authentiques.",
    ],
    timeline: [
      {
        date: "Septembre 2025",
        title: "Découverte",
        description:
          "Je découvre que le BDL a un site internet, malheureusement totalement inactif depuis 2020 et fait avec Wix.",
      },
      {
        date: "Octobre 2025",
        title: "Lancement du projet",
        description:
          "Première version du site du BDL, de zéro. De base j'étais en voyage scolaire à NYC.",
      },
      {
        date: "Février 2026",
        title: "Refonte complète",
        description:
          "Nouvelle architecture, back-office et système de comptes.",
      },
      {
        date: "Aujourd'hui",
        title: "Consultant",
        description:
          "Présent en tant que consultant auprès du Bureau et l'exécutif pour les conseiller.",
      },
    ],
    quote: "« Là où nait l'ambition, s'élève la grandeur » ; c'est de moi !",
    terminalBoot: [
      "whoami",
      "> alexandre-lejal",
      "cat role.txt",
      "> Fondateur & propriétaire du site du BDL",
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
    handle: "@mv1234vm",
    role: "Développeur - Co-mainteneur du site",
    tagline: "J'ai corrigé 35 bugs en une session. Alexandre en a créé 36.",
    accent: "45 100% 51%",
    accentSoft: "45 80% 20%",
    avatarInitials: "MV",
    avatarUrl:
      "https://ppmlhjcwdyaarbqpngla.supabase.co/storage/v1/object/public/avatars/avatars/8b73f069-f08f-4758-8981-1b01305e1f03-1788884818681.jpg",
    bio: [
      "Développeur web, j'ai atteri sur le BDL avec une mission simple : aider Alex (y a son insta pour celles qui veulent le gérer) Un peu plus tard, j'avais fermé une faille de sécurité, viré Math.random() de la génération d'IDs, et enfin mis un thème sombre (si vous comprenez rien, c'est OK, c'est vraiment juste pour prouver mes connaissances de code).",
      "Spécialisé dans le code (HTML et TypeScript...pour les connaisseurs). J'aime les kebabs sans oignons sauce blanche piment (merci chef), le code, le code, le code, le code, SWAT.",
      "En dehors du BDL, je bosse sur mes propres projets et clients via mymvweb.fr. Si tu veux un dev qui lit vraiment ton code avant de te répondre, tu sais où chercher.",
      "Je suis également célibataire, donc si tu cherches quelqu'un... je suis là ;). D'ailleurs mon mail est en haut :)",
    ],
    stack: [
      { name: "Code", level: 1000 },
      { name: "Maths", level: 88 },
      { name: "Humour", level: 86 },
      { name: "Date avec les gadjis", level: 71 },
      { name: "Allemand", level: 2 },
    ],
    funFacts: [
      "A remplacé Math.random() par crypto.randomUUID(). Dort mieux depuis.",
      "Détecte un N+1 SQL à l'œil nu avant même d'ouvrir le Network tab.",
      "TypeScript strict mode activé. Zéro `any`. Zéro regret.",
      "Force-push sur main : son ennemi naturel, son cardio involontaire.",
    ],
    timeline: [
      {
        date: "Été 2026",
        title: "Le départ",
        description:
          "Ma soeur est au BDL donc je regarde le site. Je remarque « quelques erreurs » et décide d'y remédier. J'écris à Alexandre et je me retrouve propulsé dans cette aventure.",
      },
      {
        date: "7 septembre 2026",
        title: "Premier commit",
        description:
          "« Améliorer la sécurité et supprimer les bugs », facile à dire. En réalité : 35+ correctifs, une faille critique fermée, et Math.random() sorti du projet à coups de pied.",
      },
      {
        date: "8 septembre 2026",
        title: "15 commits en un jour",
        description:
          "Eviter un étirement photographique (pdp), admin amélioré, UX corrigée. Alexandre a compris toutes ses erreurs.",
      },
      {
        date: "Septembre 2026",
        title: "L'incident du force-push",
        description:
          "30+ commits effacés de GitHub en un clic. La légende dit qu'il recommencera.",
      },
      {
        date: "Aujourd'hui",
        title: "Toujours là",
        description:
          "À surveiller que personne ne force-push sur main. Encore.",
      },
    ],
    quote:
      "« Vous savez, moi je ne crois pas qu’il y ait de bonne ou de mauvaise situation. Moi, si je devais résumer ma vie aujourd’hui avec vous, je dirais que c’est d’abord des rencontres, des gens qui m’ont tendu la main, peut-être à un moment où je ne pouvais pas, où j’étais seul chez moi. Et c’est assez curieux de se dire que les hasards, les rencontres forgent une destinée… Parce que quand on a le goût de la chose, quand on a le goût de la chose bien faite, le beau geste, parfois on ne trouve pas l’interlocuteur en face, je dirais, le miroir qui vous aide à avancer. Alors ce n’est pas mon cas, comme je le disais là, puisque moi au contraire, j’ai pu ; et je dis merci à la vie, je lui dis merci, je chante la vie, je danse la vie… Je ne suis qu’amour ! Et finalement, quand beaucoup de gens aujourd’hui me disent « Mais comment fais-tu pour avoir cette humanité ? », eh bien je leur réponds très simplement, je leur dis que c’est ce goût de l’amour, ce goût donc qui m’a poussé aujourd’hui à entreprendre un site de bdl, mais demain, qui sait, peut-être seulement à me mettre au service de la communauté, à faire le don, le don de soi… » ; c'est de moi !",
    terminalBoot: [
      "whoami",
      "> mael-vicq  |  @mv1234vm",
      "cat role.txt",
      "> Développeur - Co-mainteneur du site BDL",
      "git log --author='Maël' --oneline | wc -l",
      "> 63 (sans compter ce qu'Alex a force-pushé)",
    ],
    socials: {
      github: "https://github.com/mv1234vm",
      website: "https://mymvweb.fr",
      email: "hello@mymvweb.fr",
    },
  },
];

export const getDeveloperBySlug = (slug?: string): Developer | undefined =>
  developers.find((d) => d.slug === slug);
