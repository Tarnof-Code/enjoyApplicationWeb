# AI Memory Bank — Enjoy Front

Index court : ne pas lire toute la Memory Bank par défaut. Pour une question ciblée, ouvrir directement le fichier source ou la fiche concernée.

Fiches utiles :
- `docs/ai/contexte-global-stack.md` : stack, tooling, structure.
- `docs/ai/contexte-actif.md` : journal récent et phase courante.
- `docs/ai/decisions-architecturales.md` : patterns React, loaders, formulaires, services.
- `docs/ai/etat-projet.md` : contrat API, services, glossaire.
- `docs/ai/documentation-ui-routing.md` : routes, navigation, accès.
- `docs/ai/roadmap.md` : suivi des tâches.

Rappels essentiels : réponses en français ; paquets avec `pnpm` ; secrets / `.env*` / dumps interdits ; types partagés dans `src/types/api.d.ts`. **Auth 401** : redirect **`/`** — loaders **`routeError.ts`** + intercepteur global **`caller.service.ts`**. **Impression** : **`src/print/`** — en-tête **Titre — n/N** ; **`PrintDocumentHeader`** = métadonnées utiles seulement (pas de redondance vue/période/rendu déjà choisis à l’écran). **Calendriers print** : modale **Noir et blanc** / **Couleurs** — **`ListeActivites`** + **`DetailsSejourMenus`** (`couleurFondCarteMenuPourTypeRepas`, preset **`menusGrid`**). **Erreurs routes** : **`routeError.ts`**.

Mise à jour mémoire : commande **`/maj`** ; détail dans `docs/ai/` ; garder ce fichier entre 10 et 20 lignes. Dernière MAJ : **2026-06-07** (impression menus + allègement métadonnées print).
