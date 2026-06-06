# AI Memory Bank — Enjoy Front

Index court : ne pas lire toute la Memory Bank par défaut. Pour une question ciblée, ouvrir directement le fichier source ou la fiche concernée.

Fiches utiles :
- `docs/ai/contexte-global-stack.md` : stack, tooling, structure.
- `docs/ai/contexte-actif.md` : journal récent et phase courante.
- `docs/ai/decisions-architecturales.md` : patterns React, loaders, formulaires, services.
- `docs/ai/etat-projet.md` : contrat API, services, glossaire.
- `docs/ai/documentation-ui-routing.md` : routes, navigation, accès.
- `docs/ai/roadmap.md` : suivi des tâches.

Rappels essentiels : réponses en français ; paquets avec `pnpm` ; secrets / `.env*` / dumps interdits ; types partagés dans `src/types/api.d.ts`. **Header** : burger **&lt; 1400px** ; **`--site-header-height`** ; lien **Profil** = `Prénom (rôle)` via **`libelleRoleBadgeProfil`**. **Rôle affiché** : séjour en contexte (**`headerSejourContext`**) → rôle sur le séjour (**`libelleRoleSurSejour.ts`**) ; sinon rôle système ; **ADMIN** → **Admin**. **Profil** : carte circulaire + badge rôle (même logique). **Vue générale** : accordéons **fermés**. **Impression** : **`src/print/`** — en-tête répété **Titre — n/N** (**13pt gras**) ; **`PrintDocumentHeader`** = métadonnées seules ; listes **`ListeEnfants`** / **`TableauUtilisateurs`** ; plannings **`ListePlanningsOrganisation`** (fenêtre **1/3/7 j** affichée). **Sanitaire — dossiers** : barre **`optionsBar`** (filtres **OU**, case **Tout**). **Tri** : **`trierUtilisateurs.ts`** ; groupes : **`SelectionGroupesParType`**. **Erreurs routes** : **`routeError.ts`**.

Mise à jour mémoire : commande **`/maj`** (`.cursor/commands/maj.md`) ou règle `.cursor/rules/10-memory-bank.mdc` ; détail dans `docs/ai/` ; garder ce fichier entre 10 et 20 lignes.
