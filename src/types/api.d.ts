/**
 * Types API synchronisés avec les DTOs Java du backend
 * 
 * Ce fichier définit les interfaces TypeScript correspondant exactement
 * aux DTOs et payloads utilisés dans l'API REST.
 * 
 * Note: Les dates Java (Date, Instant) sont sérialisées en strings ISO 8601
 * par Jackson, donc elles sont typées comme `string` ici.
 * 
 * Ce fichier est une référence centralisée et peut être utilisé progressivement
 * dans les nouveaux fichiers ou pour remplacer les types locaux existants.
 */

import { RoleSejour } from "../enums/RoleSejour";
import { RoleSysteme } from "../enums/RoleSysteme";

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Correspond à SejourDTO.java
 * DTO utilisé pour retourner les informations d'un séjour
 */
export interface SejourDTO {
  id: number;
  nom: string;
  description: string;
  dateDebut: string;
  dateFin: string; 
  lieuDuSejour: string;
  directeur?: DirecteurInfos; 
  equipe?: ProfilUtilisateurDTO[]; 
}

/**
 * Correspond à SejourDTO.DirecteurInfos (classe interne)
 * Informations sur le directeur d'un séjour
 */
export interface DirecteurInfos {
  tokenId: string;
  nom: string;
  prenom: string;
}

/**
 * Correspond à ProfilUtilisateurDTO.java
 * DTO utilisé pour retourner les informations d'un utilisateur
 */
export interface ProfilUtilisateurDTO {
  tokenId: string;
  role: RoleSysteme | string;
  roleSejour?: RoleSejour; 
  nom: string;
  prenom: string;
  genre: string;
  email: string;
  telephone: string;
  dateNaissance: string; 
  dateExpirationCompte: string; 
}

// ============================================================================
// Request Payloads
// ============================================================================

/**
 * Correspond à CreateSejourRequest.java
 * Payload pour créer ou modifier un séjour
 */
export interface CreateSejourRequest {
  nom: string;
  description: string;
  dateDebut: string; 
  dateFin: string; 
  lieuDuSejour: string;
  directeurTokenId?: string; // Optionnel
}

/**
 * Correspond à MembreEquipeRequest.java
 * Payload pour ajouter un membre existant à une équipe
 */
export interface MembreEquipeRequest {
  tokenId: string;
  roleSejour: RoleSejour;
}

/**
 * Correspond à RegisterRequest.java
 * Payload pour créer un nouvel utilisateur
 */
export interface RegisterRequest {
  prenom: string;
  nom: string;
  genre: string;
  dateNaissance: string; 
  telephone: string;
  email: string;
  motDePasse: string;
  dateExpiration?: string; 
  role: RoleSysteme;
  roleSejour?: RoleSejour; 
}

/**
 * Correspond à UpdateUserRequest.java
 * Payload pour mettre à jour les informations d'un utilisateur
 */
export interface UpdateUserRequest {
  tokenId: string;
  prenom: string;
  nom: string;
  genre: string;
  email: string;
  telephone: string;
  dateNaissance: string; 
  role?: RoleSysteme; 
  dateExpirationCompte?: string; 
}

/**
 * Correspond à AuthenticationRequest.java
 * Payload pour l'authentification (connexion)
 */
export interface AuthenticationRequest {
  email: string;
  motDePasse: string;
}

/**
 * Correspond à ChangePasswordRequest.java
 * Payload pour changer le mot de passe d'un utilisateur
 * - Pour un admin : ancienMotDePasse n'est pas requis
 * - Pour un utilisateur standard : ancienMotDePasse est obligatoire
 */
export interface ChangePasswordRequest {
  tokenId: string;
  ancienMotDePasse?: string; // Requis uniquement pour les non-admins
  nouveauMotDePasse: string;
}

// ============================================================================
// Response Payloads
// ============================================================================

/**
 * Correspond à AuthenticationResponse.java
 * Réponse après authentification réussie
 */
export interface AuthenticationResponse {
  role?: RoleSysteme;
  tokenId?: string;
  access_token?: string; 
  refresh_token?: string; 
  errorMessage?: string;
}

/**
 * Correspond à RefreshTokenResponse.java
 * Réponse après rafraîchissement du token
 */
export interface RefreshTokenResponse {
  access_token: string; 
  refresh_token: string; 
  token_type: string; 
  role: RoleSysteme;
}

/**
 * Correspond à ErrorResponse.java
 * Format standardisé des erreurs API
 */
export interface ErrorResponse {
  status: number;
  error: string;
  timestamp: string; 
  message: string;
  path?: string; 
  errors?: string[]; 
}
