import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { SaveTypeActiviteRequest, TypeActiviteDto } from "../types/api";

let getTypesActiviteDuSejour = async (sejourId: number): Promise<TypeActiviteDto[]> => {
    try {
        const response = await Axios.get(`/sejours/${sejourId}/types-activite`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération des types d'activité :", error);
        throw error;
    }
};

let getTypeActiviteById = async (sejourId: number, typeId: number): Promise<TypeActiviteDto> => {
    try {
        const response = await Axios.get(`/sejours/${sejourId}/types-activite/${typeId}`);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de la récupération du type d'activité :", error);
        throw error;
    }
};

let creerTypeActivite = async (sejourId: number, request: SaveTypeActiviteRequest): Promise<TypeActiviteDto> => {
    try {
        const response = await Axios.post(`/sejours/${sejourId}/types-activite`, request);
        validateResponseStatus(response, 201);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création du type d'activité",
            logContext: "Erreur lors de la création du type d'activité",
        });
    }
};

let modifierTypeActivite = async (
    sejourId: number,
    typeId: number,
    request: SaveTypeActiviteRequest
): Promise<TypeActiviteDto> => {
    try {
        const response = await Axios.put(`/sejours/${sejourId}/types-activite/${typeId}`, request);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la modification du type d'activité",
            logContext: "Erreur lors de la modification du type d'activité",
        });
    }
};

let supprimerTypeActivite = async (sejourId: number, typeId: number) => {
    try {
        const response = await Axios.delete(`/sejours/${sejourId}/types-activite/${typeId}`);
        validateResponseStatus(response, 204);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression du type d'activité",
            logContext: "Erreur lors de la suppression du type d'activité",
        });
    }
};

export const sejourTypeActiviteService = {
    getTypesActiviteDuSejour,
    getTypeActiviteById,
    creerTypeActivite,
    modifierTypeActivite,
    supprimerTypeActivite,
};
