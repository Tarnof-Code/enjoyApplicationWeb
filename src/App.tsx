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
import MesSejours, { mesSejoursLoader } from "./Pages/_Sejours/MesSejours/MesSejours.tsx";
import { detailsSejourLoader } from "./Pages/_Sejours/DetailsSejour/detailsSejourLoader";
import SejourDetailOutlet from "./Pages/_Sejours/DetailsSejour/SejourDetailOutlet";
import DetailsSejourOverview from "./Pages/_Sejours/DetailsSejour/DetailsSejourOverview";
import DetailsSejourActivites from "./Pages/_Sejours/DetailsSejour/DetailsSejourActivites";
import DetailsSejourParametrage from "./Pages/_Sejours/DetailsSejour/DetailsSejourParametrage";
import DetailsSejourOrganisationLayout from "./Pages/_Sejours/DetailsSejour/DetailsSejourOrganisationLayout";
import DetailsSejourOrganisation from "./Pages/_Sejours/DetailsSejour/DetailsSejourOrganisation";
import DetailsSejourMenus from "./Pages/_Sejours/DetailsSejour/DetailsSejourMenus";
import DossierEnfant, { dossierEnfantLoader } from "./Pages/_Sejours/DossierEnfant/DossierEnfant.tsx";
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
          path: "/mes-sejours",
          loader: mesSejoursLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.DIRECTION, RoleSysteme.BASIC_USER]}>
              <MesSejours />
            </ProtectedRoute>
          ),
        },
        {
          path: "/mes-sejours/:id",
          id: "sejour-detail",
          loader: detailsSejourLoader,
          element: (
            <ProtectedRoute allowedRoles={[RoleSysteme.DIRECTION, RoleSysteme.BASIC_USER]}>
              <SejourDetailOutlet />
            </ProtectedRoute>
          ),
          children: [
            {
              index: true,
              element: <DetailsSejourOverview />,
            },
            {
              path: "parametrage",
              element: <DetailsSejourParametrage />,
            },
            {
              path: "activites",
              element: <DetailsSejourActivites />,
            },
            {
              path: "menus",
              element: <DetailsSejourMenus />,
            },
            {
              path: "organisation",
              element: <DetailsSejourOrganisationLayout />,
              children: [
                { index: true, element: <DetailsSejourOrganisation /> },
                { path: ":grilleId", element: <DetailsSejourOrganisation /> },
              ],
            },
            {
              path: "enfants/:enfantId/dossier",
              loader: dossierEnfantLoader,
              element: <DossierEnfant />,
            },
          ],
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
