import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { AjouterReferentRequest, ChambreDto, SaveChambreRequest } from "../types/api";

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

export const sejourChambreService = {
  getChambresDuSejour,
  getChambreById,
  creerChambre,
  modifierChambre,
  supprimerChambre,
  ajouterReferent,
  retirerReferent,
};
