import Header from "./Header/Header";
import Connexion from "../Pages/Connexion/Connexion";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const role = useSelector((state: RootState) => state.auth.role);

  return (
    <>
      {pathname !== "/" && role !== null && <Header />}
      {pathname === "/" ? <Connexion /> : <Outlet />}
      {/* {pathname !== "/" && <Footer />} */}
    </>
  );
};

export default Layout;
