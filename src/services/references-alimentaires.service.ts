import Axios from "./caller.service";
import { adaptAxiosError } from "../helpers/axiosError";
import {
    ReferenceAlimentaireDto,
    ReferenceAlimentaireType,
    SaveReferenceAlimentaireRequest,
    UpdateReferenceAlimentaireRequest,
} from "../types/api";

export function trierReferencesAlimentaires(refs: ReferenceAlimentaireDto[]): ReferenceAlimentaireDto[] {
    return [...refs].sort((a, b) => a.ordre - b.ordre || a.id - b.id);
}

async function getReferencesAlimentaires(type?: ReferenceAlimentaireType): Promise<ReferenceAlimentaireDto[]> {
    try {
        const response = await Axios.get<ReferenceAlimentaireDto[]>("/references-alimentaires", {
            params: type ? { type } : undefined,
        });
        return response.data ?? [];
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors du chargement des références alimentaires",
            logContext: "references-alimentaires getReferencesAlimentaires",
        });
    }
}

async function creerReference(body: SaveReferenceAlimentaireRequest): Promise<ReferenceAlimentaireDto> {
    try {
        const response = await Axios.post<ReferenceAlimentaireDto>("/references-alimentaires", body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la création de la référence",
            logContext: "references-alimentaires creerReference",
            preserveResponseData: true,
        });
    }
}

async function modifierReference(id: number, body: UpdateReferenceAlimentaireRequest): Promise<ReferenceAlimentaireDto> {
    try {
        const response = await Axios.put<ReferenceAlimentaireDto>(`/references-alimentaires/${id}`, body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la mise à jour de la référence",
            logContext: "references-alimentaires modifierReference",
            preserveResponseData: true,
        });
    }
}

async function supprimerReference(id: number): Promise<void> {
    try {
        await Axios.delete(`/references-alimentaires/${id}`);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Erreur lors de la suppression de la référence",
            logContext: "references-alimentaires supprimerReference",
            preserveResponseData: true,
        });
    }
}

export const referencesAlimentairesService = {
    getReferencesAlimentaires,
    creerReference,
    modifierReference,
    supprimerReference,
};
