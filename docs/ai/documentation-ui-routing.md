# Documentation UI — routes & navigation

## Navigation & routes

- Routes protégées via `ProtectedRoute.tsx` et Redux pour l'état d'authentification.
- Routes définies dans **`App.tsx`** : instance unique **`createBrowserRouter`** au **niveau module** (pas dans le corps du composant **`App`**) → **`RouterProvider`** seul dans **`App`**.
- Routes principales :
  - `/` : Page de connexion ; **loader** (GET / visite directe) si déjà authentifié : **`chargerProfilEtCheminAccueil()`** (**`getUser`**, puis **`redirect`** HTTP vers **`/mes-sejours/{dernierId}`** si **DIRECTION** / **BASIC_USER** et dernier séjour mémorisé ; sinon **`/profil`**) — **échec `getUser`** → page d’erreur. **`loginAction`** (POST) : même logique après **`saveAccessToken`** ; message réseau via **`NETWORK_ERROR_MESSAGE`**. **`connexionShouldRevalidate`** (`Connexion.tsx`) : **`formMethod === "POST"`** → pas de revalidation du loader `/` (l’action gère déjà redirect + profil — évite une 2ᵉ navigation vers le séjour). **Pas de `<Navigate>` client** sur **`Connexion`** (redondant avec loader + action).
  - `/profil` : Page de profil utilisateur (accessible à tous les utilisateurs connectés) — **`Profil.tsx`** : édition champ par champ ; **email** modifiable **ADMIN** uniquement (auto-modification) ; **DIRECTION** / **BASIC_USER** : email lecture seule + message **`getEmailReadOnlyMessage`** ; autres champs personnels modifiables ; **`role`** / **`dateExpirationCompte`** non éditables ici
  - `/utilisateurs` : Liste des utilisateurs (ADMIN uniquement) — édition via **`UserForm`** sans **`sejourId`** : **email**, **`role`**, **`dateExpirationCompte`** éditables
  - `/sejours` : Liste de **tous** les séjours (ADMIN uniquement)
  - `/mes-sejours` : Liste des séjours de l'utilisateur connecté — **DIRECTION** (séjours dont il est directeur) ou **BASIC_USER** (séjours dont il est membre d'équipe). Loader `mesSejoursLoader` → `sejourService.getAllSejoursByUtilisateur()` → `GET /sejours/utilisateur/{utilisateurTokenId}` (l'API filtre selon le rôle, l'ADMIN reçoit tous les séjours mais cette route ne lui est pas servie)
  - `/mes-sejours/:id` : Détail séjour — **index** = vue générale (`DetailsSejourOverview`), loader **`detailsSejourLoader`** ( **`Promise.all`** : séjour, enfants, groupes, lieux, moments, horaires, activités, types activité, grilles planning, réunions), id de route **`sejour-detail`**. Une seule exécution attendue à l’atterrissage post-login (ne pas empiler redirect loader `/` + redirect action + **`Navigate`** client).
  - `/mes-sejours/:id/organisation` : Liste des **plannings organisation** (`DetailsSejourOrganisationLayout` → `DetailsSejourOrganisation`, route **`index`** sous **`organisation`**)
  - `/mes-sejours/:id/organisation/:grilleId` : **Éditeur** de grille pleine page (même composant **`DetailsSejourOrganisation`**, paramètre **`grilleId`**)
  - `/mes-sejours/:id/activites` : Même loader parent ; **Activités** (`DetailsSejourActivites` / `ListeActivites`)
  - `/mes-sejours/:id/menus` : Loader **`menusLoader`** (`detailsSejourMenusLoader.ts`) + **`DetailsSejourMenus`** (menus + références alimentaires agrégées)
  - `/mes-sejours/:id/sanitaire` : Loader **`sanitaireLoader`** (`detailsSejourSanitaireLoader.ts`) + **`DetailsSejourSanitaire`**
  - `/mes-sejours/:id/parametrage` : Même loader parent ; **Paramétrage** (`DetailsSejourParametrage`) — réservé au **directeur du séjour** ou à un **adjoint** (`peutGererMembresEquipeSejour` : segment **Header** absent et **`Navigate`** vers la vue générale sinon). Lieux, Moments, Horaires, Types d’activité, **Références alimentaires**, **Affichage des menus** (préférences locales navigateur pour l’onglet Menus).
  - `/mes-sejours/:id/enfants/:enfantId/dossier` : Dossier d’un enfant — même arbre **`sejour-detail`** ; loader **`dossierEnfantLoader`**, composant **`DossierEnfant`** (DIRECTION ou BASIC_USER participant au séjour)
- **`/erreur`** : Page d’erreur programmatique (**`Erreur.tsx`**) — lit **`location.state`** (`AppRouteErrorPayload` depuis **`navigateToRouteError`** ou **`Layout`** si échec **`getUser`** hors 401).
- **`*` (catch-all)** : URL inconnue → loader qui lève une **404** structurée.
- **Gestion des erreurs (routes)** :
  - **`errorElement`** sur la route racine **`/`** → **`error-page.tsx`** → **`ErreurAffichage`** (`useRouteError` + **`classifyRouteError`**).
  - Helper central **`helpers/routeError.ts`** : **`classifyApiError`**, **`throwRouteLoaderError`** (loaders), **`navigateToRouteError`** (fetch client bloquant), **`FORBIDDEN_ROUTE_ERROR`**, messages FR fixes pour **401** / **403** (ignore textes Spring type « Full authentication… » / « Access Denied »).
  - **`ErreurAffichage`** : pas de code HTTP affiché ; bouton **Se connecter** (401), **Accueil** (403, 404), **Réessayer** (réseau / serveur). **`body.no-padding-top`** sur les pages d’erreur.
  - Loaders principaux (**`mesSejoursLoader`**, **`profilLoader`**, listes admin, **`detailsSejourLoader`**, **`dossierEnfantLoader`**, **`menusLoader`**, **`sanitaireLoader`**) : **`throwRouteLoaderError`** au lieu de renvoyer `[]` / `null` / `Error` inline.
  - **`ProtectedRoute`** : rôle manquant + connecté → **Chargement…** ; mauvais rôle → **`ErreurAffichage`** (**403**) ; non connecté → **`/`**.
  - Réseau : **`NETWORK_ERROR_MESSAGE`** / **`isNetworkError`** dans **`axiosError.ts`** ; **`adaptAxiosError`** lève un **`Error`** FR si pas de **`response`** (plus de « Network Error » brut).
- Permissions des routes `/mes-sejours/*` : **`[RoleSysteme.DIRECTION, RoleSysteme.BASIC_USER]`** (l'API filtre les séjours selon le rôle ; un BASIC_USER ne voit que les séjours où il est membre d'équipe).
- Utilisation de `useNavigate` pour la navigation programmatique.
- Actions React Router pour les formulaires (ex. **`loginAction`** dans **`Connexion.tsx`**) ; **`shouldRevalidate`** sur la route **`/`** (**`connexionShouldRevalidate`**) pour éviter double chargement après POST.
- Layout (`Layout.tsx`) :
  - Header affiché uniquement si `pathname !== "/"` et `role !== null`
  - Pour les rôles **DIRECTION** et **BASIC_USER** sur `/mes-sejours/:id*`, le **Header** utilise **`useMatch`** + **`useRouteLoaderData("sejour-detail")`** (données valides, pas `Error`) pour le **fil** (nom du séjour en pill), les segments **Vue générale** / **Organisation** / **Activités** / **Menus** / **Sanitaire** et (**si directeur ou adjoint du séjour**) **Paramétrage**, ainsi que le lien **Mes séjours** (`Header.tsx`, drapeau interne **`isParticipantSejour`**)
  - Footer actuellement commenté
  - Gestion automatique du padding-top du body (`/` , rôle null, **`/erreur`** → **`no-padding-top`**)
  - Récupération automatique du profil utilisateur si connecté mais rôle manquant dans Redux ; échec **401** → logout ; autre erreur → **`/erreur`**

Structure des dossiers pages et conventions de loaders : voir [decisions-architecturales.md](decisions-architecturales.md) et [contexte-global-stack.md](contexte-global-stack.md).
