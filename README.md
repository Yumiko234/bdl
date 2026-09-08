# Site du Bureau des Lycéens — Lycée Saint-André

Application web officielle du **Bureau des Lycéens (BDL)** du Lycée Saint-André.
Elle sert de vitrine publique (présentation du Bureau, actualités, événements,
documents officiels) **et** d'outil de travail interne pour les membres élus
(suivi des actions, présences aux réunions, scrutins, sondages, gestion de tout
le contenu du site).

Prod : <https://bdl-saintandre.fr> — hébergée sur Vercel, déploiement automatique
à chaque push sur `main`.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage](#démarrage)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [Rôles et permissions](#rôles-et-permissions)
- [Base de données](#base-de-données)
- [Déploiement](#déploiement)
- [Scripts](#scripts)

---

## Fonctionnalités

### Espace public (sans compte)

| Page | Route | Description |
|------|-------|-------------|
| Accueil | `/` | Hero, message de la présidence, dernières actualités & événements, encart Instagram, accès rapides |
| L'Établissement | `/etablissement` | Présentation du lycée (contenu éditable depuis l'admin) |
| Le BDL | `/bdl` | Mission, responsabilités, trombinoscope de l'équipe en cours |
| Historique | `/bdl/historique`, `/bdl/historique/:année` | Bureaux des années précédentes, membres honorifiques |
| Fiche membre | `/bdl/:slug` | Profil détaillé d'un membre (bio, parcours, anecdote…) |
| Clubs | `/clubs` | Section clubs (placeholder, en attente de validation) |
| Actualités | `/actualites` | Articles publiés par le Bureau, avec niveaux de visibilité |
| Événements | `/events` | Événements passés et à venir |
| Calendrier | `/calendrier` | Vue mensuelle, export iCal (`.ics`) et Google Agenda |
| Documents | `/documents` | Règlements, comptes rendus, formulaires, JO — filtrables, téléchargeables |
| Journal Officiel | `/jo`, `/jo/:nor` | Décrets et communications officielles, avec suivi des modifications |
| Contact | `/contact` | Formulaire de contact + demande d'audience |
| Vérification de certificat | `/certificat-verif` | Contrôle de l'authenticité d'un certificat émis par le Bureau |
| Mentions légales / CGU / Confidentialité | `/legal/*` | Documents juridiques (RGPD) |

### Espace connecté (`/intranet`)

- **Authentification** e-mail / mot de passe (`/auth`), confirmation d'e-mail
  (`/confirm`), réinitialisation de mot de passe (`/reset-password`).
- **Profil** (`/profile`) : informations personnelles, photo.
- **Scrutins** (`/scrutin`) : vote des membres habilités, résultats officiels.
- **Sondages** (`/sondage`) : formulaires ouverts aux élèves.
- **Conférence** (`/conference`) : salle de visioconférence WebRTC du Bureau.
- **Support** (`/support`) : tickets d'assistance et demandes d'audience.
- **Suivi de mes actions** (`/bdl-profile`) : pour les membres de l'Exécutif,
  points, actions assignées et notes.

### Console d'administration (`/admin`)

Interface complète réservée au staff, organisée en groupes :

- **Contenu** — Actualités, Événements, Calendrier, Documents, Journal Officiel
- **BDL** — Membres, Profils détaillés, Historique, Notes internes
- **Participation** — Scrutins, Sondages, Suivi des actions, Certificats
- **Assistance** — Support & Audiences, Conférence
- **Site** — Message de la présidence, page Établissement, page Contact
- **Gestion** — Bandeau global, Mode maintenance, gestion des comptes
- **Administration** — Utilisateurs & rôles

L'éditeur de contenu riche est basé sur `react-quill`.

---

## Stack technique

| Domaine | Technologie |
|---------|-------------|
| Framework | **React 18** + **TypeScript**, bundler **Vite 7** |
| Routage | `react-router-dom` v7 (`BrowserRouter`) |
| UI | **Tailwind CSS 3** + **shadcn/ui** (primitives **Radix UI**), icônes `lucide-react` |
| État serveur | `@tanstack/react-query` |
| Graphiques | `recharts` |
| Backend | **Supabase** — PostgreSQL, Auth, Row Level Security, Realtime, Storage, Edge Functions (Deno) |
| Notifications | `sonner` (toasts) |
| PDF | `jspdf` (certificats) |
| Sécurité | `dompurify` pour tout HTML injecté (`src/lib/sanitize.ts`) |
| Analytics | `@vercel/analytics` |
| Hébergement | **Vercel** |

---

## Démarrage

Prérequis : **Node ≥ 18**.

```bash
npm install
npm run dev       # http://localhost:5173
```

Autres commandes :

```bash
npm run build     # génère le sitemap puis build de production dans dist/
npm run preview   # sert le build de production localement
```

---

## Configuration

### Variables d'environnement (`.env` à la racine)

```
VITE_SUPABASE_URL="https://<projet>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<clé anon publique>"
VITE_SUPABASE_PROJECT_ID="<ref projet>"
```

> ⚠️ `src/integrations/supabase/client.ts` contient actuellement l'URL et la clé
> `anon` en dur (clé publique, non sensible). À terme, faire lire les `VITE_*`.

### Configuration Supabase — Authentification

Pour que la réinitialisation de mot de passe fonctionne sur **tous** les
environnements, dans *Authentication → URL Configuration* :

1. **Site URL** = `https://bdl-saintandre.fr`
2. **Redirect URLs** : `https://bdl-saintandre.fr/reset-password`,
   `https://*.vercel.app/reset-password`, `http://localhost:5173/reset-password`
3. **Email template « Reset Password »** : lien vers
   `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`

---

## Structure du projet

```
src/
├── pages/                     Pages (une par route)
│   ├── jobdl/                  Journal Officiel (liste + article :nor)
│   ├── legals/                 Mentions légales, CGU, confidentialité
│   └── profile/               Profil utilisateur + suivi des actions
├── components/
│   ├── admin/                 22 modules de la console d'administration
│   ├── ui/                    Composants shadcn/ui
│   ├── legal/                 Layout des pages légales
│   ├── Navigation.tsx  Footer.tsx  GlobalBanner.tsx
│   ├── MaintenanceOverlay.tsx  RichTextEditor.tsx  ErrorBoundary.tsx
│   └── ScrollToTop.tsx  ProfilePhotoUpload.tsx
├── hooks/                     useAuth, use-mobile, use-toast
├── lib/                       utils.ts (cn), sanitize.ts (DOMPurify)
├── integrations/supabase/     client.ts + types générés
└── App.tsx                    Déclaration des routes
supabase/
├── migrations/                Migrations SQL
└── functions/admin-users/     Edge Function (création / bannissement de comptes)
scripts/
└── generate-sitemap.ts        Sitemap généré au build (prebuild)
```

---

## Rôles et permissions

L'autorisation repose **entièrement sur les Row Level Security policies de
Supabase**. Les contrôles côté React (`src/pages/Admin.tsx`, `useAuth`) ne font
que masquer l'interface — ils ne protègent pas les données.

Les rôles sont stockés dans la table `user_roles` (séparée de `profiles`), et
comparés via les fonctions SQL `has_role()` / `is_bdl_staff()`. Hiérarchie
approximative : `student` < `bdl_member` < postes exécutifs
(`communication_manager`, `secretary_general`, `vice_president`) < `president` <
`administrator`.

---

## Base de données

⚠️ **Le schéma vit dans le dashboard Supabase et n'est pas entièrement reflété
dans `supabase/migrations/`.** Pour resynchroniser :

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db pull
npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
```

Principales tables : `profiles`, `user_roles`, `bdl_members`,
`bdl_member_profiles`, `bdl_years`, `bdl_historical_members`, `bdl_actions`,
`bdl_meetings`, `bdl_meeting_attendance`, `bdl_member_notes`, `news`, `events`,
`calendar_events`, `documents`, `official_journal`, `scrutins`, `scrutin_votes`,
`surveys` / `survey_questions` / `survey_options` / `survey_responses`,
`support_tickets` / `support_messages`, `conferences`, `bdl_certificates`,
`president_message`, `establishment_info`, `contact_info`, `bdl_content`,
`footer_content`, `global_banners`, `maintenance_mode`, `audience_requests`,
`class_forums` / `forum_messages`.

---

## Déploiement

Vercel est connecté au dépôt GitHub :

- push sur **`main`** → déploiement **production** (`bdl-saintandre.fr`)
- push sur toute autre branche ou Pull Request → **déploiement Preview** avec URL
  dédiée

`vercel.json` réécrit toutes les routes vers l'app (SPA).

---

## Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | `prebuild` (sitemap) + build Vite → `dist/` |
| `npm run preview` | Prévisualise le build |
