import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { LieuDto, SaveLieuRequest } from "../types/api";

let getLieuxDuSejour = async (sejourId: number): Promise<LieuDto[]> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/lieux`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des lieux :", error);
    throw error;
  }
};

let getLieuById = async (sejourId: number, lieuId: number): Promise<LieuDto> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/lieux/${lieuId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du lieu :", error);
    throw error;
  }
};

let creerLieu = async (sejourId: number, request: SaveLieuRequest): Promise<LieuDto> => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/lieux`, request);
    validateResponseStatus(response, 201);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la création du lieu",
      logContext: "Erreur lors de la création du lieu",
    });
  }
};

let modifierLieu = async (sejourId: number, lieuId: number, request: SaveLieuRequest): Promise<LieuDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/lieux/${lieuId}`, request);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification du lieu",
      logContext: "Erreur lors de la modification du lieu",
    });
  }
};

let supprimerLieu = async (sejourId: number, lieuId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/lieux/${lieuId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression du lieu",
      logContext: "Erreur lors de la suppression du lieu",
    });
  }
};

export const sejourLieuService = {
  getLieuxDuSejour,
  getLieuById,
  creerLieu,
  modifierLieu,
  supprimerLieu,
};
