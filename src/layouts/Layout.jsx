import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import Connexion from "../Pages/Connexion/Connexion";
import Accueil from "../Pages/Accueil/Accueil";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";

function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <Header />
      {pathname === "/" ? <Accueil /> : <Outlet />}
      <Footer />
    </>
  );
}

export default Layout;
