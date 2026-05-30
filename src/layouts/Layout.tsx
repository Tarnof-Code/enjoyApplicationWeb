import Header from "./Header/Header";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect } from "react";
import { accountService } from "../services/account.service";
import { utilisateurService } from "../services/utilisateur.service";
import { enregistrerCheminApresConnexionDepuisLocation } from "../helpers/cheminApresConnexion";
import { classifyApiError } from "../helpers/routeError";

const Layout: React.FC = () => {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);

  const isErrorPage = pathname === "/erreur";

  useEffect(() => {
    if (pathname === "/" || role === null || isErrorPage) {
      document.body.classList.add('no-padding-top');
    } else {
      document.body.classList.remove('no-padding-top');
    }
  }, [pathname, role, isErrorPage]);

  useEffect(() => {
    if (accountService.isLogged() && role === null) {
      utilisateurService.getUser().catch((error: unknown) => {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          enregistrerCheminApresConnexionDepuisLocation(location);
          accountService.logout();
          navigate("/");
        } else {
          navigate("/erreur", { replace: true, state: classifyApiError(error) });
        }
      });
    }
  }, [role, navigate, location]);

  return (
    <>
      {pathname !== "/" && !isErrorPage && role !== null && <Header />}
      <Outlet />
      {/* {pathname !== "/" && <Footer />} */}
    </>
  );
};

export default Layout;
