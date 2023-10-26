import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import ErrorPage from "./error-page";
import Apropos from "./Pages/Apropos/Apropos";
import Accueil from "./Pages/Accueil/Accueil";
import Profil from "./Pages/Profil/Profil";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/apropos",
          element: <Apropos />,
        },
        {
          path: "/accueil",
          element: <Accueil />,
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
}

export default App;
