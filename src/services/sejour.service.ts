import { accountService } from "./account.service";
import Axios from "./caller.service";
import { trierUtilisateursParNom } from "../helpers/trierUtilisateurs";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { CreateSejourRequest, SejourDTO } from "../types/api";

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
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite lors de la suppression",
      logContext: "Une erreur s'est produite lors de la suppression",
    });
  }
};

export const sejourService = {
  getAllSejours,
  getSejourById,
  getAllSejoursByDirecteur,
  addSejour,
  updateSejour,
  deleteSejour,
};
