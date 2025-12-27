export enum RoleSysteme {
    ADMIN = 'ADMIN',
    DIRECTION = 'DIRECTION',
    BASIC_USER = 'BASIC_USER'
}

export const RoleSystemeLabels: Record<RoleSysteme, string> = {
    [RoleSysteme.ADMIN]: 'Admin',
    [RoleSysteme.DIRECTION]: 'Direction',
    [RoleSysteme.BASIC_USER]: 'Utilisateur'
}