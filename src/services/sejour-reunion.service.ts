import Axios from "./caller.service";
import { adaptAxiosError } from "../helpers/axiosError";
import type { ReunionDto, SaveReunionRequest } from "../types/api";

async function listerReunions(sejourId: number): Promise<ReunionDto[]> {
    try {
        const response = await Axios.get<ReunionDto[]>(`/sejours/${sejourId}/reunions`);
        return response.data ?? [];
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement des réunions",
            logContext: "sejour-reunion listerReunions",
        });
    }
}

async function getReunion(sejourId: number, reunionId: number): Promise<ReunionDto> {
    try {
        const response = await Axios.get<ReunionDto>(
            `/sejours/${sejourId}/reunions/${reunionId}`,
        );
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement de la réunion",
            logContext: "sejour-reunion getReunion",
        });
    }
}

async function creerReunion(sejourId: number, body: SaveReunionRequest): Promise<ReunionDto> {
    try {
        const response = await Axios.post<ReunionDto>(`/sejours/${sejourId}/reunions`, body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création du compte rendu",
            logContext: "sejour-reunion creerReunion",
            preserveResponseData: true,
        });
    }
}

async function modifierReunion(
    sejourId: number,
    reunionId: number,
    body: SaveReunionRequest,
): Promise<ReunionDto> {
    try {
        const response = await Axios.put<ReunionDto>(
            `/sejours/${sejourId}/reunions/${reunionId}`,
            body,
        );
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la mise à jour du compte rendu",
            logContext: "sejour-reunion modifierReunion",
            preserveResponseData: true,
        });
    }
}

async function supprimerReunion(sejourId: number, reunionId: number): Promise<void> {
    try {
        await Axios.delete(`/sejours/${sejourId}/reunions/${reunionId}`);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression du compte rendu",
            logContext: "sejour-reunion supprimerReunion",
        });
    }
}

export const sejourReunionService = {
    listerReunions,
    getReunion,
    creerReunion,
    modifierReunion,
    supprimerReunion,
};
