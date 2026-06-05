import type { ChambreDto } from "../types/api";

/** Libellé principal : identifiant, avec nom optionnel. */
export function libelleChambre(chambre: Pick<ChambreDto, "identifiant" | "nom">): string {
  const id = chambre.identifiant.trim();
  const nom = chambre.nom?.trim();
  if (nom) return `${id} — ${nom}`;
  return id;
}

export function libelleEtage(etage: number | null | undefined): string {
  if (etage == null) return "—";
  if (etage === 0) return "RDC";
  return String(etage);
}

export function resumeLocalisation(chambre: ChambreDto): string {
  const parts: string[] = [];
  if (chambre.batiment?.trim()) parts.push(`Bât. ${chambre.batiment.trim()}`);
  if (chambre.etage != null) parts.push(`Étage ${libelleEtage(chambre.etage)}`);
  if (chambre.couloir?.trim()) parts.push(`Couloir ${chambre.couloir.trim()}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function chambreALocalisationRenseignee(
  chambre: Pick<ChambreDto, "batiment" | "etage" | "couloir">
): boolean {
  return !!(chambre.batiment?.trim() || chambre.etage != null || chambre.couloir?.trim());
}

/** Recherche insensible à la casse et aux accents (ex. « bat » ↔ « bâtiment »). */
export function normaliserPourRechercheTexte(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const PREFIXES_RECHERCHE_BATIMENT = ["batiment", "bat", "bat."] as const;

/** Index textuel pour le filtre chambres (valeurs brutes + libellés affichés + synonymes localisation). */
export function textesRechercheChambre(chambre: ChambreDto): string[] {
  const segments: string[] = [
    chambre.identifiant,
    chambre.nom ?? "",
    libelleChambre(chambre),
    chambre.batiment ?? "",
    chambre.couloir ?? "",
    chambre.description ?? "",
    resumeLocalisation(chambre),
    chambre.groupe?.libelle ?? "",
  ];

  const batiment = chambre.batiment?.trim();
  if (batiment) {
    for (const prefix of PREFIXES_RECHERCHE_BATIMENT) {
      segments.push(prefix, `${prefix} ${batiment}`);
    }
  }

  const couloir = chambre.couloir?.trim();
  if (couloir) {
    segments.push("couloir", `couloir ${couloir}`);
  }

  if (chambre.etage != null) {
    const etageLibelle = libelleEtage(chambre.etage);
    segments.push(String(chambre.etage), etageLibelle, "etage", `etage ${etageLibelle}`);
  }

  for (const referent of chambre.referents ?? []) {
    segments.push(referent.nom, referent.prenom, `${referent.prenom} ${referent.nom}`);
  }
  for (const occupant of chambre.occupants ?? []) {
    segments.push(occupant.nom, occupant.prenom, `${occupant.prenom} ${occupant.nom}`);
  }

  return segments.filter((segment) => segment.trim() !== "");
}

export function chambreCorrespondRechercheTexte(chambre: ChambreDto, search: string): boolean {
  const query = normaliserPourRechercheTexte(search);
  if (!query) return true;
  return textesRechercheChambre(chambre).some((segment) =>
    normaliserPourRechercheTexte(segment).includes(query),
  );
}
