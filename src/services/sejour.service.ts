import { accountService } from "./account.service";
import Axios from "./caller.service";
import { trierUtilisateursParNom } from "../helpers/trierUtilisateurs";
import { CreateSejourRequest, SejourDTO, MembreEquipeRequest, RegisterRequest } from "../types/api";

let getAllSejours = async (): Promise<SejourDTO[]> => {
  try {
    const response = await Axios.get("/sejours");
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let getSejourById = async (id: string): Promise<SejourDTO> => {
  try {
    const response = await Axios.get(`/sejours/${id}`);
    if (response.data && response.data.equipe) {
      response.data.equipe = trierUtilisateursParNom(response.data.equipe);
    }
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

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

let getAllSejoursByDirecteur = async (): Promise<SejourDTO[]> => {
  try {
    const tokenInfo = accountService.getTokenInfo();
    const directeurTokenId = tokenInfo?.payload?.sub;
    if (!directeurTokenId) {
      throw new Error("Impossible de récupérer le token ID du directeur");
    }
    const response = await Axios.get("/sejours/directeur/" + directeurTokenId);
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let addSejour = async (sejourData: CreateSejourRequest): Promise<SejourDTO> => {
  try {
    const response = await Axios.post("/sejours", sejourData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite lors de l'ajout :", error);
    throw error;
  }
};

let updateSejour = async (id: number, sejourData: CreateSejourRequest): Promise<SejourDTO> => {
  try {
    const response = await Axios.put(`/sejours/${id}`, sejourData);
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite lors de la modification :", error);
    throw error;
  }
};

let deleteSejour = async (sejourId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite lors de la suppression :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de la suppression";
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

export const sejourService = {
  getAllSejours,
  getSejourById,
  getAllSejoursByDirecteur,
  ajouterNouveauMembreEquipe,
  ajouterMembreExistantEquipe,
  modifierRoleMembreEquipe,
  supprimerMembreEquipe,
  addSejour,
  updateSejour,
  deleteSejour,
};
