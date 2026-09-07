# Site BDL — Bureau des Lycéens du Lycée Saint-André

Application web du Bureau des Lycéens : actualités, clubs, documents, demandes
d'audience, forums de classe, suivi des actions et des présences des membres du
Bureau.

## Stack

- **Front** : React 19 + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui (Radix) + lucide-react + recharts
- **Back / BaaS** : Supabase (Postgres, Auth, RLS, Edge Functions)
- **Hébergement** : Vercel

## Démarrage

```bash
npm install
npm run dev      # serveur de dev (http://localhost:5173)
npm run build    # build de production dans dist/
npm run preview  # prévisualise le build
```

### Variables d'environnement

Créer un fichier `.env` à la racine :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Structure

```
src/
  components/admin/   Écrans d'administration (membres, suivi des actions, contenu…)
  pages/              Pages publiques et espace profil
  integrations/supabase/  Client Supabase + types générés
supabase/
  migrations/         Migrations SQL
  functions/          Edge Functions (ex. admin-users)
```

## Suivi des actions BDL

L'écran **Admin → Suivi des Actions** (`src/components/admin/AdminSuiviActions.tsx`)
permet d'assigner des actions aux membres du Bureau et de suivre points, statuts
et présences aux réunions.

Une action est liée à un **compte utilisateur** (`bdl_actions.assigned_to` référence
l'identifiant du compte). Une fiche membre créée sans compte lié
(« membre externe » dans *Membres du Bureau*) ne peut donc pas se voir assigner
d'action : dans le formulaire, ces membres apparaissent désactivés avec la mention
« pas de compte lié ». Pour leur assigner des actions, il faut d'abord lier leur
fiche à un compte.
