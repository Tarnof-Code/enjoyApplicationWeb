import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ErrorPage from "./Pages/Erreurs/error-page";
import Liste_utilisateurs from "./Pages/_Admin/Liste_utilisateurs/Liste_utilisateurs";
import Ajout_utilisateur from "./Pages/_Admin/Ajout_utilisateur/Ajout_utilisateur";
import Profil from "./Pages/Profil/Profil";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/liste_utilisateurs",
          element: <Liste_utilisateurs />,
        },
        {
          path: "/profil",
          element: <Profil />,
        },
        {
          path: "/ajout_utilisateur",
          element: <Ajout_utilisateur />,
        },
      ],
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
