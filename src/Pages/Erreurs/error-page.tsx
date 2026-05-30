import { useRouteError } from "react-router-dom";
import ErreurAffichage from "./ErreurAffichage";
import RedirectToConnexion from "./RedirectToConnexion";
import { classifyRouteError } from "../../helpers/routeError";

function ErrorPage() {
  const routeError = useRouteError();
  const error = classifyRouteError(routeError);

  if (error.kind === "unauthorized") {
    return <RedirectToConnexion />;
  }

  return <ErreurAffichage error={error} />;
}

export default ErrorPage;
