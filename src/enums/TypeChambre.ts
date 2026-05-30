import type { TypeChambre as TypeChambreType } from '../types/api';

/** Valeurs alignées sur l'enum Java `TypeChambre` (sérialisation JSON). */
export const TypeChambreValues: TypeChambreType[] = ['ENFANT', 'EQUIPE'];

export const TypeChambreLabels: Record<TypeChambreType, string> = {
  ENFANT: 'Enfants',
  EQUIPE: 'Équipe',
};
