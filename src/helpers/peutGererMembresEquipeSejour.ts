import { RoleSejour } from "../enums/RoleSejour";
import type { DirecteurInfos, ProfilUtilisateurDTO } from "../types/api";

/**
 * Indique si l'utilisateur connecté peut ajouter / modifier / retirer des membres d'équipe sur ce séjour :
 * directeur du séjour, ou membre avec rôle adjoint.
 */
export function peutGererMembresEquipeSejour(
  utilisateurTokenId: string | null | undefined,
  directeur: DirecteurInfos | null | undefined,
  equipe: ProfilUtilisateurDTO[] | undefined
): boolean {
  const tid = utilisateurTokenId?.trim();
  if (!tid) return false;
  if (directeur?.tokenId?.trim() === tid) return true;
  const membre = equipe?.find((m) => m.tokenId?.trim() === tid);
  return membre?.roleSejour === RoleSejour.ADJOINT;
}
