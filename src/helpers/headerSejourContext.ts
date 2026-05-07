import type { DirecteurInfos, ProfilUtilisateurDTO, SejourDTO } from "../types/api";

const STORAGE_KEY = "enjoy.headerSejourContext";

/** Persiste après déconnexion : dernier séjour consulté par compte (`sub` du JWT). */
const PREFIX_DERNIER_SEJOUR_UTILISATEUR = "enjoy.dernierSejourId.";

export function cleDernierSejourUtilisateur(utilisateurSub: string): string {
  return `${PREFIX_DERNIER_SEJOUR_UTILISATEUR}${utilisateurSub}`;
}

export function enregistrerDernierSejourVisite(utilisateurSub: string, sejourId: number): void {
  if (!utilisateurSub || !Number.isFinite(sejourId) || sejourId <= 0) return;
  try {
    localStorage.setItem(cleDernierSejourUtilisateur(utilisateurSub), String(sejourId));
  } catch {
    /* quota / navigation privée */
  }
}

export function lireDernierSejourVisite(utilisateurSub: string): number | null {
  try {
    const raw = localStorage.getItem(cleDernierSejourUtilisateur(utilisateurSub));
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

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
