# Contexte global — stack & structure

## Application

Application Web de gestion de séjours (Enjoy).

**Stack :** React 19, TypeScript, Vite 6, SCSS Modules, Redux Toolkit (AuthSlice).

**Gestion des paquets :** pnpm (pas npm) — utiliser `pnpm add` / `pnpm install` pour éviter les conflits de peer dependencies.

**Backend :** API REST Java Spring (dépôt **enjoyApi**). Pour l’architecture backend, les DTOs et la synchro front/back, voir aussi [`../../../enjoyApi/AI_MEMORY.md`](../../../enjoyApi/AI_MEMORY.md).

## Structure des dossiers (rappel)

- Séparation `Pages/_Admin` vs `Pages/_Directeur` pour les pages par rôle.
- Détail séjour : `Pages/_Directeur/DetailsSejour/` — `DetailsSejourOverview.tsx`, `DetailsSejourActivites.tsx`, `SejourDetailOutlet.tsx`, `detailsSejourLoader.ts`, styles `DetailsSejour.module.scss`.
- Helpers dans `helpers/`, types dans `types/`, services dans `services/`.
- Composants de liste génériques dans `components/Liste/`.

Les règles obligatoires (langue, lint, patterns) restent dans [`.cursorrules`](../../.cursorrules).

## Glossaire métier (très court)

- **Directeur** : `RoleSysteme.DIRECTION`, routes `/directeur/*`.
- **Admin** : `RoleSysteme.ADMIN`, `/utilisateurs`, `/sejours`.
- **Séjour** : entité centrale (équipe, enfants, lieux, activités, plannings).

Le détail des termes (loader, moment, grille, etc.) est dans [etat-projet.md](etat-projet.md) (section glossaire).
