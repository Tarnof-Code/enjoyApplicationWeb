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

function correspondRechercheTexte(search: string, segments: string[]): boolean {
  const query = normaliserPourRechercheTexte(search);
  if (!query) return true;
  return segments.some((segment) => normaliserPourRechercheTexte(segment).includes(query));
}

/** Variantes de saisie après retrait des préfixes « bâtiment / bat / bat. » en tête de requête. */
export function variantesQueryBatiment(search: string): string[] {
  const normalized = normaliserPourRechercheTexte(search);
  if (!normalized) return [""];
  const variants = new Set<string>([normalized]);
  for (const prefix of PREFIXES_RECHERCHE_BATIMENT) {
    const prefixNorm = normaliserPourRechercheTexte(prefix);
    if (normalized.startsWith(`${prefixNorm} `)) {
      const rest = normalized.slice(prefixNorm.length + 1).trim();
      if (rest) variants.add(rest);
    }
  }
  return [...variants];
}

/** Segments indexés pour le filtre identifiant / nom de chambre. */
export function textesRechercheIdentifiantChambre(chambre: ChambreDto): string[] {
  return [chambre.identifiant, chambre.nom ?? "", libelleChambre(chambre)].filter(
    (segment) => segment.trim() !== "",
  );
}

/** Segments indexés pour le filtre bâtiment. */
export function textesRechercheBatimentChambre(chambre: ChambreDto): string[] {
  const batiment = chambre.batiment?.trim();
  if (!batiment) return [];

  const segments: string[] = [batiment, `Bât. ${batiment}`, resumeLocalisation(chambre)];
  for (const prefix of PREFIXES_RECHERCHE_BATIMENT) {
    segments.push(`${prefix} ${batiment}`);
  }
  return segments.filter((segment) => segment.trim() !== "");
}

/** Segments indexés pour le filtre étage (valeur brute, libellé affiché, synonymes). */
export function textesRechercheEtageChambre(chambre: ChambreDto): string[] {
  if (chambre.etage == null) return [];
  const etageLibelle = libelleEtage(chambre.etage);
  return [
    String(chambre.etage),
    etageLibelle,
    "etage",
    `etage ${etageLibelle}`,
    resumeLocalisation(chambre),
  ].filter((segment) => segment.trim() !== "");
}

/** Segments indexés pour le filtre couloir. */
export function textesRechercheCouloirChambre(chambre: ChambreDto): string[] {
  const segments: string[] = [chambre.couloir ?? ""];
  const couloir = chambre.couloir?.trim();
  if (couloir) {
    segments.push("couloir", `couloir ${couloir}`);
  }
  return segments.filter((segment) => segment.trim() !== "");
}

/** Segments indexés pour le filtre occupant (enfant ou membre d'équipe, hors référents). */
export function textesRechercheOccupantChambre(chambre: ChambreDto): string[] {
  const segments: string[] = [];
  for (const occupant of chambre.occupants ?? []) {
    segments.push(occupant.nom, occupant.prenom, `${occupant.prenom} ${occupant.nom}`);
  }
  return segments.filter((segment) => segment.trim() !== "");
}

export function chambreCorrespondFiltreIdentifiant(chambre: ChambreDto, search: string): boolean {
  return correspondRechercheTexte(search, textesRechercheIdentifiantChambre(chambre));
}

export function chambreCorrespondFiltreBatiment(chambre: ChambreDto, search: string): boolean {
  const batiment = chambre.batiment?.trim();
  const query = normaliserPourRechercheTexte(search);
  if (!query) return true;
  if (!batiment) return false;

  const batimentNorm = normaliserPourRechercheTexte(batiment);
  for (const variant of variantesQueryBatiment(search)) {
    const variantNorm = normaliserPourRechercheTexte(variant);
    if (variantNorm && batimentNorm.includes(variantNorm)) return true;
  }

  return false;
}

export function chambreCorrespondFiltreEtage(chambre: ChambreDto, search: string): boolean {
  return correspondRechercheTexte(search, textesRechercheEtageChambre(chambre));
}

export function chambreCorrespondFiltreCouloir(chambre: ChambreDto, search: string): boolean {
  return correspondRechercheTexte(search, textesRechercheCouloirChambre(chambre));
}

export function chambreCorrespondFiltreOccupant(chambre: ChambreDto, search: string): boolean {
  return correspondRechercheTexte(search, textesRechercheOccupantChambre(chambre));
}

/** Index textuel pour le filtre chambres (valeurs brutes + libellés affichés + synonymes localisation). */
export function textesRechercheChambre(chambre: ChambreDto): string[] {
  return [
    ...textesRechercheIdentifiantChambre(chambre),
    ...textesRechercheBatimentChambre(chambre),
    ...textesRechercheEtageChambre(chambre),
    ...textesRechercheCouloirChambre(chambre),
    chambre.description ?? "",
    chambre.groupe?.libelle ?? "",
    ...textesRechercheOccupantChambre(chambre),
    ...(chambre.referents ?? []).flatMap((referent) => [
      referent.nom,
      referent.prenom,
      `${referent.prenom} ${referent.nom}`,
    ]),
  ].filter((segment) => segment.trim() !== "");
}

export function chambreCorrespondRechercheTexte(chambre: ChambreDto, search: string): boolean {
  return correspondRechercheTexte(search, textesRechercheChambre(chambre));
}
