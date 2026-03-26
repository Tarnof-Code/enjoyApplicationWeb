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
 * Correspond à SejourDto.java (record) — champs date en java.util.Date.
 * JSON : souvent chaîne ISO 8601 (cf. AI_MEMORY.md) ; selon Jackson, timestamp ms (number) possible.
 */
export interface SejourDTO {
  id: number;
  nom: string;
  description: string;
  dateDebut: string | number;
  dateFin: string | number;
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

/**
 * Correspond à EnfantDto.java
 * DTO utilisé pour retourner les informations d'un enfant
 * Note: L'entité Enfant contient uniquement les informations personnelles de l'enfant
 * (nom, prénom, genre, date de naissance, niveau scolaire), sans les informations des parents.
 */
export interface EnfantDto {
  id: number;
  nom: string;
  prenom: string;
  genre: string; // Genre enum (Masculin, Féminin)
  dateNaissance: string; // Date sérialisée en ISO 8601
  niveauScolaire: string; // NiveauScolaire enum
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

/**
 * Correspond à AddEnfantRequest.java
 * Payload pour ajouter un enfant à un séjour
 */
export interface AddEnfantRequest {
  enfantId: number;
}

/**
 * Payload pour créer un nouvel enfant et l'ajouter à un séjour
 * Note: Contient uniquement les informations personnelles de l'enfant,
 * sans les informations des parents.
 */
export interface CreateEnfantRequest {
  nom: string;
  prenom: string;
  genre: string; // Masculin ou Féminin
  dateNaissance: string; // Date au format ISO 8601
  niveauScolaire: string; // PS, MS, GS, CP, CE1, CE2, CM1, CM2, SIXIEME, CINQUIEME, QUATRIEME, TROISIEME, DEUXIEME, PREMIERE, TERMINALE
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

/**
 * Correspond à DossierEnfantDto.java
 * DTO pour les informations de dossier d'un enfant (contacts parents, médical, traitements)
 */
export interface DossierEnfantDto {
  id: number;
  enfantId: number;
  emailParent1: string | null;
  telephoneParent1: string | null;
  emailParent2: string | null;
  telephoneParent2: string | null;
  informationsMedicales: string | null;
  pai: string | null;
  informationsAlimentaires: string | null;
  traitementMatin: string | null;
  traitementMidi: string | null;
  traitementSoir: string | null;
  traitementSiBesoin: string | null;
  autresInformations: string | null;
  aPrendreEnSortie: string | null;
}

/**
 * Correspond à UpdateDossierEnfantRequest.java
 * Payload pour modifier un dossier enfant (tous les champs doivent être envoyés)
 */
export type UpdateDossierEnfantRequest = Omit<DossierEnfantDto, 'id' | 'enfantId'>;

/**
 * Correspond à ExcelImportResponse.java
 * Réponse après import Excel d'enfants
 */
export interface ExcelImportResponse {
  totalLignes: number;
  enfantsCrees: number;
  enfantsDejaExistants: number;
  erreurs: number;
  messagesErreur: string[];
}

/**
 * Correspond à ExcelImportColumnSpec.java
 * Spécification d'une colonne pour l'import Excel
 */
export interface ExcelImportColumnSpec {
  champ: string;
  libelle: string;
  motsCles: string[];
  obligatoire: boolean;
}

/**
 * Correspond à ExcelImportSpecResponse.java
 * Notice d'import Excel (colonnes obligatoires, optionnelles, formats acceptés)
 */
export interface ExcelImportSpecResponse {
  colonnesObligatoires: ExcelImportColumnSpec[];
  colonnesOptionnelles: ExcelImportColumnSpec[];
  formatsAcceptes: string[];
}

// ============================================================================
// Groupes
// ============================================================================

/** Type de regroupement : manuel, par âge ou par niveau scolaire */
export type TypeGroupe = 'THEMATIQUE' | 'AGE' | 'NIVEAU_SCOLAIRE';

/**
 * Correspond à AjouterReferentRequest.java
 * Payload pour ajouter un référent à un groupe
 */
export interface AjouterReferentRequest {
  referentTokenId: string;
}

/**
 * Correspond à CreateGroupeRequest.java
 * Payload pour créer ou modifier un groupe
 */
export interface CreateGroupeRequest {
  nom: string;
  description?: string | null;
  typeGroupe: TypeGroupe;
  ageMin?: number | null;
  ageMax?: number | null;
  niveauScolaireMin?: string | null;
  niveauScolaireMax?: string | null;
}

/**
 * Correspond à ReferentInfos (classe interne ou DTO)
 * Informations sur un référent d'un groupe
 */
export interface ReferentInfos {
  tokenId: string;
  nom: string;
  prenom: string;
}

/**
 * Correspond à GroupeDto.java
 * DTO pour un groupe d'enfants d'un séjour
 */
export interface GroupeDto {
  id: number;
  nom: string;
  description: string | null;
  typeGroupe: TypeGroupe;
  ageMin: number | null;
  ageMax: number | null;
  niveauScolaireMin: string | null;
  niveauScolaireMax: string | null;
  sejourId: number;
  enfants: EnfantDto[];
  referents: ReferentInfos[];
}

// ============================================================================
// Activités
// ============================================================================

/**
 * Correspond à ActiviteDto.MembreEquipeInfo (record imbriqué)
 */
export interface ActiviteMembreEquipeInfo {
  tokenId: string;
  nom: string;
  prenom: string;
}

/**
 * Correspond à ActiviteDto.java
 */
export interface ActiviteDto {
  id: number;
  /** LocalDate sérialisée en chaîne ISO (yyyy-MM-dd) en général */
  date: string;
  nom: string;
  description: string | null;
  sejourId: number;
  membres: ActiviteMembreEquipeInfo[];
  groupeIds: number[];
}

/**
 * Correspond à CreateActiviteRequest.java (record)
 * - date : LocalDate → JSON yyyy-MM-dd
 * - nom : @NotBlank, @Size(max=200)
 * - description : optionnelle, @Size(max=5000)
 * - membreTokenIds : @NotEmpty, éléments @NotBlank
 * - groupeIds : @NotEmpty, éléments @NotNull
 */
export interface CreateActiviteRequest {
  /** LocalDate côté API */
  date: string;
  /** max 200 caractères */
  nom: string;
  /** max 5000 caractères ; omettre ou null si absent */
  description?: string | null;
  membreTokenIds: string[];
  groupeIds: number[];
}

/**
 * Correspond à UpdateActiviteRequest.java
 */
export interface UpdateActiviteRequest {
  date: string;
  nom: string;
  description?: string | null;
  membreTokenIds: string[];
  groupeIds: number[];
}
