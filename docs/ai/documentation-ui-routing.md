# Documentation UI — routes & navigation

## Navigation & routes

- Routes protégées via `ProtectedRoute.tsx` et Redux pour l'état d'authentification.
- Routes définies dans `App.tsx` avec `createBrowserRouter`.
- Routes principales :
  - `/` : Page de connexion ; **loader** si déjà authentifié : **`chargerProfilEtCheminAccueil()`** (**`profil`** chargé puis **`Navigate`** HTTP vers **`/mes-sejours/{dernierId}`** si utilisateur **DIRECTION** ou **BASIC_USER** **et** un dernier séjour est mémorisé (**`localStorage`** **`enjoy.dernierSejourId.{sub}`**, posé depuis **`Header`** à l’affichage du détail séjour) ; sinon **`/profil`**. **`loginAction`** (`Connexion`) : même logique après **`saveAccessToken`** ; **`Navigate`** côté client si déjà connecté : **`cheminAccueilDepuisEtatActuel`** (profil Redux déjà disponible → pas d’appel réseau). **ADMIN** sans route **`mes-sejours`** → **`/profil`**.
  - `/profil` : Page de profil utilisateur (accessible à tous les utilisateurs connectés) — **`Profil.tsx`** : édition champ par champ ; **email** modifiable **ADMIN** uniquement (auto-modification) ; **DIRECTION** / **BASIC_USER** : email lecture seule + message **`getEmailReadOnlyMessage`** ; autres champs personnels modifiables ; **`role`** / **`dateExpirationCompte`** non éditables ici
  - `/utilisateurs` : Liste des utilisateurs (ADMIN uniquement) — édition via **`UserForm`** sans **`sejourId`** : **email**, **`role`**, **`dateExpirationCompte`** éditables
  - `/sejours` : Liste de **tous** les séjours (ADMIN uniquement)
  - `/mes-sejours` : Liste des séjours de l'utilisateur connecté — **DIRECTION** (séjours dont il est directeur) ou **BASIC_USER** (séjours dont il est membre d'équipe). Loader `mesSejoursLoader` → `sejourService.getAllSejoursByUtilisateur()` → `GET /sejours/utilisateur/{utilisateurTokenId}` (l'API filtre selon le rôle, l'ADMIN reçoit tous les séjours mais cette route ne lui est pas servie)
  - `/mes-sejours/:id` : Détail séjour — **index** = vue générale (`DetailsSejourOverview`), loader `detailsSejourLoader`, id de route **`sejour-detail`**
  - `/mes-sejours/:id/organisation` : Liste des **plannings organisation** (`DetailsSejourOrganisationLayout` → `DetailsSejourOrganisation`, route **`index`** sous **`organisation`**)
  - `/mes-sejours/:id/organisation/:grilleId` : **Éditeur** de grille pleine page (même composant **`DetailsSejourOrganisation`**, paramètre **`grilleId`**)
  - `/mes-sejours/:id/activites` : Même loader parent ; **Activités** (`DetailsSejourActivites` / `ListeActivites`)
  - `/mes-sejours/:id/menus` : Même loader parent ; **Menus repas** (`DetailsSejourMenus`)
  - `/mes-sejours/:id/sanitaire` : Même loader parent ; **dossiers sanitaires agrégés** du séjour (`DetailsSejourSanitaire` → `ListeSanitaireDossiers`, colonnes optionnelles + filtres métier ; API **`GET /sejours/{sejourId}/dossiers-enfants`**)
  - `/mes-sejours/:id/parametrage` : Même loader parent ; **Paramétrage** (`DetailsSejourParametrage`) — réservé au **directeur du séjour** ou à un **adjoint** (`peutGererMembresEquipeSejour` : segment **Header** absent et **`Navigate`** vers la vue générale sinon). Lieux, Moments, Horaires, Types d’activité, **Références alimentaires**, **Affichage des menus** (préférences locales navigateur pour l’onglet Menus).
  - `/mes-sejours/:id/enfants/:enfantId/dossier` : Dossier d’un enfant — même arbre **`sejour-detail`** ; loader **`dossierEnfantLoader`**, composant **`DossierEnfant`** (DIRECTION ou BASIC_USER participant au séjour)
- Permissions des routes `/mes-sejours/*` : **`[RoleSysteme.DIRECTION, RoleSysteme.BASIC_USER]`** (l'API filtre les séjours selon le rôle ; un BASIC_USER ne voit que les séjours où il est membre d'équipe).
- Utilisation de `useNavigate` pour la navigation programmatique.
- Actions React Router pour les formulaires (ex: `loginAction` dans `Connexion.tsx`).
- Layout (`Layout.tsx`) :
  - Header affiché uniquement si `pathname !== "/"` et `role !== null`
  - Pour les rôles **DIRECTION** et **BASIC_USER** sur `/mes-sejours/:id*`, le **Header** utilise **`useMatch`** + **`useRouteLoaderData("sejour-detail")`** (données valides, pas `Error`) pour le **fil** (nom du séjour en pill), les segments **Vue générale** / **Organisation** / **Activités** / **Menus** / **Sanitaire** et (**si directeur ou adjoint du séjour**) **Paramétrage**, ainsi que le lien **Mes séjours** (`Header.tsx`, drapeau interne **`isParticipantSejour`**)
  - Footer actuellement commenté
  - Gestion automatique du padding-top du body selon la route
  - Récupération automatique du profil utilisateur si connecté mais rôle manquant dans Redux (avec gestion d'erreur 401 → logout)

Structure des dossiers pages et conventions de loaders : voir [decisions-architecturales.md](decisions-architecturales.md) et [contexte-global-stack.md](contexte-global-stack.md).
