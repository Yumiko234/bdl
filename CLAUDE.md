# CLAUDE.md — Bureau des Lycéens (BDL)

Instructions pour Claude Code dans ce projet.

## Règles absolues

- **Ne jamais ajouter `Co-Authored-By`** dans les messages de commit — les commits doivent apparaître signés uniquement par `mv1234vm`.
- **Ne jamais pusher sans un "ok commit" / "ok push" explicite** de l'utilisateur.
- **Ne jamais pusher les commits d'Alex** (compte GitHub `Yumiko234`).
- **Ne pas committer** `public/sitemap.xml` ni le dossier `.claude/`.
- **Toujours faire un preview localhost** et attendre la validation avant de commit/push.

## Répertoire de travail

`C:\Users\mv201\Documents\Site\bdl`

## Projet

Site officiel du Bureau des Lycéens du Lycée Saint-André.
Prod : <https://bdl-saintandre.fr> — Vercel, déploiement auto sur push `main`.
Icône : <https://bdl-saintandre.fr/logo-bdl.jpeg>

**Stack :** React 18 · TypeScript · Vite 7 · Tailwind CSS · shadcn/ui · Supabase · Vercel

## Architecture clé

- `src/components/BdlQRCode.tsx` — composant QR code partagé (JO + certificats), utilise `qr-code-styling` avec logo BDL circulaire au centre.
- `src/components/admin/` — 22+ modules de la console d'administration.
- `src/hooks/useAuth.ts` — authentification Supabase.
- `src/integrations/supabase/` — client + types générés.
- `vercel.json` — rewrites SPA + headers CSP.

## Points d'attention

- La CSP est dans `vercel.json` (header `Content-Security-Policy`). Toute nouvelle ressource externe (CDN, domaine API) doit y être ajoutée.
- `qr-code-styling` fait un `fetch()` interne sur les data URLs → `connect-src` doit inclure `data: blob:`.
- Le schéma Supabase n'est pas entièrement dans `supabase/migrations/` — ne pas supposer que les migrations sont à jour.
- L'autorisation repose sur les RLS Supabase ; les gardes React côté client ne protègent pas les données.
