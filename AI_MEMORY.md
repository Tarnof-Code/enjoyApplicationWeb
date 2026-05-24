# AI MEMORY BANK (frontend — Enjoy)

Point d’entrée pour le contexte projet — **volontairement court** : le détail et les journaux longs restent dans [`docs/ai/`](docs/ai/) ; toute mise à jour se fait **en recoupant le code** (`git`, `src/`, services, types), pas en gonflant ce fichier.

**Important (IA)** : ce pivot seul ne suffit pas. Lire aussi [`docs/ai/contexte-actif.md`](docs/ai/contexte-actif.md) et [`docs/ai/decisions-architecturales.md`](docs/ai/decisions-architecturales.md), puis les autres fiches selon la tâche.

**Dernière revue Memory Bank (2026-05-24, lecture [`.cursorrules`](.cursorrules) et recoupement `git` / `src`) :** **`HEAD`** **`3ae7d47`** ; *working tree* avec changements locaux — recouper avec **`git status`** / **`git diff`** (ex. module **comptes rendus réunion**). **Synthèse** — Vue générale **`DetailsSejourOverview`** : accordéons ids **`1`–`5`**, ordre défaut (**`OVERVIEW_ACCORDION_IDS`**) Réunions en **2ᵉ** position (+ migration ancien LS `1→2→3→4→5`). **Réunions** : dossier **`src/components/ReunionSejour/`** (`SectionReunionsSejour`, `ReunionFormulaireModal`, `ReunionContenuRichText`), **`helpers/reunionTiptapExtensions.ts`**, **`helpers/reunionTipTapTextePourRecherche.ts`** (texte plat pour filtres), **`services/sejour-reunion.service.ts`**, DTO **`ReunionDto`** / **`SaveReunionRequest`** dans **`types/api.d.ts`** ; liste triée **date décroissante** puis **`id`** ; filtres toolbar (à droite du bouton **Nouveau compte rendu** : date ISO, champ recherche ordre du jour + contenu) ; droits **`aDroitGestionCompleteSurSejour`** ; modale confirmation après enregistrement ; styles liste / TipTap (**`SectionReunionsSejour.module.scss`**, **`styles.scss`** curseurs éditeur). Anciennes longues synthèses du pivot (**2026-05-17 sanitaire**, **2026-05-05** Liste/`MesSejours`/planning, récap menus & dossier enfant…) : **`docs/ai/contexte-actif.md`** — ne pas les redépiler ici.

Synthèse du protocole § « AI MEMORY BANK PROTOCOL » et § « Post-commit / Post-push » ([`.cursorrules`](.cursorrules)) :

- **Lecture systématique (début de session ou tâche majeure)** : **`AI_MEMORY.md`** (pivot) → **`docs/ai/contexte-actif.md`** → **`docs/ai/decisions-architecturales.md`** → autres fiches pertinentes (`documentation-ui-routing.md`, `etat-projet.md`, `roadmap.md`, etc.) → **`../enjoyApi/AI_MEMORY.md`** (backend Java : DTOs, patterns API, sync front/back).
- **Demande de mise à jour Memory Bank** (prompt libre) : relire **`.cursorrules`** (point **2** *MISE À JOUR OBLIGATOIRE*), analyser le dépôt (**`git`**, **`src/`**, services, types, loaders), puis **enrichir surtout les fiches `docs/ai/`** ; **`AI_MEMORY.md`** : **ajustement minimal** (pas de surcharge — détail dans les fiches).
- **Mise à jour obligatoire** : fin de tâche ou décision technique → actualiser **la fiche** porte-détail (`contexte-actif.md`, `decisions-architecturales.md`, `etat-projet.md`, `roadmap.md`, …) ; pivot = liens / rappel bref. **Roadmap** : cases à cocher et nouvelles étapes dans **`docs/ai/roadmap.md`**. **Synchronisation backend / API** : si l’API change → **`types/api.d.ts`** et **`docs/ai/etat-projet.md`** (ou fiche dédiée), en lien avec `AI_MEMORY.md` enjoyApi.
- **Réflexivité** : si le code contredit la Memory Bank, signaler — corriger le code ou mettre à jour la mémoire.
- **Post-commit / post-push** : lorsque commit **et** push sont faits → mettre à jour **surtout** les fiches `docs/ai/` concernées, **ajustement minimal** du pivot **et** **`.cursorrules`** si de nouvelles conventions ou composants à documenter ; vérifier si les changements justifient une mise à jour mémoire ou règles.

Journal récent et phase courante : [`docs/ai/contexte-actif.md`](docs/ai/contexte-actif.md). Patterns détaillés (exceptions `useMemo` / `useCallback` avec React Compiler, loaders, formulaires) : [`docs/ai/decisions-architecturales.md`](docs/ai/decisions-architecturales.md). Contrat API / glossaire : [`docs/ai/etat-projet.md`](docs/ai/etat-projet.md).

## Invariants

Les règles obligatoires (langue, lint, stack, patterns métier) sont dans [`.cursorrules`](.cursorrules). En raccourci :

- **Langue** : réponses de l’assistant en français ; **messages de commit Git en anglais**, format détaillé multi-lignes (voir section *Messages de commit* dans `.cursorrules`).
- **Tooling** : **pnpm** pour les paquets ; stack React 19, TypeScript, Vite — respecter ESLint, Prettier, `tsconfig.json`.
- **React** : React Compiler (`babel-plugin-react-compiler`) — ne pas utiliser manuellement `useMemo` / `useCallback` sauf exceptions documentées (voir `.cursorrules` et **`decisions-architecturales.md`**, incl. **`SectionReunionsSejour`**).
- **Données pages** : loaders React Router, `useRouteLoaderData("sejour-detail")` pour le détail séjour, `useRevalidator` après mutations ; détail dans `.cursorrules` et fiches `docs/ai/`.

## Fiches (`docs/ai/`)

| Fichier | Rôle |
|--------|------|
| [contexte-global-stack.md](docs/ai/contexte-global-stack.md) | Stack, tooling, structure du repo |
| [contexte-actif.md](docs/ai/contexte-actif.md) | Phase, journal des changements récents |
| [decisions-architecturales.md](docs/ai/decisions-architecturales.md) | Conventions et choix techniques |
| [etat-projet.md](docs/ai/etat-projet.md) | Tests, dette, sync types / contrat API, services, glossaire |
| [documentation-ui-routing.md](docs/ai/documentation-ui-routing.md) | Routes, écrans, auth, layout |
| [roadmap.md](docs/ai/roadmap.md) | Suivi des tâches |

Index : [docs/ai/README.md](docs/ai/README.md).

## Alignement backend (enjoyApi)

- Types partagés : `src/types/api.d.ts` — rester aligné avec les DTO / payloads documentés côté API.
- Références utilisateur côté JSON : **`tokenId`**, pas l’id SQL interne (voir conventions enjoyApi).
- Architecture & DTOs backend : [`../enjoyApi/AI_MEMORY.md`](../enjoyApi/AI_MEMORY.md).

## Convention de maintenance

- **« Mets à jour `AI_MEMORY.md` »** : ne pas y dupliquer le journal ni les détails fonctionnels — les placer dans la **fiche adéquate** de [`docs/ai/`](docs/ai/) (souvent [`contexte-actif.md`](docs/ai/contexte-actif.md), [`etat-projet.md`](docs/ai/etat-projet.md), [`decisions-architecturales.md`](docs/ai/decisions-architecturales.md), [`roadmap.md`](docs/ai/roadmap.md)). Actualiser ici la **date**, la **synthèse** du pivot et la **table des fiches** si besoin. **Nouvelle fiche** → la lister ici + dans [`docs/ai/README.md`](docs/ai/README.md) (protocole `.cursorrules`).
- Après **commit et push** : vérifier pivot, fiches **`docs/ai/`** et **`.cursorrules`** — section *Post-commit / Post-push* de [`.cursorrules`](.cursorrules).
- **Réflexivité** : si le code contredit une fiche, corriger le code ou mettre à jour la mémoire (voir `.cursorrules`).
