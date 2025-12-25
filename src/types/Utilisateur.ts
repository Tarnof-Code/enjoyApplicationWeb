import { RoleSejour } from "../enums/RoleSejour";
import { RoleSysteme } from "../enums/RoleSysteme";

export interface Utilisateur {
  nom: string;
  prenom: string;
  dateNaissance: number;
  role: RoleSysteme | string; // Rôle système (enum RoleSysteme)
  roleSejour?: RoleSejour; // Rôle de séjour (enum) - peut être null si pas dans un séjour
  genre: string;
  email: string;
  telephone: string;
  dateExpirationCompte: number;
  tokenId?: string;
}
