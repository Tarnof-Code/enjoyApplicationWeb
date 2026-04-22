import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { HoraireDto, SaveHoraireRequest } from "../types/api";

let getHorairesDuSejour = async (sejourId: number): Promise<HoraireDto[]> => {
    try {
        const response = await Axios.get(`/sejours/${sejourId}/horaires`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération des horaires :", error);
        throw error;
    }
};

let getHoraireById = async (sejourId: number, horaireId: number): Promise<HoraireDto> => {
    try {
        const response = await Axios.get(`/sejours/${sejourId}/horaires/${horaireId}`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération de l'horaire :", error);
        throw error;
    }
};

let creerHoraire = async (sejourId: number, request: SaveHoraireRequest): Promise<HoraireDto> => {
    try {
        const response = await Axios.post(`/sejours/${sejourId}/horaires`, request);
        validateResponseStatus(response, 201);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création de l'horaire",
            logContext: "Erreur lors de la création de l'horaire",
        });
    }
};

let modifierHoraire = async (
    sejourId: number,
    horaireId: number,
    request: SaveHoraireRequest
): Promise<HoraireDto> => {
    try {
        const response = await Axios.put(`/sejours/${sejourId}/horaires/${horaireId}`, request);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la modification de l'horaire",
            logContext: "Erreur lors de la modification de l'horaire",
        });
    }
};

let supprimerHoraire = async (sejourId: number, horaireId: number) => {
    try {
        const response = await Axios.delete(`/sejours/${sejourId}/horaires/${horaireId}`);
        validateResponseStatus(response, 204);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression de l'horaire",
            logContext: "Erreur lors de la suppression de l'horaire",
        });
    }
};

export const sejourHoraireService = {
    getHorairesDuSejour,
    getHoraireById,
    creerHoraire,
    modifierHoraire,
    supprimerHoraire,
};
