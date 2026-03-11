import type { AxiosResponse } from "axios";

/**
 * Vérifie que la réponse HTTP a le statut attendu.
 * @throws Error si le statut ne correspond pas
 */
export function validateResponseStatus(response: AxiosResponse, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Réponse inattendue : ${response.status}`);
  }
}

/** Erreur adaptée avec la propriété response attachée (pour compatibilité avec les composants) */
export interface AdaptedError extends Error {
  response?: {
    status: number;
    data: unknown;
    [key: string]: unknown;
  };
}

/**
 * Extrait le message d'erreur d'une réponse Axios.
 * Gère les erreurs de validation (400) avec format objet { champ: "message" }.
 */
function extractErrorMessage(
  errorData: unknown,
  defaultMessage: string,
  validationDefault?: string
): string {
  if (!errorData || typeof errorData !== "object") {
    return defaultMessage;
  }
  const data = errorData as Record<string, unknown>;
  // Format standard : { error: "..." } ou { message: "..." }
  if (data.error && typeof data.error === "string") {
    return data.error;
  }
  if (data.message && typeof data.message === "string") {
    return data.message;
  }
  // Format validation : { nom: "message", prenom: ["msg1", "msg2"], ... }
  const entries = Object.entries(data).filter(([_, v]) => v !== null && v !== undefined);
  if (entries.length > 0) {
    const validationErrors = entries
      .map(([field, message]) => {
        const msg = Array.isArray(message) ? message.join(", ") : String(message);
        return `${field}: ${msg}`;
      })
      .join(", ");
    return `Erreurs de validation : ${validationErrors}`;
  }
  return validationDefault ?? defaultMessage;
}

export interface AdaptAxiosErrorOptions {
  /** Message par défaut si aucune info dans la réponse */
  defaultMessage: string;
  /** Message pour les erreurs 400 de validation (si différent) */
  validationDefault?: string;
  /** Contexte pour le console.error (ex: "Erreur lors de la création") */
  logContext?: string;
  /** Si true, préserve error.response.data tel quel (pour les erreurs de validation) */
  preserveResponseData?: boolean;
}

/**
 * Adapte une erreur Axios en Error avec la propriété response attachée.
 * À utiliser dans les blocs catch des appels API.
 * @throws L'erreur adaptée (ou l'erreur originale si pas de error.response)
 */
export function adaptAxiosError(error: unknown, options: AdaptAxiosErrorOptions): never {
  const { defaultMessage, validationDefault, logContext, preserveResponseData = false } = options;

  if (logContext) {
    console.error(logContext, error);
  }

  const axiosError = error as { response?: { status: number; data: unknown; [key: string]: unknown } };
  if (!axiosError.response) {
    throw error;
  }

  const errorMessage = extractErrorMessage(
    axiosError.response.data,
    defaultMessage,
    validationDefault ?? defaultMessage
  );

  const adaptedError = new Error(errorMessage) as AdaptedError;
  adaptedError.response = {
    ...axiosError.response,
    status: axiosError.response.status,
    data: preserveResponseData ? axiosError.response.data : { error: errorMessage },
  };

  throw adaptedError;
}
