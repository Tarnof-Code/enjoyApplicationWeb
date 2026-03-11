import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { MembreEquipeRequest, RegisterRequest } from "../types/api";

let ajouterNouveauMembreEquipe = async (sejourId: number, request: RegisterRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/equipe/nouveau`, request);
    validateResponseStatus(response, 201);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite",
      logContext: "Une erreur s'est produite",
    });
  }
};

let ajouterMembreExistantEquipe = async (sejourId: number, data: MembreEquipeRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/equipe/existant`, data);
    validateResponseStatus(response, 201);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite",
      logContext: "Une erreur s'est produite",
    });
  }
};

let modifierRoleMembreEquipe = async (sejourId: number, membreTokenId: string, roleSejour: string) => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/equipe/${membreTokenId}`, { roleSejour });
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification du rôle du membre",
      logContext: "Erreur lors de la modification du rôle du membre",
    });
  }
};

let supprimerMembreEquipe = async (sejourId: number, userTokenId: string) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/equipe/${userTokenId}`);
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression du membre",
      logContext: "Erreur lors de la suppression du membre",
    });
  }
};

export const sejourEquipeService = {
  ajouterNouveauMembreEquipe,
  ajouterMembreExistantEquipe,
  modifierRoleMembreEquipe,
  supprimerMembreEquipe,
};
