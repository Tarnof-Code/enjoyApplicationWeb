import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ErrorPage from "./Pages/Erreurs/error-page";
import Profil from "./Pages/Profil/Profil";
import ListeSejours from "./Pages/_Admin/ListeSejours.tsx";
import ListeUtilisateurs from "./Pages/_Admin/ListeUtilisateurs.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import SejoursDirecteur from "./Pages/_Directeur/SejoursDirecteur.tsx";
import DetailsSejour from "./Pages/_Directeur/DetailsSejour/DetailsSejour.tsx";

const App: React.FC = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/utilisateurs",
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ListeUtilisateurs />
            </ProtectedRoute>
          ),
        },
        {
          path: "/sejours",
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ListeSejours />
            </ProtectedRoute>
          ),
        },
        {
          path: "/directeur/sejours",
          element: (
            <ProtectedRoute allowedRoles={['DIRECTION']}>
              <SejoursDirecteur />
            </ProtectedRoute>
          ),
        },
        {
          path: "/profil",
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
