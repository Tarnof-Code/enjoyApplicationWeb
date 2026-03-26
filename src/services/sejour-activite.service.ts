import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { ActiviteDto, CreateActiviteRequest, UpdateActiviteRequest } from "../types/api";

let getActivitesDuSejour = async (sejourId: number): Promise<ActiviteDto[]> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/activites`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des activités :", error);
    throw error;
  }
};

let getActiviteById = async (sejourId: number, activiteId: number): Promise<ActiviteDto> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/activites/${activiteId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'activité :", error);
    throw error;
  }
};

let creerActivite = async (sejourId: number, request: CreateActiviteRequest): Promise<ActiviteDto> => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/activites`, request);
    validateResponseStatus(response, 201);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la création de l'activité",
      logContext: "Erreur lors de la création de l'activité",
    });
  }
};

let modifierActivite = async (
  sejourId: number,
  activiteId: number,
  request: UpdateActiviteRequest
): Promise<ActiviteDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/activites/${activiteId}`, request);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification de l'activité",
      logContext: "Erreur lors de la modification de l'activité",
    });
  }
};

let supprimerActivite = async (sejourId: number, activiteId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/activites/${activiteId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression de l'activité",
      logContext: "Erreur lors de la suppression de l'activité",
    });
  }
};

export const sejourActiviteService = {
  getActivitesDuSejour,
  getActiviteById,
  creerActivite,
  modifierActivite,
  supprimerActivite,
};
