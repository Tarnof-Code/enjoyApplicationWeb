import type { ChambreDto } from "../types/api";

/** Libellé principal : identifiant, avec surnom optionnel. */
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
