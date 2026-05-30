const STORAGE_KEY = "enjoy.cheminApresConnexion";

const CHEMINS_INTERDITS = new Set(["/", "/erreur"]);

export function composerCheminInterne(pathname: string, search = "", hash = ""): string {
  return `${pathname}${search}${hash}`;
}

export function estCheminRetourValide(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return false;
  }
  const pathname = path.split(/[?#]/)[0];
  return !CHEMINS_INTERDITS.has(pathname);
}

export function enregistrerCheminApresConnexion(path: string): void {
  if (!estCheminRetourValide(path)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* quota / navigation privée */
  }
}

export function enregistrerCheminApresConnexionDepuisLocation(location: {
  pathname: string;
  search?: string;
  hash?: string;
}): void {
  enregistrerCheminApresConnexion(
    composerCheminInterne(location.pathname, location.search ?? "", location.hash ?? "")
  );
}

export function enregistrerCheminApresConnexionDepuisNavigateur(): void {
  if (typeof window === "undefined") return;
  enregistrerCheminApresConnexion(
    composerCheminInterne(window.location.pathname, window.location.search, window.location.hash)
  );
}

export function lireEtEffacerCheminApresConnexion(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw || !estCheminRetourValide(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function effacerCheminApresConnexion(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
