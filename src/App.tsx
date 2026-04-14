import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider, redirect } from "react-router-dom";
import Layout from "./layouts/Layout";
import ErrorPage from "./Pages/Erreurs/error-page";
import Profil, { profilLoader } from "./Pages/Profil/Profil";
import Connexion, { loginAction } from "./Pages/Connexion/Connexion";
import { accountService } from "./services/account.service";
import ListeSejoursAdmin, { sejoursAdminLoader } from "./Pages/_Admin/ListeSejoursAdmin/ListeSejoursAdmin.tsx";
import ListeUtilisateurs, { utilisateursLoader } from "./Pages/_Admin/ListeUtilisateurs/ListeUtilisateurs.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import ListeSejoursDirecteur, { listeSejoursDirecteurLoader } from "./Pages/_Directeur/ListeSejoursDirecteur/ListeSejoursDirecteur.tsx";
import { detailsSejourLoader } from "./Pages/_Directeur/DetailsSejour/detailsSejourLoader";
import SejourDetailOutlet from "./Pages/_Directeur/DetailsSejour/SejourDetailOutlet";
import DetailsSejourOverview from "./Pages/_Directeur/DetailsSejour/DetailsSejourOverview";
import DetailsSejourActivites from "./Pages/_Directeur/DetailsSejour/DetailsSejourActivites";
import DossierEnfant, { dossierEnfantLoader } from "./Pages/_Directeur/DossierEnfant/DossierEnfant.tsx";
import { RoleSysteme } from "./enums/RoleSysteme";

const App: React.FC = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          loader: async () => {
            if (accountService.isLogged()) {
              return redirect("/profil");
            }
            return null;
          },
          action: loginAction,
          element: <Connexion />,
        },
        {
          path: "/utilisateurs",
          loader: utilisateursLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.ADMIN]}>
              <ListeUtilisateurs />
            </ProtectedRoute>
          ),
        },
        {
          path: "/sejours",
          loader: sejoursAdminLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.ADMIN]}>
              <ListeSejoursAdmin />
            </ProtectedRoute>
          ),
        },
        {
          path: "/directeur/sejours",
          loader: listeSejoursDirecteurLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.DIRECTION]}>
              <ListeSejoursDirecteur />
            </ProtectedRoute>
          ),
        },
        {
          path: "/directeur/sejours/:id",
          id: "sejour-detail",
          loader: detailsSejourLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.DIRECTION]}>
              <SejourDetailOutlet />
            </ProtectedRoute>
          ),
          children: [
            {
              index: true,
              element: <DetailsSejourOverview />,
            },
            {
              path: "activites",
              element: <DetailsSejourActivites />,
            },
          ],
        },
        {
          path: "/directeur/sejours/:sejourId/enfants/:enfantId/dossier",
          loader: dossierEnfantLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.DIRECTION]}>
              <DossierEnfant />
            </ProtectedRoute>
          ),
        },
        {
          path: "/profil",
          loader: profilLoader,
          element: <Profil />,
        },
      ],
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
};

export default App;
