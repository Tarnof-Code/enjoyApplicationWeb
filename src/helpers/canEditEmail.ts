import { RoleSysteme } from "../enums/RoleSysteme";

interface UserRef {
  role?: string | null;
  tokenId?: string | null;
}

export function canEditEmail(currentUser: UserRef, targetUser: UserRef): boolean {
  if (currentUser.role === RoleSysteme.ADMIN) return true;
  if (
    currentUser.role === RoleSysteme.DIRECTION &&
    targetUser.role === RoleSysteme.BASIC_USER &&
    currentUser.tokenId &&
    targetUser.tokenId &&
    currentUser.tokenId !== targetUser.tokenId
  ) {
    return true;
  }
  return false;
}

export function getEmailReadOnlyMessage(role: string | null | undefined): string | null {
  if (role === RoleSysteme.BASIC_USER) {
    return "Seul un directeur ou un administrateur peut modifier votre adresse email.";
  }
  if (role === RoleSysteme.DIRECTION) {
    return "Seul un administrateur peut modifier votre adresse email.";
  }
  return null;
}
