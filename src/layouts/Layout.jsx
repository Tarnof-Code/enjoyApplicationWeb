import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import Connexion from "../Pages/Connexion/Connexion";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";

function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      {pathname !== "/" && <Header />}
      {pathname === "/" ? <Connexion /> : <Outlet />}
      {pathname !== "/" && <Footer />}
    </>
  );
}

export default Layout;
