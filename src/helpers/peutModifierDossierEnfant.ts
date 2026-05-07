import { RoleSejour } from "../enums/RoleSejour";
import type { DirecteurInfos, ProfilUtilisateurDTO } from "../types/api";

/**
 * Indique si l'utilisateur connecté peut modifier un dossier enfant sur ce séjour :
 * directeur du séjour, membre avec rôle adjoint, ou membre avec rôle AS (Assistant sanitaire).
 */
export function peutModifierDossierEnfant(
  utilisateurTokenId: string | null | undefined,
  directeur: DirecteurInfos | null | undefined,
  equipe: ProfilUtilisateurDTO[] | undefined
): boolean {
  const tid = utilisateurTokenId?.trim();
  if (!tid) return false;
  if (directeur?.tokenId?.trim() === tid) return true;
  const membre = equipe?.find((m) => m.tokenId?.trim() === tid);
  return membre?.roleSejour === RoleSejour.ADJOINT || membre?.roleSejour === RoleSejour.AS;
}
