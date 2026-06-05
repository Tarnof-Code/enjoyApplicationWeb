import { RoleSysteme } from "../enums/RoleSysteme";
import { utilisateurService } from "../services/utilisateur.service";
import type { HeaderSejourContextSnapshot } from "./headerSejourContext";

type RoleSurSejour =
  | { kind: "directeur" }
  | { kind: "equipe"; roleSejour: string };

export function roleUtilisateurSurSejour(
  utilisateurTokenId: string | null | undefined,
  snapshot: HeaderSejourContextSnapshot | null | undefined,
): RoleSurSejour | null {
  const tid = utilisateurTokenId?.trim();
  if (!tid || !snapshot) return null;
  if (snapshot.directeur?.tokenId?.trim() === tid) {
    return { kind: "directeur" };
  }
  const membre = snapshot.equipe?.find((m) => m.tokenId?.trim() === tid);
  if (membre?.roleSejour) {
    return { kind: "equipe", roleSejour: membre.roleSejour };
  }
  return null;
}

/**
 * Libellé de rôle affiché (header, badge profil) :
 * — séjour en contexte et utilisateur directeur ou membre d'équipe → rôle sur ce séjour ;
 * — sinon → rôle système (Admin, Directeur, Utilisateur, …).
 */
export function libelleRoleBadgeProfil(
  utilisateurTokenId: string | null | undefined,
  genre: string | null | undefined,
  roleSysteme: string | null | undefined,
  snapshot: HeaderSejourContextSnapshot | null | undefined,
): string {
  const surSejour = roleUtilisateurSurSejour(utilisateurTokenId, snapshot);
  if (surSejour?.kind === "directeur") {
    return utilisateurService.getRoleSystemeByGenre(RoleSysteme.DIRECTION, genre ?? null);
  }
  if (surSejour?.kind === "equipe") {
    return utilisateurService.getRoleSejourByGenre(surSejour.roleSejour, genre ?? null);
  }
  return utilisateurService.getRoleSystemeByGenre(roleSysteme ?? null, genre ?? null);
}
