import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { accountService } from "../services/account.service";
import { enregistrerCheminApresConnexionDepuisLocation } from "../helpers/cheminApresConnexion";
import ErreurAffichage from "../Pages/Erreurs/ErreurAffichage";
import { FORBIDDEN_ROUTE_ERROR } from "../helpers/routeError";
import styles from "../Pages/Erreurs/Erreurs.module.scss";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const location = useLocation();
  const role = useSelector((state: { auth: { role: string | null } }) => state.auth.role);

  if (!role) {
    if (accountService.isLogged()) {
      return (
        <div className={styles.loading}>
          <p>Chargement…</p>
        </div>
      );
    }
    enregistrerCheminApresConnexionDepuisLocation(location);
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <ErreurAffichage error={FORBIDDEN_ROUTE_ERROR} />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
