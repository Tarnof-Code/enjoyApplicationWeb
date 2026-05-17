import Axios from "./caller.service";
import { adaptAxiosError, validateResponseStatus } from "../helpers/axiosError";
import type {
  CahierInfirmerieEntreeDto,
  HistoriqueModificationCahierInfirmerieDto,
  SaveCahierInfirmerieEntreeRequest,
} from "../types/api";

async function listerEntrees(sejourId: number): Promise<CahierInfirmerieEntreeDto[]> {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/cahier-infirmerie`);
    if (response.data && Array.isArray(response.data)) {
      return response.data as CahierInfirmerieEntreeDto[];
    }
    return [];
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du chargement du cahier d'infirmerie",
      logContext: "listerEntreesCahierInfirmerie",
    });
  }
}

async function getHistorique(sejourId: number, entreeId: number): Promise<HistoriqueModificationCahierInfirmerieDto[]> {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/cahier-infirmerie/${entreeId}/historique`);
    if (response.data && Array.isArray(response.data)) {
      return response.data as HistoriqueModificationCahierInfirmerieDto[];
    }
    return [];
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du chargement de l'historique",
      logContext: "getHistoriqueCahierInfirmerie",
    });
  }
}

async function creerEntree(
  sejourId: number,
  body: SaveCahierInfirmerieEntreeRequest,
): Promise<CahierInfirmerieEntreeDto> {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/cahier-infirmerie`, body);
    return response.data as CahierInfirmerieEntreeDto;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la création de l'entrée",
      logContext: "creerEntreeCahierInfirmerie",
    });
  }
}

async function modifierEntree(
  sejourId: number,
  entreeId: number,
  body: SaveCahierInfirmerieEntreeRequest,
): Promise<CahierInfirmerieEntreeDto> {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/cahier-infirmerie/${entreeId}`, body);
    return response.data as CahierInfirmerieEntreeDto;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification de l'entrée",
      logContext: "modifierEntreeCahierInfirmerie",
    });
  }
}

async function supprimerEntree(sejourId: number, entreeId: number): Promise<void> {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/cahier-infirmerie/${entreeId}`);
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression de l'entrée",
      logContext: "supprimerEntreeCahierInfirmerie",
    });
  }
}

export const cahierInfirmerieService = {
  listerEntrees,
  getHistorique,
  creerEntree,
  modifierEntree,
  supprimerEntree,
};
