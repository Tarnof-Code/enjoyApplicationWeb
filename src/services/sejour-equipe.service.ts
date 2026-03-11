import Axios from "./caller.service";
import { MembreEquipeRequest, RegisterRequest } from "../types/api";

let ajouterNouveauMembreEquipe = async (sejourId: number, request: RegisterRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/equipe/nouveau`, request);
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let ajouterMembreExistantEquipe = async (sejourId: number, data: MembreEquipeRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/equipe/existant`, data);
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let modifierRoleMembreEquipe = async (sejourId: number, membreTokenId: string, roleSejour: string) => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/equipe/${membreTokenId}`, { roleSejour });
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la modification du rôle du membre :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la modification du rôle du membre";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let supprimerMembreEquipe = async (sejourId: number, userTokenId: string) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/equipe/${userTokenId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la suppression du membre :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la suppression du membre";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

export const sejourEquipeService = {
  ajouterNouveauMembreEquipe,
  ajouterMembreExistantEquipe,
  modifierRoleMembreEquipe,
  supprimerMembreEquipe,
};
