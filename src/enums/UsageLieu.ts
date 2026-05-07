import type { UsageLieu as UsageLieuType } from '../types/api';

/** Valeurs alignées sur l'enum Java `UsageLieu` (sérialisation JSON). */
export const UsageLieuValues: UsageLieuType[] = ['ACTIVITE', 'SURVEILLANCE', 'RASSEMBLEMENT'];

export const UsageLieuLabels: Record<UsageLieuType, string> = {
  ACTIVITE: 'Activité',
  SURVEILLANCE: 'Surveillance',
  RASSEMBLEMENT: 'Rassemblement',
};
