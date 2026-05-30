import type { GenreChambre as GenreChambreType } from '../types/api';

/** Valeurs alignées sur l'enum Java `GenreChambre` (sérialisation JSON). */
export const GenreChambreValues: GenreChambreType[] = ['MASCULIN', 'FEMININ', 'MIXTE'];

export const GenreChambreLabels: Record<GenreChambreType, string> = {
  MASCULIN: 'Masculin',
  FEMININ: 'Féminin',
  MIXTE: 'Mixte',
};
