# AI MEMORY BANK (frontend — Enjoy)

Point d’entrée pour le contexte projet — **volontairement court** : le détail et les journaux longs restent dans [`docs/ai/`](docs/ai/) ; toute mise à jour se fait **en recoupant le code** (`git`, `src/`, services, types), pas en gonflant ce fichier.

**Important (IA)** : ce pivot seul ne suffit pas. Lire aussi [`docs/ai/contexte-actif.md`](docs/ai/contexte-actif.md) et [`docs/ai/decisions-architecturales.md`](docs/ai/decisions-architecturales.md), puis les autres fiches selon la tâche.

**Dernière revue Memory Bank (2026-05-11, alignement [`.cursorrules`](.cursorrules)) :** **Git** — **`HEAD`** **`a14e3e5`** ; **`master`** = **`origin/master`** au dernier checkout ; **working tree** à recouper avec **`git status`** (suite possible sur **`ListePlanningsOrganisation*`**, **`DetailsSejourOrganisation.tsx`**, **`sejour-planning-grille.service.ts`**, **`api.d.ts`**). **Synthèse** — **Planning organisation**, cellules **contenu `MEMBRE_EQUIPE`** sans **`GESTION_SEJOURS`** : **`PATCH …/cellules/{jour}/ma-presence`** (**`modifierMaPresenceCelluleMembreEquipe`**, type **`ModifierMaPresenceCelluleMembreEquipeRequest`**) au lieu du **PUT** sur la liste complète ; **`tokenUtilisateurConnecte`** (JWT **`sub`**) depuis **`DetailsSejourOrganisation`** ; modale liste **`membresListeModaleCelluleMembreEquipe`** (soi **+ autres déjà présents sur la case** uniquement), **`.membreCheckboxLabelMuted`** pour les autres entrées lecture seule. *Antérieurement (2026-05-10) :* historique activités/planning (**`HistoriqueModificationListeModal`**, **`parseDate`**, « **Vide** »), rappel post-suppression **dans la case** calendrier — [`docs/ai/contexte-actif.md`](docs/ai/contexte-actif.md). *Révision (2026-05-08) :* **Sanitaire** — détail journal 08/05.

**Révision précédente (2026-05-05) — Suppression : remontée systématique des erreurs API et affichage dans la modal** : **`Liste.tsx`** (composant générique) gère désormais l’erreur de suppression côté UI : la modale de confirmation reste ouverte, la modale **« Suppression réussie »** n’apparaît plus en cas d’échec, et le message extrait de la réponse (`error.message` provenant de **`adaptAxiosError`** — couvre le **`{"error":"Access Denied"}`** renvoyé par le backend sur 403, ainsi que les 409 / 400 métier) est affiché dans un encart rouge (`deleteErrorMessage` dans **`Liste.module.scss`**). Bouton **Confirmer** désactivé pendant l’appel (libellé « Suppression... »), bouton « Annuler » devient « Fermer » quand une erreur est affichée. **Wrappers `onDelete`** corrigés pour propager l’exception au lieu d’avaler l’erreur dans un `console.error` : **`Equipe.tsx`** (`handleDeleteMembre`), **`TableauUtilisateurs.tsx`** (`handleDefaultDelete`), **`ListeEnfants.tsx`** (`handleDeleteEnfant`). **Antérieurement (même jour)** : *Séjours par utilisateur — endpoint élargi & renommages* — passage à **`GET /sejours/utilisateur/{utilisateurTokenId}`** (ADMIN, **DIRECTION**, **BASIC_USER**) ; **`sejour.service.ts`** : **`getAllSejoursByUtilisateur`** (ex‑`getAllSejoursByDirecteur`). **Renommages UI** : dossier **`src/Pages/_Directeur/`** → **`src/Pages/_Sejours/`** ; **`ListeSejoursDirecteur/ListeSejoursDirecteur.tsx`** → **`MesSejours/MesSejours.tsx`** ; loader **`mesSejoursLoader`**. **Routes** **`/directeur/sejours[...]`** → **`/mes-sejours[...]`** ; **`ProtectedRoute`** des routes séjour = **`[RoleSysteme.DIRECTION, RoleSysteme.BASIC_USER]`**. **`Header.tsx`** : drapeau **`isParticipantSejour`** ; **`useMatch`** / liens internes (`ListeGroupes`, `ListeEnfants`, `DossierEnfant`, `DetailsSejour*`, **`DetailsSejourAccordionItem`**) tous bascules sur **`/mes-sejours/:id*`**. *Suppression de groupe* — affichage du message d'erreur backend dans la modal (**`ListeGroupes.tsx`**, extraction via **`adaptAxiosError`**). **Séquence planning calendrier (2026-05-04)** (trois commits) : (**1**) **`src/components/PlanningCalendrier/`** — primitives partagées. (**2**) **Activités** — **`ListeActivites.tsx`**, **`ListeActivitesCalendrier.tsx`**, **`ListeActivites.module.scss`**. (**3**) **Menus séjour** — **`DetailsSejourMenus.tsx`**, **`DetailsSejourMenus.module.scss`**, extraction formulaire **`MenuRepasFormulaireCorps`** (**`components/Menus/`**), helper métier **`helpers/menuRepas.ts`**. (**4**) **Préférences d’affichage (local navigateur)** — **`helpers/menuRepasAffichageSejour.ts`**, **`ParametrageAffichageMenus.tsx`** ; **`DetailsSejourParametrage`** : **6** accordéons réordonnables. Journal : [`docs/ai/contexte-actif.md`](docs/ai/contexte-actif.md).

**Récapitulatif antérieur — Menus & références alimentaires (détail séjour)** : sous-route **`/mes-sejours/:id/menus`** → **`DetailsSejourMenus`** + **`DetailsSejourMenus.module.scss`**. **Header** : segment **Menus** (`FaUtensils`) entre **Activités** et **Paramétrage**. **Référentiel** : **`ListeReferencesAlimentaires`** (+ SCSS) sur **Paramétrage** (accordéon dédié), pas uniquement depuis l’onglet Menus. **`references-alimentaires.service.ts`**, **`sejour-menu.service.ts`** ; helpers **`dateIsoLocal.ts`**, **`optionsReferencesAlimentaires.ts`** ; **`api.d.ts`**. **Dossier enfant** : sous-route imbriquée sous **`sejour-detail`** **`/mes-sejours/:id/enfants/:enfantId/dossier`** (**`App.tsx`**), **`Pages/_Sejours/DossierEnfant/DossierEnfant.tsx`** — loader **`dossierEnfantLoader`** (`getDossierEnfant` + `getEnfantsDuSejour`, normalisation tableaux **`allergenes`** / **`regimesEtPreferences`**), lecture **`ReferenceAlimentaireDto`** (tri **`ordre`** pour l’affichage), édition via **`DossierEnfantForm`** et **`Form`** / **`Form.module.scss`** ; navigation retour avec **`location.state`** (**`openAccordion`**, **`expandedGroupeId`**). **`DetailsSejourParametrage`** : Lieux, Moments, Horaires, Types d’activité, références, affichage menus.

Synthèse du protocole § « AI MEMORY BANK PROTOCOL » et § « Post-commit / Post-push » :

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
- **React** : React Compiler (`babel-plugin-react-compiler`) — ne pas utiliser manuellement `useMemo` / `useCallback` sauf exceptions documentées (voir `.cursorrules` + `decisions-architecturales.md`).
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
