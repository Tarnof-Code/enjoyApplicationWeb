import Header from "./Header/Header";
import Footer from "./Footer/Footer";
import Connexion from "../Pages/Connexion/Connexion";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

function Layout() {
  const { pathname } = useLocation();
  const role = useSelector((state) => state.auth.role);

  return (
    <>
      {pathname !== "/" && role !== null && <Header />}
      {pathname === "/" ? <Connexion /> : <Outlet />}
      {/* {pathname !== "/" && <Footer />} */}
    </>
  );
}

export default Layout;
