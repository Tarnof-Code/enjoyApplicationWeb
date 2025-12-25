import Header from "./Header/Header";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect } from "react";
import { accountService } from "../services/account.service";
import { utilisateurService } from "../services/utilisateur.service";

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);

  useEffect(() => {
    if (pathname === "/" || role === null) {
      document.body.classList.add('no-padding-top');
    } else {
      document.body.classList.remove('no-padding-top');
    }
  }, [pathname, role]);

  useEffect(() => {
    if (accountService.isLogged() && role === null) {
      utilisateurService.getUser().catch((error: any) => {
        if(error.response?.status === 401) {
          accountService.logout();
          navigate("/");
        } else {
          throw error;
        }
      });
    }
  }, [role, navigate]);

  return (
    <>
      {pathname !== "/" && role !== null && <Header />}
      <Outlet />
      {/* {pathname !== "/" && <Footer />} */}
    </>
  );
};

export default Layout;
