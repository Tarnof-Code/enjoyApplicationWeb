import type { TypeAppelInfirmerie, TypeSoinInfirmerie } from "../types/api";

export const LIBELLE_SOIN: Record<TypeSoinInfirmerie, string> = {
  DESINFECTANT: "Désinfectant",
  GLACE: "Glace",
  PANSEMENT: "Pansement",
  SERUM_PHYSIOLOGIQUE: "Serum physiologique",
  GEL_COUPS: "Gel coups",
  PRISE_TEMPERATURE: "Prise de température",
  AUTRE: "Autre",
};

export const LIBELLE_APPEL: Record<TypeAppelInfirmerie, string> = {
  PARENTS: "Parents",
  POMPIERS: "Pompiers",
  SAMU: "SAMU",
  AUTRE: "Autre",
};

export const ORDRE_SOINS: TypeSoinInfirmerie[] = [
  "DESINFECTANT",
  "GLACE",
  "PANSEMENT",
  "SERUM_PHYSIOLOGIQUE",
  "GEL_COUPS",
  "PRISE_TEMPERATURE",
  "AUTRE",
];

export const ORDRE_APPELS: TypeAppelInfirmerie[] = ["PARENTS", "POMPIERS", "SAMU", "AUTRE"];
