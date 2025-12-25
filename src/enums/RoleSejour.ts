export enum RoleSejour {
  ANIM = 'ANIM',
  AS = 'AS',
  ADJOINT = 'ADJOINT',
  SB = 'SB',
  AUTRE = 'AUTRE'
}

export const RoleSejourLabels: Record<RoleSejour, string> = {
  [RoleSejour.ANIM]: 'Animateur',
  [RoleSejour.AS]: 'Assistant sanitaire',
  [RoleSejour.ADJOINT]: 'Adjoint',
  [RoleSejour.SB]: 'Surveillant de baignade',
  [RoleSejour.AUTRE]: 'Autre'
};

