import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ErrorPage from "./Pages/Erreurs/error-page";
import Liste_utilisateurs from "./Pages/_Admin/Liste_utilisateurs/Liste_utilisateurs";
import Profil from "./Pages/Profil/Profil";

const App: React.FC = () => {
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
