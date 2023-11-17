import Admin_header from "./Header/Admin_header";
import User_header from "./Header/User_header";
import Footer from "./Footer/Footer";
import Connexion from "../Pages/Connexion/Connexion";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

function Layout() {
  const { pathname } = useLocation();
  const role = useSelector((state) => state.auth.role);

  return (
    <>
      {pathname !== "/" && role == "ADMIN" && <Admin_header />}
      {pathname !== "/" && role !== "ADMIN" && <User_header />}
      {pathname === "/" ? <Connexion /> : <Outlet />}
      {pathname !== "/" && <Footer />}
    </>
  );
}

export default Layout;
