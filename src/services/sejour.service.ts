import { accountService } from "./account.service";
import Axios from "./caller.service";

interface SejourInfos {
  nom: string;
  description: string;
  lieuDuSejour: string;
  directeurTokenId: string;
  dateDebut: string;
  dateFin: string;
}

let getAllSejours = async () => {
  try {
    const response = await Axios.get("/sejours");
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let getSejourById = async (id: string) => {
  try {
    const response = await Axios.get(`/sejours/${id}`);
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let getAllSejoursByDirecteur = async () => {
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

let addSejour = async (sejourData: SejourInfos) => {
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

let updateSejour = async (id: number, sejourData: SejourInfos) => {
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
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite lors de la suppression :", error);
    throw error;
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