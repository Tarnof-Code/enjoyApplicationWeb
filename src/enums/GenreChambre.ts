import type { GenreChambre as GenreChambreType } from '../types/api';

/** Valeurs alignées sur l'enum Java `GenreChambre` (sérialisation JSON). */
export const GenreChambreValues: GenreChambreType[] = ['MASCULIN', 'FEMININ', 'MIXTE'];

export const GenreChambreLabels: Record<GenreChambreType, string> = {
  MASCULIN: 'Masculin',
  FEMININ: 'Féminin',
  MIXTE: 'Mixte',
};

/** Libellés courts pour pastilles sur les cartes chambre. */
export const GenreChambreBadgeLabels: Record<GenreChambreType, string> = {
  MASCULIN: 'Garçons',
  FEMININ: 'Filles',
  MIXTE: 'Mixte',
};

/** Libellés pour l'impression des chambres. */
export const GenreChambrePrintLabels: Record<GenreChambreType, string> = {
  MASCULIN: 'Garçons',
  FEMININ: 'Filles',
  MIXTE: 'Mixte',
};
