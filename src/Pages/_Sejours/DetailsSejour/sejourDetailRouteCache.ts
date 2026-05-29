import type { SejourDTO } from "../../../types/api";

/** Cache synchrone rempli par `detailsSejourLoader` — évite un 2ᵉ GET séjour dans les loaders enfants (RR 6.17). */
const sejourParIdRoute = new Map<string, SejourDTO>();

export function mettreEnCacheSejourRoute(routeId: string, sejour: SejourDTO): void {
  sejourParIdRoute.set(routeId, sejour);
}

export function lireSejourDepuisCacheRoute(routeId: string): SejourDTO | undefined {
  return sejourParIdRoute.get(routeId);
}
