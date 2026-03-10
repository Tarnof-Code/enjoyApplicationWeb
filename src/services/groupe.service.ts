import Axios from "./caller.service";
import { CreateGroupeRequest, GroupeDto } from "../types/api";

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
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return response.data;
  } catch (error: any) {
    console.error("Erreur lors de la création du groupe :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la création du groupe";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

let modifierGroupe = async (sejourId: number, groupeId: number, request: CreateGroupeRequest): Promise<GroupeDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/groupes/${groupeId}`, request);
    return response.data;
  } catch (error: any) {
    console.error("Erreur lors de la modification du groupe :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la modification du groupe";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

let supprimerGroupe = async (sejourId: number, groupeId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/groupes/${groupeId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
  } catch (error: any) {
    console.error("Erreur lors de la suppression du groupe :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la suppression du groupe";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

let ajouterEnfantAuGroupe = async (sejourId: number, groupeId: number, enfantId: number) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/groupes/${groupeId}/enfants/${enfantId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
  } catch (error: any) {
    console.error("Erreur lors de l'ajout de l'enfant au groupe :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de l'ajout de l'enfant au groupe";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

let retirerEnfantDuGroupe = async (sejourId: number, groupeId: number, enfantId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/groupes/${groupeId}/enfants/${enfantId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
  } catch (error: any) {
    console.error("Erreur lors du retrait de l'enfant du groupe :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors du retrait de l'enfant du groupe";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

let ajouterReferent = async (sejourId: number, groupeId: number, referentTokenId: string) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/groupes/${groupeId}/referents`, { referentTokenId });
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
  } catch (error: any) {
    console.error("Erreur lors de l'ajout du référent :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de l'ajout du référent";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

let retirerReferent = async (sejourId: number, groupeId: number, referentTokenId: string) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/groupes/${groupeId}/referents/${referentTokenId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
  } catch (error: any) {
    console.error("Erreur lors du retrait du référent :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors du retrait du référent";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = { ...error.response, status: error.response.status, data: { error: errorMessage } };
      throw adaptedError;
    }
    throw error;
  }
};

export const groupeService = {
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
