import { AxiosError } from "axios";
import { isRouteErrorResponse, json, redirect, type NavigateFunction } from "react-router-dom";
import { getApiErrorMessage, isNetworkError, NETWORK_ERROR_MESSAGE } from "./axiosError";
import { accountService } from "../services/account.service";
import { enregistrerCheminApresConnexionDepuisNavigateur } from "./cheminApresConnexion";

export type AppErrorKind = "network" | "not-found" | "unauthorized" | "forbidden" | "server" | "unknown";

export interface AppRouteErrorPayload {
  kind: AppErrorKind;
  message: string;
  status?: number;
}

export const FORBIDDEN_ROUTE_ERROR: AppRouteErrorPayload = {
  kind: "forbidden",
  message: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource.",
  status: 403,
};

function kindFromHttpStatus(status: number): AppErrorKind {
  if (status === 404) return "not-found";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status >= 500) return "server";
  return "unknown";
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 401:
      return "Vous n'êtes pas connecté.\nConnectez-vous pour accéder à cette page.";
    case 403:
      return "Vous n'avez pas les droits nécessaires pour accéder à cette ressource.";
    case 404:
      return "La ressource demandée est introuvable.";
    default:
      return status >= 500
        ? "Le serveur a rencontré une erreur. Veuillez réessayer plus tard."
        : "Une erreur s'est produite lors du chargement de la page.";
  }
}

function statusForKind(payload: AppRouteErrorPayload): number {
  if (payload.status) return payload.status;
  switch (payload.kind) {
    case "network":
      return 503;
    case "not-found":
      return 404;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "server":
      return 500;
    default:
      return 500;
  }
}

export function classifyApiError(error: unknown): AppRouteErrorPayload {
  if (isNetworkError(error)) {
    return { kind: "network", message: NETWORK_ERROR_MESSAGE };
  }

  if (error instanceof AxiosError) {
    if (!error.response) {
      return { kind: "network", message: NETWORK_ERROR_MESSAGE };
    }

    const status = error.response.status;

    if (status === 401) {
      return { kind: "unauthorized", message: defaultMessageForStatus(401), status };
    }

    if (status === 403) {
      return { kind: "forbidden", message: defaultMessageForStatus(403), status };
    }

    const message = getApiErrorMessage(error.response.data, defaultMessageForStatus(status));

    if (status === 404) return { kind: "not-found", message, status };
    if (status >= 500) return { kind: "server", message, status };
    return { kind: "unknown", message, status };
  }

  if (error instanceof Error) {
    if (/^network error$/i.test(error.message.trim())) {
      return { kind: "network", message: NETWORK_ERROR_MESSAGE };
    }
    return { kind: "unknown", message: error.message };
  }

  return { kind: "unknown", message: "Une erreur inattendue s'est produite." };
}

export function logoutAndRedirectToConnexion(): never {
  enregistrerCheminApresConnexionDepuisNavigateur();
  accountService.logout();
  throw redirect("/");
}

export function throwRouteLoaderError(error: unknown): never {
  const classified = classifyApiError(error);
  if (classified.kind === "unauthorized") {
    logoutAndRedirectToConnexion();
  }
  console.error("Erreur lors du chargement de la route", error);
  throw json(classified, { status: statusForKind(classified) });
}

export function isRouteLevelError(kind: AppErrorKind): boolean {
  return (
    kind === "network" ||
    kind === "unauthorized" ||
    kind === "forbidden" ||
    kind === "server" ||
    kind === "not-found"
  );
}

/** Redirige vers `/erreur` pour les erreurs bloquantes (réseau, auth, serveur…). */
export function navigateToRouteError(
  navigate: NavigateFunction,
  error: unknown,
  options?: { replace?: boolean }
): boolean {
  const classified = classifyApiError(error);
  if (!isRouteLevelError(classified.kind)) {
    return false;
  }
  if (classified.kind === "unauthorized") {
    enregistrerCheminApresConnexionDepuisNavigateur();
    accountService.logout();
    navigate("/", { replace: options?.replace ?? true });
    return true;
  }
  navigate("/erreur", { replace: options?.replace ?? true, state: classified });
  return true;
}

export function classifyRouteError(error: unknown): AppRouteErrorPayload {
  if (isRouteErrorResponse(error)) {
    const data = error.data;
    if (data && typeof data === "object" && "kind" in data && "message" in data) {
      return data as AppRouteErrorPayload;
    }
    return {
      kind: kindFromHttpStatus(error.status),
      message: typeof data === "string" ? data : defaultMessageForStatus(error.status),
      status: error.status,
    };
  }

  return classifyApiError(error);
}

export interface ErrorDisplayContent {
  title: string;
  message: string;
  hint?: string;
}

export function getErrorDisplayContent(payload: AppRouteErrorPayload): ErrorDisplayContent {
  switch (payload.kind) {
    case "network":
      return {
        title: "Serveur inaccessible",
        message: payload.message,
        hint: "Le service est peut-être en maintenance ou votre connexion est interrompue.",
      };
    case "not-found":
      return {
        title: "Page introuvable",
        message: payload.message,
        hint: "L'adresse saisie n'existe pas ou la ressource a été déplacée.",
      };
    case "unauthorized":
      return {
        title: "Connexion requise",
        message: payload.message,
        hint: "Identifiez-vous pour continuer.",
      };
    case "forbidden":
      return {
        title: "Accès refusé",
        message: payload.message,
        hint: "Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.",
      };
    case "server":
      return {
        title: "Erreur serveur",
        message: payload.message,
        hint: "Nos équipes techniques ont été informées. Réessayez dans quelques minutes.",
      };
    default:
      return {
        title: "Une erreur est survenue",
        message: payload.message,
      };
  }
}
