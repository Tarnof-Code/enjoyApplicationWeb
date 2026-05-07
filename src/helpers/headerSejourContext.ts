import type { DirecteurInfos, ProfilUtilisateurDTO, SejourDTO } from "../types/api";

const STORAGE_KEY = "enjoy.headerSejourContext";

export type HeaderSejourContextSnapshot = {
  id: number;
  nom: string;
  directeur?: DirecteurInfos;
  equipe?: ProfilUtilisateurDTO[];
};

export function toHeaderSejourSnapshot(sejour: SejourDTO): HeaderSejourContextSnapshot {
  return {
    id: sejour.id,
    nom: sejour.nom,
    directeur: sejour.directeur,
    equipe: sejour.equipe,
  };
}

export function lireHeaderSejourContext(): HeaderSejourContextSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeaderSejourContextSnapshot;
    if (typeof parsed?.id !== "number" || typeof parsed?.nom !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function enregistrerHeaderSejourContext(sejour: SejourDTO): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toHeaderSejourSnapshot(sejour)));
  } catch {
    /* quota / navigation privée */
  }
}

export function effacerHeaderSejourContext(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
