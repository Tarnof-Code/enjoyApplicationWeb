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
    const response = await Axios.get("/sejours/liste");
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let addSejour = async (sejourData: SejourInfos) => {
  try {
    const response = await Axios.post("/sejours/creer", sejourData, {
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
    const response = await Axios.put(`/sejours/modifier/${id}`, sejourData);
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
  addSejour,
  updateSejour,
  deleteSejour,
};