import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ErrorPage from "./Pages/Erreurs/error-page";
import Profil from "./Pages/Profil/Profil";
import ListeSejours from "./Pages/_Admin/ListeSejours.tsx";
import ListeUtilisateurs from "./Pages/_Admin/ListeUtilisateurs.tsx";

const App: React.FC = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [ 
        {
          path: "/utilisateurs",
          element: <ListeUtilisateurs />,
        },
        {
          path: "/sejours",
          element: <ListeSejours />,
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
