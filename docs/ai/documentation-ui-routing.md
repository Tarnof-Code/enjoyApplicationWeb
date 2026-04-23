# Documentation UI — routes & navigation

## Navigation & routes

- Routes protégées via `ProtectedRoute.tsx` et Redux pour l'état d'authentification.
- Routes définies dans `App.tsx` avec `createBrowserRouter`.
- Routes principales :
  - `/` : Page de connexion (redirige vers `/profil` si déjà connecté)
  - `/profil` : Page de profil utilisateur (accessible à tous les utilisateurs connectés)
  - `/utilisateurs` : Liste des utilisateurs (ADMIN uniquement)
  - `/sejours` : Liste des séjours (ADMIN uniquement)
  - `/directeur/sejours` : Liste des séjours du directeur (DIRECTION uniquement)
  - `/directeur/sejours/:id` : Détail séjour — **index** = vue générale (`DetailsSejourOverview`), loader `detailsSejourLoader`, id de route **`sejour-detail`**
  - `/directeur/sejours/:id/activites` : Même loader parent ; onglet **Activités** (`DetailsSejourActivites` / `ListeActivites`)
  - `/directeur/sejours/:sejourId/enfants/:enfantId/dossier` : Dossier d'un enfant (DIRECTION uniquement)
- Utilisation de `useNavigate` pour la navigation programmatique.
- Actions React Router pour les formulaires (ex: `loginAction` dans `Connexion.tsx`).
- Layout (`Layout.tsx`) :
  - Header affiché uniquement si `pathname !== "/"` et `role !== null`
  - Pour le directeur sur `/directeur/sejours/:id*`, le **Header** utilise **`useMatch`** + **`useRouteLoaderData("sejour-detail")`** (données valides, pas `Error`) pour le **fil** (nom du séjour en pill), les segments **Vue générale** / **Activités** et le lien **Mes séjours** (`Header.tsx`)
  - Footer actuellement commenté
  - Gestion automatique du padding-top du body selon la route
  - Récupération automatique du profil utilisateur si connecté mais rôle manquant dans Redux (avec gestion d'erreur 401 → logout)

Structure des dossiers pages et conventions de loaders : voir [decisions-architecturales.md](decisions-architecturales.md) et [contexte-global-stack.md](contexte-global-stack.md).
