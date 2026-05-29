import { useRouteError } from "react-router-dom";
import ErreurAffichage from "./ErreurAffichage";
import { classifyRouteError } from "../../helpers/routeError";

function ErrorPage() {
  const routeError = useRouteError();
  const error = classifyRouteError(routeError);

  return <ErreurAffichage error={error} />;
}

export default ErrorPage;
