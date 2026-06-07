# AI Memory Bank — Enjoy Front

Index court : ne pas lire toute la Memory Bank par défaut. Pour une question ciblée, ouvrir directement le fichier source ou la fiche concernée.

Fiches utiles :
- `docs/ai/contexte-global-stack.md` : stack, tooling, structure.
- `docs/ai/contexte-actif.md` : journal récent et phase courante.
- `docs/ai/decisions-architecturales.md` : patterns React, loaders, formulaires, services.
- `docs/ai/etat-projet.md` : contrat API, services, glossaire.
- `docs/ai/documentation-ui-routing.md` : routes, navigation, accès.
- `docs/ai/roadmap.md` : suivi des tâches.

Rappels essentiels : réponses en français ; paquets avec `pnpm` ; secrets / `.env*` / dumps interdits ; types partagés dans `src/types/api.d.ts`. **Auth 401** : redirect **`/`**. **Impression** : **`src/print/`**. **Moments** : hiérarchie **`construireArbreMoments.ts`**, conflits **`idsEnConflit`**. **Modale activité** : **`verifierDisponibiliteLieuActivite`** + **`premierConflitAnimateurActiviteInterne`**. **Enfants participants activité** : modale dédiée **`ActiviteEnfantsParticipantsModal`** (icône vue liste + calendrier), **`enfantIds`** / **`ActiviteDto.enfants`**, helpers **`listeActivitesUtils`** ; pas de gestion dans la modale CRUD activité.

Mise à jour mémoire : commande **`/maj`** ; détail dans `docs/ai/` ; garder ce fichier entre 10 et 20 lignes. Dernière MAJ : **2026-06-07** (activités — enfants participants, modale dédiée).
