# AI Memory Bank — Enjoy Front

Index court : ne pas lire toute la Memory Bank par défaut. Pour une question ciblée, ouvrir directement le fichier source ou la fiche concernée.

Fiches utiles :
- `docs/ai/contexte-global-stack.md` : stack, tooling, structure.
- `docs/ai/contexte-actif.md` : journal récent et phase courante.
- `docs/ai/decisions-architecturales.md` : patterns React, loaders, formulaires, services.
- `docs/ai/etat-projet.md` : contrat API, services, glossaire.
- `docs/ai/documentation-ui-routing.md` : routes, navigation, accès.
- `docs/ai/roadmap.md` : suivi des tâches.

Rappels essentiels : réponses en français ; paquets avec `pnpm` ; secrets / `.env*` / dumps interdits ; types partagés dans `src/types/api.d.ts`; backend à consulter seulement si la tâche touche le contrat API. **Connexion / routing** : **`connexionShouldRevalidate`** (pas de revalidation loader `/` après POST login) ; **`createBrowserRouter`** au niveau module dans **`App.tsx`** ; plus de **`<Navigate>`** redondant dans **`Connexion`** — évite triple exécution de **`detailsSejourLoader`**. **Erreurs routes / API** : **`helpers/routeError.ts`**, **`ErreurAffichage`**, loaders → **`throwRouteLoaderError`**. **Réunions (vue générale)** : **`detailsSejourLoader.reunions`** → **`SectionReunionsSejour`** (`initialReunions`).

Mise à jour mémoire : utiliser la règle `.cursor/rules/10-memory-bank.mdc`, recouper avec le code réel et placer les détails dans `docs/ai/`. Garder ce fichier entre 10 et 20 lignes.
