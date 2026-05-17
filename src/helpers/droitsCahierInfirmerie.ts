import type { CahierInfirmerieEntreeDto, DirecteurInfos, ProfilUtilisateurDTO } from "../types/api";
import { RoleSysteme } from "../enums/RoleSysteme";
import { peutGererMembresEquipeSejour } from "./peutGererMembresEquipeSejour";

/**
 * Directeur du séjour, adjoint (GESTION_SEJOURS), ou admin plateforme —
 * aligné sur `SejourVerificationService.aDroitGestionCompleteSurSejour`.
 */
export function aDroitGestionCompleteSurSejour(
  utilisateurTokenId: string | null | undefined,
  roleGlobal: string | null | undefined,
  directeur: DirecteurInfos | null | undefined,
  equipe: ProfilUtilisateurDTO[] | undefined,
): boolean {
  if (roleGlobal === RoleSysteme.ADMIN) return true;
  return peutGererMembresEquipeSejour(utilisateurTokenId, directeur, equipe);
}

/** PUT : admin, gestion complète du séjour, auteur ou soigneur désigné (cf. `verifierDroitModificationEntreeCahierInfirmerie`). */
export function peutModifierEntreeCahierInfirmerie(
  entree: CahierInfirmerieEntreeDto,
  utilisateurTokenId: string | null | undefined,
  roleGlobal: string | null | undefined,
  directeur: DirecteurInfos | null | undefined,
  equipe: ProfilUtilisateurDTO[] | undefined,
): boolean {
  const tid = utilisateurTokenId?.trim();
  if (!tid) return false;
  if (roleGlobal === RoleSysteme.ADMIN) return true;
  if (aDroitGestionCompleteSurSejour(tid, roleGlobal, directeur, equipe)) return true;
  if (entree.createurTokenId?.trim() === tid) return true;
  if (entree.soigneurTokenId?.trim() === tid) return true;
  return false;
}

/** DELETE : même périmètre que la modification (gestion complète, auteur ou soigneur, admin). */
export function peutSupprimerEntreeCahierInfirmerie(
  entree: CahierInfirmerieEntreeDto,
  utilisateurTokenId: string | null | undefined,
  roleGlobal: string | null | undefined,
  directeur: DirecteurInfos | null | undefined,
  equipe: ProfilUtilisateurDTO[] | undefined,
): boolean {
  return peutModifierEntreeCahierInfirmerie(entree, utilisateurTokenId, roleGlobal, directeur, equipe);
}
