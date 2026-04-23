import Axios from "./caller.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import type {
    PlanningGrilleDetailDto,
    PlanningGrilleSummaryDto,
    PlanningLigneDto,
    PlanningCelluleDto,
    SavePlanningGrilleRequest,
    UpdatePlanningGrilleRequest,
    SavePlanningLigneRequest,
    UpdatePlanningLigneRequest,
    UpsertPlanningCellulesRequest,
} from "../types/api";

const base = (sejourId: number) => `/sejours/${sejourId}/planning-grilles`;

async function listerGrilles(sejourId: number): Promise<PlanningGrilleSummaryDto[]> {
    try {
        const response = await Axios.get(base(sejourId));
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de charger les plannings",
            logContext: "listerGrilles planning-grilles",
        });
    }
}

async function getGrilleDetail(sejourId: number, grilleId: number): Promise<PlanningGrilleDetailDto> {
    try {
        const response = await Axios.get(`${base(sejourId)}/${grilleId}`);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de charger le planning",
            logContext: "getGrilleDetail planning-grilles",
        });
    }
}

async function creerGrille(sejourId: number, body: SavePlanningGrilleRequest): Promise<PlanningGrilleDetailDto> {
    try {
        const response = await Axios.post(base(sejourId), body);
        validateResponseStatus(response, 201);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de créer le planning",
            logContext: "creerGrille planning-grilles",
            preserveResponseData: true,
        });
    }
}

async function modifierGrille(
    sejourId: number,
    grilleId: number,
    body: UpdatePlanningGrilleRequest
): Promise<PlanningGrilleDetailDto> {
    try {
        const response = await Axios.put(`${base(sejourId)}/${grilleId}`, body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de modifier le planning",
            logContext: "modifierGrille planning-grilles",
            preserveResponseData: true,
        });
    }
}

async function supprimerGrille(sejourId: number, grilleId: number): Promise<void> {
    try {
        const response = await Axios.delete(`${base(sejourId)}/${grilleId}`);
        validateResponseStatus(response, 204);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de supprimer le planning",
            logContext: "supprimerGrille planning-grilles",
        });
    }
}

async function creerLigne(
    sejourId: number,
    grilleId: number,
    body: SavePlanningLigneRequest
): Promise<PlanningLigneDto> {
    try {
        const response = await Axios.post(`${base(sejourId)}/${grilleId}/lignes`, body);
        validateResponseStatus(response, 201);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de créer la ligne",
            logContext: "creerLigne planning-grilles",
            preserveResponseData: true,
        });
    }
}

async function modifierLigne(
    sejourId: number,
    grilleId: number,
    ligneId: number,
    body: UpdatePlanningLigneRequest
): Promise<PlanningLigneDto> {
    try {
        const response = await Axios.put(`${base(sejourId)}/${grilleId}/lignes/${ligneId}`, body);
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de modifier la ligne",
            logContext: "modifierLigne planning-grilles",
            preserveResponseData: true,
        });
    }
}

async function supprimerLigne(sejourId: number, grilleId: number, ligneId: number): Promise<void> {
    try {
        const response = await Axios.delete(`${base(sejourId)}/${grilleId}/lignes/${ligneId}`);
        validateResponseStatus(response, 204);
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible de supprimer la ligne",
            logContext: "supprimerLigne planning-grilles",
        });
    }
}

async function remplacerCellules(
    sejourId: number,
    grilleId: number,
    ligneId: number,
    body: UpsertPlanningCellulesRequest
): Promise<PlanningCelluleDto[]> {
    try {
        const response = await Axios.put(
            `${base(sejourId)}/${grilleId}/lignes/${ligneId}/cellules`,
            body
        );
        return response.data;
    } catch (error: unknown) {
        adaptAxiosError(error, {
            defaultMessage: "Impossible d'enregistrer les cellules",
            logContext: "remplacerCellules planning-grilles",
            preserveResponseData: true,
        });
    }
}

export const sejourPlanningGrilleService = {
    listerGrilles,
    getGrilleDetail,
    creerGrille,
    modifierGrille,
    supprimerGrille,
    creerLigne,
    modifierLigne,
    supprimerLigne,
    remplacerCellules,
};
