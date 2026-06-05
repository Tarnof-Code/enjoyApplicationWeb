# AI Memory Bank — Enjoy Front

Index court : ne pas lire toute la Memory Bank par défaut. Pour une question ciblée, ouvrir directement le fichier source ou la fiche concernée.

Fiches utiles :
- `docs/ai/contexte-global-stack.md` : stack, tooling, structure.
- `docs/ai/contexte-actif.md` : journal récent et phase courante.
- `docs/ai/decisions-architecturales.md` : patterns React, loaders, formulaires, services.
- `docs/ai/etat-projet.md` : contrat API, services, glossaire.
- `docs/ai/documentation-ui-routing.md` : routes, navigation, accès.
- `docs/ai/roadmap.md` : suivi des tâches.

Rappels essentiels : réponses en français ; paquets avec `pnpm` ; secrets / `.env*` / dumps interdits ; types partagés dans `src/types/api.d.ts`. **Header** : burger sous **1400px** (`expand="xxl"`) ; hauteur dynamique **`--site-header-height`** (`helpers/siteHeaderHeight.ts`) ; pas de **`scrollbar-gutter: stable`**. **Vue générale** : infos séjour en en-tête (centrées) ; accordéons **fermés** par défaut (ids **`5`–`2`–`3`–`4`**). **Connexion** : **`connexionShouldRevalidate`**, router singleton **`App.tsx`**. **Menus séjour** : **`menusLoader`** + cache **`sejourDetailRouteCache`**. **Chambres** : **`ListeChambres`**, **`chambres`** dans **`detailsSejourLoader`**. **Listes** : **`AffichageGroupesListe`**, **`couleurGroupe.ts`**. **Erreurs routes** : **`routeError.ts`**. **Réunions** : **`initialReunions`** depuis le loader parent.

Mise à jour mémoire : utiliser la règle `.cursor/rules/10-memory-bank.mdc`, recouper avec le code réel et placer les détails dans `docs/ai/`. Garder ce fichier entre 10 et 20 lignes.
