import Axios from "./caller.service";
import { adaptAxiosError } from "../helpers/axiosError";
import { MenuRepasDto, ReferencesAlimentairesAgregeesEnfantsDto, SaveMenuRepasRequest } from "../types/api";

export interface ListerMenusParams {
    date?: string;
    dateDebut?: string;
    dateFin?: string;
}

async function getReferencesAlimentairesAgregeesEnfants(
    sejourId: number,
): Promise<ReferencesAlimentairesAgregeesEnfantsDto> {
    try {
        const response = await Axios.get<ReferencesAlimentairesAgregeesEnfantsDto>(
            `/sejours/${sejourId}/references-alimentaires-agregees-enfants`,
        );
        const data = response.data;
        return {
            allergenes: data?.allergenes ?? [],
            regimesEtPreferences: data?.regimesEtPreferences ?? [],
        };
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement des références agrégées",
            logContext: "sejour-menu getReferencesAlimentairesAgregeesEnfants",
        });
    }
}

async function listerMenus(sejourId: number, params: ListerMenusParams): Promise<MenuRepasDto[]> {
    try {
        const response = await Axios.get<MenuRepasDto[]>(`/sejours/${sejourId}/menus`, { params });
        return response.data ?? [];
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement des menus",
            logContext: "sejour-menu listerMenus",
        });
    }
}

async function creerMenu(sejourId: number, body: SaveMenuRepasRequest): Promise<MenuRepasDto> {
    try {
        const response = await Axios.post<MenuRepasDto>(`/sejours/${sejourId}/menus`, body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création du menu",
            logContext: "sejour-menu creerMenu",
            preserveResponseData: true,
        });
    }
}

async function modifierMenu(sejourId: number, menuId: number, body: SaveMenuRepasRequest): Promise<MenuRepasDto> {
    try {
        const response = await Axios.put<MenuRepasDto>(`/sejours/${sejourId}/menus/${menuId}`, body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la mise à jour du menu",
            logContext: "sejour-menu modifierMenu",
            preserveResponseData: true,
        });
    }
}

async function supprimerMenu(sejourId: number, menuId: number): Promise<void> {
    try {
        await Axios.delete(`/sejours/${sejourId}/menus/${menuId}`);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression du menu",
            logContext: "sejour-menu supprimerMenu",
        });
    }
}

export const sejourMenuService = {
    getReferencesAlimentairesAgregeesEnfants,
    listerMenus,
    creerMenu,
    modifierMenu,
    supprimerMenu,
};
