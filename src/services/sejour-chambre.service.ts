import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import {
  AjouterReferentRequest,
  AffecterOccupantChambreRequest,
  AffecterOccupantsEnfantsRequest,
  AffecterOccupantsEquipeRequest,
  ChambreDto,
  SaveChambreRequest,
} from "../types/api";

let getChambresDuSejour = async (sejourId: number): Promise<ChambreDto[]> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/chambres`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des chambres :", error);
    throw error;
  }
};

let getChambreById = async (sejourId: number, chambreId: number): Promise<ChambreDto> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/chambres/${chambreId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de la chambre :", error);
    throw error;
  }
};

let creerChambre = async (sejourId: number, request: SaveChambreRequest): Promise<ChambreDto> => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/chambres`, request);
    validateResponseStatus(response, 201);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la création de la chambre",
      logContext: "Erreur lors de la création de la chambre",
    });
  }
};

let modifierChambre = async (
  sejourId: number,
  chambreId: number,
  request: SaveChambreRequest
): Promise<ChambreDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/chambres/${chambreId}`, request);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification de la chambre",
      logContext: "Erreur lors de la modification de la chambre",
    });
  }
};

let supprimerChambre = async (sejourId: number, chambreId: number): Promise<void> => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/chambres/${chambreId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression de la chambre",
      logContext: "Erreur lors de la suppression de la chambre",
    });
  }
};

let ajouterReferent = async (sejourId: number, chambreId: number, request: AjouterReferentRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/chambres/${chambreId}/referents`, request);
    validateResponseStatus(response, 201);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'ajout du référent",
      logContext: "Erreur lors de l'ajout du référent à la chambre",
    });
  }
};

let retirerReferent = async (sejourId: number, chambreId: number, referentTokenId: string) => {
  try {
    const response = await Axios.delete(
      `/sejours/${sejourId}/chambres/${chambreId}/referents/${referentTokenId}`
    );
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du retrait du référent",
      logContext: "Erreur lors du retrait du référent de la chambre",
    });
  }
};

let affecterEnfant = async (
  sejourId: number,
  chambreId: number,
  enfantId: number,
  request?: AffecterOccupantChambreRequest | null
): Promise<ChambreDto> => {
  try {
    const response = await Axios.post(
      `/sejours/${sejourId}/chambres/${chambreId}/occupants/enfants/${enfantId}`,
      request?.numeroLit != null ? request : undefined
    );
    validateResponseStatus(response, 200);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'affectation de l'enfant à la chambre",
      logContext: "Erreur lors de l'affectation de l'enfant à la chambre",
    });
  }
};

let affecterEnfants = async (
  sejourId: number,
  chambreId: number,
  request: AffecterOccupantsEnfantsRequest
): Promise<ChambreDto> => {
  try {
    const response = await Axios.post(
      `/sejours/${sejourId}/chambres/${chambreId}/occupants/enfants`,
      request
    );
    validateResponseStatus(response, 200);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'affectation des enfants à la chambre",
      logContext: "Erreur lors de l'affectation des enfants à la chambre",
    });
  }
};

let retirerEnfant = async (sejourId: number, chambreId: number, enfantId: number): Promise<void> => {
  try {
    const response = await Axios.delete(
      `/sejours/${sejourId}/chambres/${chambreId}/occupants/enfants/${enfantId}`
    );
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du retrait de l'enfant de la chambre",
      logContext: "Erreur lors du retrait de l'enfant de la chambre",
    });
  }
};

let affecterMembreEquipe = async (
  sejourId: number,
  chambreId: number,
  membreTokenId: string,
  request?: AffecterOccupantChambreRequest | null
): Promise<ChambreDto> => {
  try {
    const response = await Axios.post(
      `/sejours/${sejourId}/chambres/${chambreId}/occupants/equipe/${membreTokenId}`,
      request?.numeroLit != null ? request : undefined
    );
    validateResponseStatus(response, 200);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'affectation du membre à la chambre",
      logContext: "Erreur lors de l'affectation du membre à la chambre",
    });
  }
};

let affecterMembresEquipe = async (
  sejourId: number,
  chambreId: number,
  request: AffecterOccupantsEquipeRequest
): Promise<ChambreDto> => {
  try {
    const response = await Axios.post(
      `/sejours/${sejourId}/chambres/${chambreId}/occupants/equipe`,
      request
    );
    validateResponseStatus(response, 200);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'affectation des membres à la chambre",
      logContext: "Erreur lors de l'affectation des membres à la chambre",
    });
  }
};

let retirerMembreEquipe = async (
  sejourId: number,
  chambreId: number,
  membreTokenId: string
): Promise<void> => {
  try {
    const response = await Axios.delete(
      `/sejours/${sejourId}/chambres/${chambreId}/occupants/equipe/${membreTokenId}`
    );
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du retrait du membre de la chambre",
      logContext: "Erreur lors du retrait du membre de la chambre",
    });
  }
};

export const sejourChambreService = {
  getChambresDuSejour,
  getChambreById,
  creerChambre,
  modifierChambre,
  supprimerChambre,
  ajouterReferent,
  retirerReferent,
  affecterEnfant,
  affecterEnfants,
  retirerEnfant,
  affecterMembreEquipe,
  affecterMembresEquipe,
  retirerMembreEquipe,
};
