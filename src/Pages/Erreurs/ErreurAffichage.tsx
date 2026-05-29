import { Button } from "reactstrap";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppRouteErrorPayload,
  getErrorDisplayContent,
} from "../../helpers/routeError";
import { accountService } from "../../services/account.service";
import { cheminAccueilDepuisEtatActuel } from "../../helpers/redirectApresAuthentification";
import styles from "./Erreurs.module.scss";

interface ErreurAffichageProps {
  error: AppRouteErrorPayload;
}

function ErreurAffichage({ error }: ErreurAffichageProps) {
  const navigate = useNavigate();
  const { title, message, hint } = getErrorDisplayContent(error);
  const isSessionExpired = error.kind === "unauthorized";
  const isNotFound = error.kind === "not-found";
  const isForbidden = error.kind === "forbidden";
  const goHome = isNotFound || isForbidden;

  useEffect(() => {
    document.body.classList.add("no-padding-top");
    return () => {
      document.body.classList.remove("no-padding-top");
    };
  }, []);

  const handleGoHome = () => {
    const home = accountService.isLogged() ? cheminAccueilDepuisEtatActuel() : "/";
    navigate(home, { replace: true });
  };

  const handleAction = () => {
    if (isSessionExpired) {
      accountService.logout();
      navigate("/", { replace: true });
      return;
    }
    if (goHome) {
      handleGoHome();
      return;
    }
    window.location.reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {hint && <p className={styles.hint}>{hint}</p>}
        <div className={styles.actions}>
          <Button color="primary" onClick={handleAction}>
            {isSessionExpired ? "Se connecter" : goHome ? "Accueil" : "Réessayer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
export default ErreurAffichage;
