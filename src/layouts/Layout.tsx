import Header from "./Header/Header";
import Connexion from "../Pages/Connexion/Connexion";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect } from "react";
import { accountService } from "../services/account.service";
import { utilisateurService } from "../services/utilisateur.service";

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const role = useSelector((state: RootState) => state.auth.role);

  useEffect(() => {
    // Ajouter ou retirer la classe selon si on a un header ou non
    if (pathname === "/" || role === null) {
      document.body.classList.add('no-padding-top');
    } else {
      document.body.classList.remove('no-padding-top');
    }
  }, [pathname, role]);

  useEffect(() => {
    if (accountService.isLogged() && role === null) {
      utilisateurService.getUser().catch(() => {
        accountService.logout();
      });
    }
  }, [role]);

  return (
    <>
      {pathname !== "/" && role !== null && <Header />}
      {pathname === "/" ? <Connexion /> : <Outlet />}
      {/* {pathname !== "/" && <Footer />} */}
    </>
  );
};

export default Layout;
