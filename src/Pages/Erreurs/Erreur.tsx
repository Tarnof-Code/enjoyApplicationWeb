import { Navigate, useLocation } from "react-router-dom";
import ErreurAffichage from "./ErreurAffichage";
import RedirectToConnexion from "./RedirectToConnexion";
import { AppRouteErrorPayload } from "../../helpers/routeError";

function Erreur() {
  const location = useLocation();
  const error = location.state as AppRouteErrorPayload | null;

  if (!error?.kind || !error?.message) {
    return <Navigate to="/" replace />;
  }

  if (error.kind === "unauthorized") {
    return <RedirectToConnexion />;
  }

  return <ErreurAffichage error={error} />;
}

export default Erreur;
