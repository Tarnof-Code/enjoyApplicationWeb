import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { enregistrerCheminApresConnexionDepuisNavigateur } from "../../helpers/cheminApresConnexion";
import { accountService } from "../../services/account.service";

/** Déconnexion puis redirection vers la page de connexion (401 / session expirée). */
function RedirectToConnexion() {
  useEffect(() => {
    enregistrerCheminApresConnexionDepuisNavigateur();
    accountService.logout();
  }, []);

  return <Navigate to="/" replace />;
}

export default RedirectToConnexion;
