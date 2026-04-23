# État du projet — alignement API & inventaire

## Tests, dette, modules sensibles

- Couverture de tests : non centralisée dans cette fiche ; modules volumineux / sensibles : **`ListePlanningsOrganisation.tsx`**, **`ListeActivites.tsx`**, loaders **`detailsSejourLoader`**, services sous `services/sejour-*.ts`.
- Points ouverts : voir [roadmap.md](roadmap.md) (plannings avancés, virtualisation des listes si besoin).

## Résumé d’alignement avec enjoyApi (voir fiche backend pour le détail)

> Référence backend : [`../../../enjoyApi/AI_MEMORY.md`](../../../enjoyApi/AI_MEMORY.md). Doc REST côté API : à lier depuis le dépôt enjoyApi (ex. `documentation-api-rest.md`) sans tout dupliquer ici.

- **Stack backend (rappel)** : Java 21, Spring Boot 3.5.6, API sous `/api/v1`, erreurs centralisées (`GlobalExceptionHandler`, etc.) — détail dans `enjoyApi/AI_MEMORY.md`.
- **Activités** (`/sejours/{sejourId}/activites`) : `CreateActiviteRequest` / `UpdateActiviteRequest` exigent **`membreTokenIds`** et **`groupeIds` non vides**, et **`typeActiviteId`** (type du **même séjour**) ; chaque `groupeId` doit être un groupe **du même séjour**. **Date** : doit être dans la période **calendaire** `dateDebut`–`dateFin` du séjour (inclus) ; sinon le backend renvoie une erreur métier (ex. `IllegalArgumentException` → 400). **Animateurs** : le **directeur du séjour** peut figurer dans `membreTokenIds` même sans entrée dans l’équipe (`SejourEquipe`) ; les **autres** tokens doivent correspondre à des membres de l’équipe du séjour. **`lieuId`** optionnel : occupation du lieu **par jour et moment** selon règles backend (lieu non partageable = une activité ce jour/créneau ; partageable = plafond `nombreMaxActivitesSimultanees`) ; **`avertissementLieu`** peut être renvoyé sur la réponse POST/PUT (lieu déjà utilisé le même jour mais partage autorisé). Voir `enjoyApi/AI_MEMORY.md` (occupation lieu, `ActiviteDto`, **`TypeActivite`**).
- **Lieux** (`/sejours/{sejourId}/lieux`) : **`SaveLieuRequest`** / **`LieuDto`** incluent **`partageableEntreAnimateurs`** et **`nombreMaxActivitesSimultanees`** (obligatoire et ≥ 2 si partage ; sinon `null`). Validation côté API (400 si incohérent).
- **Équipe** : lors du `DELETE /sejours/{id}/equipe/{membreTokenId}`, le backend **retire automatiquement** ce membre des **référents** de tous les groupes du séjour (à garder en tête pour l’UI : pas seulement « hors équipe », aussi « plus référent »).
- **Types TS** : `ActiviteDto` (**`moment`**, **`typeActivite`**, **`lieu`**, **`avertissementLieu`**, **`groupeIds`**), `CreateActiviteRequest` / `UpdateActiviteRequest` (**`lieuId`**, **`momentId`**, **`typeActiviteId`** obligatoire ; **`null`** sur `lieuId` en mise à jour retire le lieu), **`TypeActiviteDto`** / **`SaveTypeActiviteRequest`**, **`MomentDto`** / **`SaveMomentRequest`**, **`HoraireDto`** / **`SaveHoraireRequest`** (libellé format `6h00`–`23h59`), `LieuDto` / `SaveLieuRequest` (**partage**) dans `api.d.ts` — section **Types d’activité** (par séjour) documentée avant **Activités** lorsque pertinent.
- **Horaires** (`/sejours/{sejourId}/horaires`) : libellés d’heure par séjour (ex. `8h30`). **`SaveHoraireRequest.libelle`** : pattern aligné **`Horaire.LIBELLE_HORAIRE_PATTERN`** côté API ; unicité par séjour **insensible à la casse** → **409** si doublon. Pas de lien avec **`Activite`** dans l’API à ce stade (suppression sans garde-fou métier). Voir `enjoyApi/AI_MEMORY.md` (endpoints horaires).
- **Plannings direction (grilles)** (`/sejours/{sejourId}/planning-grilles`) : **`PlanningGrille`**, **`PlanningLigne`**, **`PlanningCellule`** — détail des entités, `sourceLibelleLignes` / `sourceContenuCellules`, tests côté API dans `enjoyApi/AI_MEMORY.md` ; doc backend **`enjoyApi/docs/planning-grilles-api.md`**.

## Alignement types front

- Types partagés : `src/types/api.d.ts` — rester aligné avec les DTO / payloads documentés côté API.
- Références utilisateur côté JSON : **`tokenId`**, pas l’id SQL interne (conventions enjoyApi).

## Services API (inventaire)

- **caller.service.ts** : Instance Axios configurée avec intercepteurs
  - Base URL : `import.meta.env.VITE_API_URL` ou `http://localhost:8080/api/v1` par défaut
  - Intercepteur request : Ajoute automatiquement le token Bearer si l'utilisateur est connecté
  - Intercepteur response : Gère le refresh token automatique sur 401 (sauf si header `X-Skip-Token-Refresh` présent)
  - `withCredentials: true` activé par défaut pour les cookies
- **account.service.ts** : Gestion de l'authentification
  - `login()` : Connexion avec header `X-Skip-Token-Refresh`
  - `addUser()` : Inscription avec header `X-Skip-Token-Refresh`
  - `refreshAccessToken()` : Rafraîchissement du token d'accès
  - `getTokenInfo()` : Décodage du JWT pour récupérer les infos utilisateur
  - `saveAccessToken()` : Sauvegarde du token chiffré dans localStorage avec CryptoJS
  - `getToken()` : Récupération et déchiffrement du token depuis localStorage
  - `logout()` : Suppression du token et nettoyage du store Redux
  - `isLogged()` : Vérification de la présence d'un token
- **sejour.service.ts** : CRUD des séjours uniquement
  - `getAllSejours()`, `getSejourById()`, `getAllSejoursByDirecteur()`, `addSejour()`, `updateSejour()`, `deleteSejour()`
  - Tri automatique de l'équipe par nom dans `getSejourById()`
  - Utilise `validateResponseStatus` et `adaptAxiosError` de `helpers/axiosError.ts`
- **sejour-equipe.service.ts** : Gestion de l'équipe d'un séjour
  - `ajouterNouveauMembreEquipe()`, `ajouterMembreExistantEquipe()`, `modifierRoleMembreEquipe()`, `supprimerMembreEquipe()`
- **sejour-enfant.service.ts** : Gestion des enfants d'un séjour
  - `getEnfantsDuSejour(sejourId)` : Liste triée par nom via `trierEnfantsParNom`
  - `getDossierEnfant()`, `updateDossierEnfant()` : Dossier enfant (contrôle d'accès 403 si non participant)
  - `creerEtAjouterEnfant()`, `modifierEnfant()`, `supprimerEnfantDuSejour()`, `supprimerTousLesEnfants()`
  - `getExcelImportSpec(sejourId)` : Récupère la notice d'import Excel (colonnes obligatoires, optionnelles, mots-clés, formats) — `GET /sejours/{sejourId}/enfants/import/spec`
  - `importerEnfantsExcel()` : Import Excel (FormData, retourne `ExcelImportResponse`)
  - Gestion erreurs validation (400) avec `preserveResponseData: true` pour les formulaires
- **sejour-groupe.service.ts** : Gestion des groupes d'un séjour (export `sejourGroupeService`)
  - `getGroupesDuSejour(sejourId)`, `getGroupeById(sejourId, groupeId)`
  - `creerGroupe(sejourId, request)` : Crée un groupe (POST). Pour AGE/NIVEAU_SCOLAIRE, le backend ajoute automatiquement les enfants. Fallback frontend si groupe créé vide.
  - `modifierGroupe()`, `supprimerGroupe()`, `ajouterEnfantAuGroupe()`, `retirerEnfantDuGroupe()`
  - `ajouterReferent(sejourId, groupeId, request)` : `POST /sejours/{sejourId}/groupes/{groupeId}/referents` — body `AjouterReferentRequest` (`referentTokenId`)
  - `retirerReferent(sejourId, groupeId, referentTokenId)` : `DELETE /sejours/{sejourId}/groupes/{groupeId}/referents/{referentTokenId}`
- **sejour-activite.service.ts** : Activités d’un séjour (export `sejourActiviteService`)
  - `getActivitesDuSejour(sejourId)` : `GET /sejours/{sejourId}/activites` (réponses avec **`moment`**, **`lieu`** ; **`avertissementLieu`** souvent `null` hors POST/PUT)
  - `getActiviteById(sejourId, activiteId)` : `GET /sejours/{sejourId}/activites/{activiteId}`
  - `creerActivite(sejourId, request)` : POST, attend 201, body peut inclure **`lieuId`**, **`momentId`** ; réponse peut contenir **`avertissementLieu`**
  - `modifierActivite()`, `supprimerActivite()` : PUT (peut envoyer **`lieuId: null`**, **`momentId`**) / DELETE (204 attendu pour suppression)
- **sejour-moment.service.ts** : Moments d’un séjour (export `sejourMomentService`)
  - `getMomentsDuSejour(sejourId)` : `GET /sejours/{sejourId}/moments`
  - `getMomentById(sejourId, momentId)` : `GET /sejours/{sejourId}/moments/{momentId}`
  - `creerMoment(sejourId, request)` : POST, attend 201, body `SaveMomentRequest` (`nom`)
  - `modifierMoment(sejourId, momentId, request)` : PUT
  - `supprimerMoment(sejourId, momentId)` : DELETE, attend 204
  - `reordonnerMoments(sejourId, request)` : `PUT /sejours/{sejourId}/moments/reorder`, attend 200, body `ReorderMomentsRequest`, retourne `MomentDto[]`
- **sejour-lieu.service.ts** : Lieux d’un séjour (export `sejourLieuService`)
  - `getLieuxDuSejour(sejourId)`, `getLieuById(sejourId, lieuId)` : GET (erreurs propagées / console)
  - `creerLieu(sejourId, request)` : POST, attend 201 (`SaveLieuRequest` incl. **partage**)
  - `modifierLieu(sejourId, lieuId, request)` : PUT
  - `supprimerLieu(sejourId, lieuId)` : DELETE, attend 204
- **sejour-horaire.service.ts** : Horaires d’un séjour (export `sejourHoraireService`)
  - `getHorairesDuSejour(sejourId)` : `GET /sejours/{sejourId}/horaires` (ordre id côté API ; l’UI applique **`trierHorairesChronologiquement`**)
  - `getHoraireById(sejourId, horaireId)` : `GET .../horaires/{horaireId}`
  - `creerHoraire(sejourId, request)` : POST, attend 201, body `SaveHoraireRequest`
  - `modifierHoraire(sejourId, horaireId, request)` : PUT (409 si libellé déjà pris par un autre horaire du séjour)
  - `supprimerHoraire(sejourId, horaireId)` : DELETE, attend 204
- **sejour-planning-grille.service.ts** : Plannings **organisation** (grilles) par séjour (export `sejourPlanningGrilleService`) — préfixe **`/sejours/{sejourId}/planning-grilles`**
  - `listerGrilles(sejourId)` : GET — résumés **`PlanningGrilleSummaryDto`**
  - `getGrilleDetail(sejourId, grilleId)` : GET — **`PlanningGrilleDetailDto`** (lignes, cellules, `sourceLibelleLignes`, `sourceContenuCellules`, etc.)
  - `creerGrille` / `modifierGrille` / `supprimerGrille` : POST (201) / PUT / DELETE sur la grille
  - `creerLigne` / `modifierLigne` / `supprimerLigne` : sous-ressource lignes
  - `remplacerCellules` : mise à jour des cellules d’une ligne
- **utilisateur.service.ts** : Gestion des utilisateurs
  - Tri automatique par nom dans plusieurs méthodes (`getAllUsers()`, `getDirecteurs()`, `getEquipeBySejour()`)
  - Fonctions de formatage des rôles selon le genre : `getRoleSystemeByGenre()`, `getRoleSejourByGenre()`
  - Recherche par email : `getUserByEmail()` (retourne null si 404, throw Error si 400)
  - `getUser()` : Récupère le profil utilisateur et met à jour le store Redux automatiquement
  - `updateUser()` : Mise à jour d'un utilisateur avec header `X-Skip-Token-Refresh`
  - `changePassword()` : Changement de mot de passe (utilise `adaptAxiosError`)
  - Utilise `adaptAxiosError` et `validateResponseStatus` pour `deleteUser()` et `changePassword()`

## Glossaire

- **Directeur :** Rôle utilisateur (`RoleSysteme.DIRECTION`) gérant des séjours spécifiques. Accès aux pages `/directeur/*`.
- **Admin :** Super-utilisateur (`RoleSysteme.ADMIN`) gérant l'ensemble de la plateforme. Accès aux pages `/utilisateurs`, `/sejours`.
- **Séjour :** Entité principale du système contenant nom, description, lieu, dates, équipe, enfants, plannings.
- **Équipe :** Liste des utilisateurs assignés à un séjour (composant `Equipe.tsx`).
- **Enfant :** Entité représentant un enfant avec ses informations personnelles (nom, prénom, genre, date de naissance, niveau scolaire). Un enfant peut être réutilisé dans plusieurs séjours. Composants : `ListeEnfants.tsx`, `AddEnfantForm.tsx`, `ImportExcelEnfants.tsx`.
- **Groupe :** Regroupement d'enfants d'un séjour. Types : THEMATIQUE (manuel), AGE (tranche d'âge), NIVEAU_SCOLAIRE (tranche de niveau). Composants : `ListeGroupes.tsx`, `CreateGroupeForm.tsx`. Service : `sejour-groupe.service.ts` (export `sejourGroupeService`). Pour AGE/NIVEAU_SCOLAIRE, ajout automatique à la création (backend) ou fallback frontend ; bouton « Ajouter les enfants de la tranche » pour ajouter en masse les enfants correspondants.
- **Référent (groupe) :** Membre de l'équipe du séjour associé à un groupe comme point de contact. Géré via `ReferentsSelector` + appels `ajouterReferent` / `retirerReferent` ; listé dans `GroupeDto.referents` (`ReferentInfos`).
- **Dossier enfant :** Informations complémentaires d'un enfant (contacts parents, infos médicales, PAI, alimentaires, traitements). Page dédiée `DossierEnfant` accessible via l'icône dossier dans `ListeEnfants`. Route : `/directeur/sejours/:sejourId/enfants/:enfantId/dossier`. Accès réservé aux participants du séjour (directeur ou membre de l'équipe).
- **Loader :** Fonction asynchrone React Router pour charger les données avant le rendu de la page. Exemple : `detailsSejourLoader` (route id **`sejour-detail`**) charge le séjour, les enfants, les groupes, les lieux, les **moments**, les **horaires**, les activités, les **types d’activité** (`Promise.all` : `sejourService`, `sejourEnfantService`, `sejourGroupeService`, `sejourLieuService`, **`sejourMomentService`**, **`sejourHoraireService`**, `sejourActiviteService`, **`sejourTypeActiviteService`**) et en parallèle **`sejourPlanningGrilleService.listerGrilles(sejourId)`** — donnée retournée **`planningGrilles`** ; en cas d’échec : liste vide + `console.warn`.
- **Moment (séjour) :** Créneau nommé rattaché au séjour (ex. matin, après-midi). `MomentDto` (**`ordre`** pour l’ordre d’affichage) ; CRUD + **réordonnancement** (`reordonnerMoments`) via `ListeMoments` et `sejourMomentService`. Les **activités** référencent un moment (`ActiviteDto.moment`, `momentId`) ; sans au moins un moment, l’UI bloque la création d’activités jusqu’à en créer un.
- **Horaire (séjour) :** Libellé d’heure rattaché au séjour (ex. `8h30`, format `6h00`–`23h59`). `HoraireDto` ; CRUD via `ListeHoraires` et `sejourHoraireService`. Affichage trié chronologiquement (`trierHorairesChronologiquement`). Non référencé par les **activités** dans l’API à ce stade.
- **Lieu (séjour) :** Espace ou salle rattaché au séjour (`LieuDto` : nom, `EmplacementLieu`, capacité max optionnelle **`nombreMax`**, **partage** : **`partageableEntreAnimateurs`**, **`nombreMaxActivitesSimultanees`** si partage ≥ 2). UI : `ListeLieux.tsx` ; API : `sejour-lieu.service.ts`.
- **Activité (séjour) :** Action planifiée (date dans l’intervalle du séjour, nom, description, **créneau** `moment` / `momentId`, **au moins un groupe** `groupeIds`, **au moins un animateur** `membreTokenIds`, **lieu optionnel** `lieuId` / `ActiviteDto.lieu`). Le directeur peut être animateur hors équipe ; les autres doivent être dans l’équipe. Conflits **occupation lieu** gérés par l’API (400) ; **`avertissementLieu`** possible sur la réponse création/mise à jour. UI : module **`ListeActivites*.tsx`** (liste + calendrier) sur **`DetailsSejourActivites`** (route **`/activites`**) ; API : `sejour-activite.service.ts`.
- **Planning organisation (grille) :** Grille de planning **direction** pour un séjour (lignes × jours du séjour, cellules : horaire, moment, groupe, lieu, saisie libre ou membres d’équipe selon `sourceContenuCellules`). API : **`sejour-planning-grille.service.ts`** ; types **`PlanningGrilleDetailDto`**, **`PlanningGrilleSummaryDto`**, **`PlanningLigneDto`**, **`PlanningCelluleDto`**, requêtes `SavePlanningGrille*`, `SavePlanningLigneRequest`, `PlanningCellulePayload`, etc. dans **`api.d.ts`**. UI : **`ListePlanningsOrganisation`** dans le panneau accordéon **`10`** de **`DetailsSejourOverview`** (props **`grilles`** depuis le loader, **`enumererJoursSejour`**, `sejourId`, `dateDebut` / `dateFin`, équipe + directeur pour cellules « membre »). Distinct du **calendrier des activités** (`ListeActivitesCalendrier`).
- **Action :** Fonction React Router pour gérer les soumissions de formulaires (ex: `loginAction`).
