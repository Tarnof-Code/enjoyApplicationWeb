import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { AjouterReferentRequest, CreateGroupeRequest, GroupeDto } from "../types/api";

let getGroupesDuSejour = async (sejourId: number): Promise<GroupeDto[]> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/groupes`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des groupes :", error);
    throw error;
  }
};

let getGroupeById = async (sejourId: number, groupeId: number): Promise<GroupeDto> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/groupes/${groupeId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du groupe :", error);
    throw error;
  }
};

let creerGroupe = async (sejourId: number, request: CreateGroupeRequest): Promise<GroupeDto> => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/groupes`, request);
    validateResponseStatus(response, 201);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la création du groupe",
      logContext: "Erreur lors de la création du groupe",
    });
  }
};

let modifierGroupe = async (sejourId: number, groupeId: number, request: CreateGroupeRequest): Promise<GroupeDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/groupes/${groupeId}`, request);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification du groupe",
      logContext: "Erreur lors de la modification du groupe",
    });
  }
};

let supprimerGroupe = async (sejourId: number, groupeId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/groupes/${groupeId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression du groupe",
      logContext: "Erreur lors de la suppression du groupe",
    });
  }
};

let ajouterEnfantAuGroupe = async (sejourId: number, groupeId: number, enfantId: number) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/groupes/${groupeId}/enfants/${enfantId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'ajout de l'enfant au groupe",
      logContext: "Erreur lors de l'ajout de l'enfant au groupe",
    });
  }
};

let retirerEnfantDuGroupe = async (sejourId: number, groupeId: number, enfantId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/groupes/${groupeId}/enfants/${enfantId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du retrait de l'enfant du groupe",
      logContext: "Erreur lors du retrait de l'enfant du groupe",
    });
  }
};

let ajouterReferent = async (sejourId: number, groupeId: number, request: AjouterReferentRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/groupes/${groupeId}/referents`, request);
    validateResponseStatus(response, 201);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'ajout du référent",
      logContext: "Erreur lors de l'ajout du référent",
    });
  }
};

let retirerReferent = async (sejourId: number, groupeId: number, referentTokenId: string) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/groupes/${groupeId}/referents/${referentTokenId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du retrait du référent",
      logContext: "Erreur lors du retrait du référent",
    });
  }
};

export const sejourGroupeService = {
  getGroupesDuSejour,
  getGroupeById,
  creerGroupe,
  modifierGroupe,
  supprimerGroupe,
  ajouterEnfantAuGroupe,
  retirerEnfantDuGroupe,
  ajouterReferent,
  retirerReferent,
};
