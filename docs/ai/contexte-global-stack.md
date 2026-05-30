# Contexte global — stack & structure

## Application

Application Web de gestion de séjours (Enjoy).

**Stack :** React 19, TypeScript, Vite 6, SCSS Modules, Redux Toolkit (AuthSlice).

**Gestion des paquets :** pnpm (pas npm) — utiliser `pnpm add` / `pnpm install` pour éviter les conflits de peer dependencies.

**Backend :** API REST Java Spring (dépôt **enjoyApi**). Pour l’architecture backend, les DTOs et la synchro front/back, voir aussi [`../../../enjoyApi/AI_MEMORY.md`](../../../enjoyApi/AI_MEMORY.md).

## Structure des dossiers (rappel)

- Séparation `Pages/_Admin` (rôle ADMIN) vs **`Pages/_Sejours`** (pages partagées **DIRECTION + BASIC_USER** participant à un séjour : **`MesSejours/`**, `DetailsSejour/`, `DossierEnfant/`).
- Détail séjour : **`Pages/_Sejours/DetailsSejour/`** — `DetailsSejourOverview.tsx`, `DetailsSejourActivites.tsx`, **`DetailsSejourChambres.tsx`**, **`DetailsSejourParametrage.tsx`**, `SejourDetailOutlet.tsx`, `detailsSejourLoader.ts`, styles `DetailsSejour.module.scss` ; composant accordéon partagé **`components/DetailsSejour/DetailsSejourAccordionItem.tsx`** (styles importés depuis `DetailsSejour.module.scss`).
- Helpers dans `helpers/`, types dans `types/`, services dans `services/`.
- Composants de liste génériques dans `components/Liste/`.

Les règles obligatoires courtes (langue, lint, périmètre) restent dans [`.cursor/rules/`](../../.cursor/rules/).

## Glossaire métier (très court)

- **Directeur** : `RoleSysteme.DIRECTION`, routes **`/mes-sejours/*`** (partagées avec les **BASIC_USER** membres d’équipe).
- **Animateur (BASIC_USER)** : `RoleSysteme.BASIC_USER`, accès aux mêmes routes **`/mes-sejours/*`** mais filtré côté API sur les séjours dont il est membre d’équipe.
- **Admin** : `RoleSysteme.ADMIN`, `/utilisateurs`, `/sejours`.
- **Séjour** : entité centrale (équipe, enfants, lieux, chambres, activités, plannings).

Le détail des termes (loader, moment, grille, etc.) est dans [etat-projet.md](etat-projet.md) (section glossaire).
