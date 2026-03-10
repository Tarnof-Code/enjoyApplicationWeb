export enum NiveauScolaire {
  PS = 'PS',
  MS = 'MS',
  GS = 'GS',
  CP = 'CP',
  CE1 = 'CE1',
  CE2 = 'CE2',
  CM1 = 'CM1',
  CM2 = 'CM2',
  SIXIEME = 'SIXIEME',
  CINQUIEME = 'CINQUIEME',
  QUATRIEME = 'QUATRIEME',
  TROISIEME = 'TROISIEME',
  DEUXIEME = 'DEUXIEME',
  PREMIERE = 'PREMIERE',
  TERMINALE = 'TERMINALE'
}

export const NiveauScolaireLabels: Record<NiveauScolaire, string> = {
  [NiveauScolaire.PS]: 'PS',
  [NiveauScolaire.MS]: 'MS',
  [NiveauScolaire.GS]: 'GS',
  [NiveauScolaire.CP]: 'CP',
  [NiveauScolaire.CE1]: 'CE1',
  [NiveauScolaire.CE2]: 'CE2',
  [NiveauScolaire.CM1]: 'CM1',
  [NiveauScolaire.CM2]: 'CM2',
  [NiveauScolaire.SIXIEME]: '6ème',
  [NiveauScolaire.CINQUIEME]: '5ème',
  [NiveauScolaire.QUATRIEME]: '4ème',
  [NiveauScolaire.TROISIEME]: '3ème',
  [NiveauScolaire.DEUXIEME]: '2nde',
  [NiveauScolaire.PREMIERE]: '1ère',
  [NiveauScolaire.TERMINALE]: 'Terminale'
};

/** Ordre des niveaux scolaires (du plus jeune au plus âgé) pour les comparaisons de tranche */
const NIVEAU_SCOLAIRE_ORDRE: string[] = Object.values(NiveauScolaire);

/**
 * Retourne l'index d'un niveau scolaire dans l'ordre (ou -1 si inconnu)
 */
export function getNiveauScolaireOrdre(niveau: string): number {
  const idx = NIVEAU_SCOLAIRE_ORDRE.indexOf(niveau);
  return idx >= 0 ? idx : -1;
}

/**
 * Vérifie si le niveau scolaire d'un enfant est dans la tranche [min, max] (inclus)
 */
export function niveauScolaireDansTranche(
  niveauEnfant: string,
  min: string | null | undefined,
  max: string | null | undefined
): boolean {
  if (!min || !max) return false;
  const ordreEnfant = getNiveauScolaireOrdre(niveauEnfant);
  const ordreMin = getNiveauScolaireOrdre(min);
  const ordreMax = getNiveauScolaireOrdre(max);
  if (ordreEnfant < 0 || ordreMin < 0 || ordreMax < 0) return false;
  return ordreEnfant >= ordreMin && ordreEnfant <= ordreMax;
}

/**
 * Convertit l'enum NiveauScolaire en tableau d'options pour les formulaires
 */
export const getNiveauScolaireOptions = (): { value: string; label: string }[] => {
  return Object.values(NiveauScolaire).map((niveau) => ({
    value: niveau,
    label: NiveauScolaireLabels[niveau]
  }));
};
