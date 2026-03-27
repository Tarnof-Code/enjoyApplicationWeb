import type { EmplacementLieu as EmplacementLieuType } from '../types/api';

/** Valeurs alignées sur l'enum Java `EmplacementLieu` (sérialisation JSON). */
export const EmplacementLieuValues: EmplacementLieuType[] = ['INTERIEUR', 'EXTERIEUR', 'HORS_CENTRE'];

export const EmplacementLieuLabels: Record<EmplacementLieuType, string> = {
  INTERIEUR: 'Intérieur',
  EXTERIEUR: 'Extérieur',
  HORS_CENTRE: 'Hors centre',
};
