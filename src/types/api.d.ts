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
  /** Identifiant base utilisateurs (ex. affectation animateurs / cellules planning). */
  id: number;
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
// Lieux (salle, terrain, etc. rattachés à un séjour)
// ============================================================================

/** Correspond à EmplacementLieu.java */
export type EmplacementLieu = 'INTERIEUR' | 'EXTERIEUR' | 'HORS_CENTRE';

/**
 * Correspond à LieuDto.java
 */
export interface LieuDto {
  id: number;
  nom: string;
  emplacement: EmplacementLieu;
  /** Capacité max optionnelle */
  nombreMax: number | null;
  sejourId: number;
  /** Si true : plusieurs activités le même jour possibles jusqu'à nombreMaxActivitesSimultanees */
  partageableEntreAnimateurs: boolean;
  /** Max d'activités le même jour sur ce lieu (≥ 2 si partageable) ; null si non partageable */
  nombreMaxActivitesSimultanees: number | null;
}

/**
 * Correspond à SaveLieuRequest.java (création et mise à jour)
 * - nom : obligatoire, max 150
 * - emplacement : obligatoire
 * - nombreMax : optionnel ; si renseigné, doit être strictement positif côté API
 * - partage : si partageableEntreAnimateurs, nombreMaxActivitesSimultanees obligatoire et ≥ 2 ; sinon null
 */
export interface SaveLieuRequest {
  nom: string;
  emplacement: EmplacementLieu;
  nombreMax?: number | null;
  partageableEntreAnimateurs: boolean;
  nombreMaxActivitesSimultanees?: number | null;
}

// ============================================================================
// Moments (créneaux : matin, après-midi, etc. — un séjour)
// ============================================================================

/**
 * Correspond à MomentDto.java
 */
export interface MomentDto {
  id: number;
  nom: string;
  sejourId: number;
  /** Position dans la journée (tri chronologique) ; aligné backend COALESCE(ordre, id) */
  ordre: number;
}

/**
 * Correspond à SaveMomentRequest.java (création / mise à jour)
 */
export interface SaveMomentRequest {
  /** @NotBlank, @Size(max=200) */
  nom: string;
}

/**
 * Correspond à java payload ReorderMomentsRequest — liste complète des ids du séjour dans le nouvel ordre
 */
export interface ReorderMomentsRequest {
  momentIds: number[];
}

// ============================================================================
// Horaires (libellés d'heure par séjour, ex. 8h30 — aligné Horaire.java)
// ============================================================================

/**
 * Correspond à HoraireDto.java
 */
export interface HoraireDto {
  id: number;
  /** Format API : 6h00 … 23h59 (pattern backend) */
  libelle: string;
  sejourId: number;
}

/**
 * Correspond à SaveHoraireRequest.java
 */
export interface SaveHoraireRequest {
  libelle: string;
}

// ============================================================================
// Types d'activité (par séjour)
// ============================================================================

/**
 * Correspond à TypeActiviteDto.java
 */
export interface TypeActiviteDto {
  id: number;
  /** @Size max 100 côté API */
  libelle: string;
  /** true : types système (Sport, Manuel, …) non modifiables / non supprimables */
  predefini: boolean;
  sejourId: number;
}

/**
 * Correspond à SaveTypeActiviteRequest.java
 */
export interface SaveTypeActiviteRequest {
  /** @NotBlank, @Size(max=100) après trim côté service */
  libelle: string;
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
  /** Créneau obligatoire (matin, après-midi, etc.) */
  moment: MomentDto;
  /** Type d'activité du même séjour (obligatoire en base cohérente) */
  typeActivite: TypeActiviteDto;
  membres: ActiviteMembreEquipeInfo[];
  groupeIds: number[];
  /** Lieu rattaché à l'activité (même séjour) ; null si aucun */
  lieu: LieuDto | null;
  /**
   * Renseigné surtout après POST/PUT : avertissement si le lieu était déjà occupé ce jour
   * mais le partage entre animateurs le permet
   */
  avertissementLieu?: string | null;
}

/**
 * Correspond à CreateActiviteRequest.java (record)
 * - date : LocalDate → JSON yyyy-MM-dd
 * - nom : @NotBlank, @Size(max=200)
 * - description : optionnelle, @Size(max=5000)
 * - membreTokenIds : @NotEmpty, éléments @NotBlank
 * - groupeIds : @NotEmpty, éléments @NotNull
 * - lieuId : optionnel (lieu du même séjour)
 * - momentId : obligatoire côté service si au moins un moment existe pour le séjour
 * - typeActiviteId : obligatoire (@NotNull)
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
  lieuId?: number | null;
  momentId?: number | null;
  typeActiviteId: number;
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
  /** null retire le lieu */
  lieuId?: number | null;
  momentId?: number | null;
  typeActiviteId: number;
}

// ============================================================================
// Plannings direction (grilles génériques) — PlanningGrilleController
// ============================================================================

export interface PlanningGrilleSummaryDto {
  id: number;
  sejourId: number;
  titre: string;
  miseAJour: string;
}

export interface PlanningGrilleDetailDto {
  id: number;
  sejourId: number;
  titre: string;
  consigneGlobale: string | null;
  /**
   * Type de libellé imposé à toutes les lignes de cette grille.
   * `null` si aucun type n’a été choisi à la création (« pas de libellé de ligne ») : pas de colonne libellé, pas de saisie.
   */
  sourceLibelleLignes: PlanningLigneLibelleSource | null;
  /**
   * Type de contenu des cellules (même enum que les lignes : saisie libre, groupe, lieu, horaire, moment).
   */
  sourceContenuCellules: PlanningLigneLibelleSource;
  miseAJour: string;
  lignes: PlanningLigneDto[];
}

/** `MEMBRE_EQUIPE` : autorisé pour le contenu des cellules ; pour les libellés de lignes, voir règles API. */
export type PlanningLigneLibelleSource =
  | "SAISIE_LIBRE"
  | "HORAIRE"
  | "MOMENT"
  | "GROUPE"
  | "LIEU"
  | "MEMBRE_EQUIPE";

export interface PlanningLigneDto {
  id: number;
  ordre: number;
  /** Saisie libre ou texte d’en-tête complémentaire selon `sourceLibelleLignes` de la grille. */
  libelleSaisieLibre: string | null;
  libelleRegroupement: string | null;
  libelleMomentId: number | null;
  libelleHoraireId: number | null;
  libelleGroupeId: number | null;
  libelleLieuId: number | null;
  /** Si `sourceLibelleLignes` est `MEMBRE_EQUIPE` : `tokenId` d’un membre d’équipe du séjour. */
  libelleUtilisateurTokenId: string | null;
  cellules: PlanningCelluleDto[];
}

export interface PlanningCelluleDto {
  id: number;
  jour: string;
  /** `tokenId` des animateurs (tableau, peut être vide). */
  membreTokenIds: string[];
  horaireId: number | null;
  horaireLibelle: string | null;
  momentId: number | null;
  groupeId: number | null;
  lieuId: number | null;
  texteLibre: string | null;
}

export interface SavePlanningGrilleRequest {
  titre: string;
  consigneGlobale?: string | null;
  /** Défaut côté API : `SAISIE_LIBRE` si absent ou null. */
  sourceLibelleLignes?: PlanningLigneLibelleSource | null;
  /** Défaut côté API : `SAISIE_LIBRE` si absent ou null. `MEMBRE_EQUIPE` autorisé pour le contenu des cellules. */
  sourceContenuCellules?: PlanningLigneLibelleSource | null;
}

export interface UpdatePlanningGrilleRequest {
  titre: string;
  consigneGlobale?: string | null;
  sourceLibelleLignes?: PlanningLigneLibelleSource | null;
  sourceContenuCellules?: PlanningLigneLibelleSource | null;
}

export interface SavePlanningLigneRequest {
  ordre: number;
  libelleSaisieLibre?: string | null;
  libelleRegroupement?: string | null;
  libelleMomentId?: number | null;
  libelleHoraireId?: number | null;
  libelleGroupeId?: number | null;
  libelleLieuId?: number | null;
  libelleUtilisateurTokenId?: string | null;
}

export type UpdatePlanningLigneRequest = SavePlanningLigneRequest;

export interface PlanningCellulePayload {
  jour: string;
  membreTokenIds?: string[] | null;
  horaireId?: number | null;
  texteLibre?: string | null;
  momentId?: number | null;
  groupeId?: number | null;
  lieuId?: number | null;
}

export interface UpsertPlanningCellulesRequest {
  cellules: PlanningCellulePayload[];
}
