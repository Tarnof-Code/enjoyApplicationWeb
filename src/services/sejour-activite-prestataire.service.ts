import Axios from "./caller.service";
import { adaptAxiosError } from "../helpers/axiosError";
import type { ActivitePrestataireDto, SaveActivitePrestataireRequest } from "../types/api";

async function listerActivitesPrestataires(sejourId: number): Promise<ActivitePrestataireDto[]> {
    try {
        const response = await Axios.get<ActivitePrestataireDto[]>(
            `/sejours/${sejourId}/activites-prestataires`,
        );
        return response.data ?? [];
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement des sorties / prestataires",
            logContext: "sejour-activite-prestataire listerActivitesPrestataires",
        });
    }
}

async function getActivitePrestataire(
    sejourId: number,
    activitePrestataireId: number,
): Promise<ActivitePrestataireDto> {
    try {
        const response = await Axios.get<ActivitePrestataireDto>(
            `/sejours/${sejourId}/activites-prestataires/${activitePrestataireId}`,
        );
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement de la sortie / prestataire",
            logContext: "sejour-activite-prestataire getActivitePrestataire",
        });
    }
}

async function creerActivitePrestataire(
    sejourId: number,
    body: SaveActivitePrestataireRequest,
): Promise<ActivitePrestataireDto> {
    try {
        const response = await Axios.post<ActivitePrestataireDto>(
            `/sejours/${sejourId}/activites-prestataires`,
            body,
        );
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création de la sortie / prestataire",
            logContext: "sejour-activite-prestataire creerActivitePrestataire",
            preserveResponseData: true,
        });
    }
}

async function modifierActivitePrestataire(
    sejourId: number,
    activitePrestataireId: number,
    body: SaveActivitePrestataireRequest,
): Promise<ActivitePrestataireDto> {
    try {
        const response = await Axios.put<ActivitePrestataireDto>(
            `/sejours/${sejourId}/activites-prestataires/${activitePrestataireId}`,
            body,
        );
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la mise à jour de la sortie / prestataire",
            logContext: "sejour-activite-prestataire modifierActivitePrestataire",
            preserveResponseData: true,
        });
    }
}

async function supprimerActivitePrestataire(
    sejourId: number,
    activitePrestataireId: number,
): Promise<void> {
    try {
        await Axios.delete(`/sejours/${sejourId}/activites-prestataires/${activitePrestataireId}`);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression de la sortie / prestataire",
            logContext: "sejour-activite-prestataire supprimerActivitePrestataire",
        });
    }
}

export const sejourActivitePrestataireService = {
    listerActivitesPrestataires,
    getActivitePrestataire,
    creerActivitePrestataire,
    modifierActivitePrestataire,
    supprimerActivitePrestataire,
};
