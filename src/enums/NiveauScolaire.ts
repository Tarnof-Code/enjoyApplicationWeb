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

/**
 * Convertit l'enum NiveauScolaire en tableau d'options pour les formulaires
 */
export const getNiveauScolaireOptions = (): { value: string; label: string }[] => {
  return Object.values(NiveauScolaire).map((niveau) => ({
    value: niveau,
    label: NiveauScolaireLabels[niveau]
  }));
};
