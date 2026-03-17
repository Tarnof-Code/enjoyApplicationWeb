import Axios from "./caller.service";
import { trierEnfantsParNom } from "../helpers/trierUtilisateurs";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import { EnfantDto, CreateEnfantRequest, ExcelImportResponse, ExcelImportSpecResponse, DossierEnfantDto, UpdateDossierEnfantRequest } from "../types/api";

let getEnfantsDuSejour = async (sejourId: number): Promise<EnfantDto[]> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/enfants`);
    if (response.data && Array.isArray(response.data)) {
      return trierEnfantsParNom(response.data);
    }
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite lors de la récupération des enfants :", error);
    throw error;
  }
};

let getDossierEnfant = async (sejourId: number, enfantId: number): Promise<DossierEnfantDto> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/enfants/${enfantId}/dossier`);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la récupération du dossier",
      logContext: "Erreur lors de la récupération du dossier",
    });
  }
};

let updateDossierEnfant = async (sejourId: number, enfantId: number, request: UpdateDossierEnfantRequest): Promise<DossierEnfantDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/enfants/${enfantId}/dossier`, request);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la modification du dossier",
      logContext: "Erreur lors de la modification du dossier",
    });
  }
};

let supprimerEnfantDuSejour = async (sejourId: number, enfantId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/enfants/${enfantId}`);
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite lors de la suppression de l'enfant",
      logContext: "Une erreur s'est produite lors de la suppression de l'enfant",
    });
  }
};

let supprimerTousLesEnfants = async (sejourId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/enfants/all`);
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite lors de la suppression de tous les enfants",
      logContext: "Une erreur s'est produite lors de la suppression de tous les enfants",
    });
  }
};

let creerEtAjouterEnfant = async (sejourId: number, request: CreateEnfantRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/enfants`, request);
    validateResponseStatus(response, 201);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite lors de la création de l'enfant",
      validationDefault: "Erreur de validation",
      logContext: "Erreur lors de la création et l'ajout de l'enfant",
      preserveResponseData: true,
    });
  }
};

let modifierEnfant = async (sejourId: number, enfantId: number, request: CreateEnfantRequest) => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/enfants/${enfantId}`, request);
    validateResponseStatus(response, 200);
    return response.data;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite lors de la modification de l'enfant",
      validationDefault: "Erreur de validation",
      logContext: "Erreur lors de la modification de l'enfant",
      preserveResponseData: true,
    });
  }
};

let getExcelImportSpec = async (sejourId: number): Promise<ExcelImportSpecResponse> => {
  try {
    const response = await Axios.get(`/sejours/${sejourId}/enfants/import/spec`);
    return response.data as ExcelImportSpecResponse;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la récupération de la notice d'import Excel",
      logContext: "Erreur lors de la récupération de la spécification d'import Excel",
    });
  }
};

let importerEnfantsExcel = async (sejourId: number, file: File): Promise<ExcelImportResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await Axios.post(`/sejours/${sejourId}/enfants/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    validateResponseStatus(response, 200);
    return response.data as ExcelImportResponse;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Une erreur s'est produite lors de l'import du fichier Excel",
      validationDefault: "Erreur lors de l'import du fichier Excel",
      logContext: "Erreur lors de l'import Excel",
      preserveResponseData: true,
    });
  }
};

export const sejourEnfantService = {
  getEnfantsDuSejour,
  getDossierEnfant,
  updateDossierEnfant,
  supprimerEnfantDuSejour,
  supprimerTousLesEnfants,
  creerEtAjouterEnfant,
  modifierEnfant,
  getExcelImportSpec,
  importerEnfantsExcel,
};
