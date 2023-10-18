import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layouts/Layout";
import Connexion from "./Pages/Connexion/Connexion";
import Apropos from "./Pages/Apropos/Apropos";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Connexion />,
      children: [
        {
          path: "/apropos",
          element: <Apropos />,
        },
        {
          path: "/accueil",
          element: <Layout />,
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
