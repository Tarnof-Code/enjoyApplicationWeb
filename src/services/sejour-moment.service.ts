import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { MomentDto, ReorderMomentsRequest, SaveMomentRequest } from "../types/api";

let getMomentsDuSejour = async (sejourId: number): Promise<MomentDto[]> => {
    try {
        const response = await Axios.get(`/sejours/${sejourId}/moments`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération des moments :", error);
        throw error;
    }
};

let getMomentById = async (sejourId: number, momentId: number): Promise<MomentDto> => {
    try {
        const response = await Axios.get(`/sejours/${sejourId}/moments/${momentId}`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération du moment :", error);
        throw error;
    }
};

let creerMoment = async (sejourId: number, request: SaveMomentRequest): Promise<MomentDto> => {
    try {
        const response = await Axios.post(`/sejours/${sejourId}/moments`, request);
        validateResponseStatus(response, 201);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création du moment",
            logContext: "Erreur lors de la création du moment",
        });
    }
};

let modifierMoment = async (
    sejourId: number,
    momentId: number,
    request: SaveMomentRequest
): Promise<MomentDto> => {
    try {
        const response = await Axios.put(`/sejours/${sejourId}/moments/${momentId}`, request);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la modification du moment",
            logContext: "Erreur lors de la modification du moment",
        });
    }
};

let supprimerMoment = async (sejourId: number, momentId: number) => {
    try {
        const response = await Axios.delete(`/sejours/${sejourId}/moments/${momentId}`);
        validateResponseStatus(response, 204);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression du moment",
            logContext: "Erreur lors de la suppression du moment",
        });
    }
};

let reordonnerMoments = async (
    sejourId: number,
    request: ReorderMomentsRequest
): Promise<MomentDto[]> => {
    try {
        const response = await Axios.put(`/sejours/${sejourId}/moments/reorder`, request);
        validateResponseStatus(response, 200);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du réordonnancement des moments",
            logContext: "Erreur lors du réordonnancement des moments",
        });
    }
};

export const sejourMomentService = {
    getMomentsDuSejour,
    getMomentById,
    creerMoment,
    modifierMoment,
    supprimerMoment,
    reordonnerMoments,
};
