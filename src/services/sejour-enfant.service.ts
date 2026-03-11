import Axios from "./caller.service";
import { trierEnfantsParNom } from "../helpers/trierUtilisateurs";
import { EnfantDto, CreateEnfantRequest, ExcelImportResponse, DossierEnfantDto, UpdateDossierEnfantRequest } from "../types/api";

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
  } catch (error: any) {
    console.error("Erreur lors de la récupération du dossier :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la récupération du dossier";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let updateDossierEnfant = async (sejourId: number, enfantId: number, request: UpdateDossierEnfantRequest): Promise<DossierEnfantDto> => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/enfants/${enfantId}/dossier`, request);
    return response.data;
  } catch (error: any) {
    console.error("Erreur lors de la modification du dossier :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la modification du dossier";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let supprimerEnfantDuSejour = async (sejourId: number, enfantId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/enfants/${enfantId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite lors de la suppression de l'enfant :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de la suppression de l'enfant";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let supprimerTousLesEnfants = async (sejourId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/enfants/all`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite lors de la suppression de tous les enfants :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de la suppression de tous les enfants";
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: { error: errorMessage }
      };
      throw adaptedError;
    }
    throw error;
  }
};

let creerEtAjouterEnfant = async (sejourId: number, request: CreateEnfantRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/enfants`, request);
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la création et l'ajout de l'enfant :", error);
    if (error.response) {
      let errorMessage: string;
      if (error.response.status === 400 && error.response.data) {
        if (typeof error.response.data === 'object' && !error.response.data.error) {
          const validationErrors = Object.entries(error.response.data)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Erreurs de validation : ${validationErrors}`;
        } else {
          errorMessage = error.response.data?.error || error.response.data?.message || "Erreur de validation";
        }
      } else {
        errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de la création de l'enfant";
      }
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: error.response.data
      };
      throw adaptedError;
    }
    throw error;
  }
};

let modifierEnfant = async (sejourId: number, enfantId: number, request: CreateEnfantRequest) => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/enfants/${enfantId}`, request);
    if (response.status !== 200) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return response.data;
  } catch (error: any) {
    console.error("Erreur lors de la modification de l'enfant :", error);
    if (error.response) {
      let errorMessage: string;
      if (error.response.status === 400 && error.response.data) {
        if (typeof error.response.data === 'object' && !error.response.data.error) {
          const validationErrors = Object.entries(error.response.data)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Erreurs de validation : ${validationErrors}`;
        } else {
          errorMessage = error.response.data?.error || error.response.data?.message || "Erreur de validation";
        }
      } else {
        errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de la modification de l'enfant";
      }
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: error.response.data
      };
      throw adaptedError;
    }
    throw error;
  }
};

let importerEnfantsExcel = async (sejourId: number, file: File): Promise<ExcelImportResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await Axios.post(`/sejours/${sejourId}/enfants/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }

    return response.data as ExcelImportResponse;
  } catch (error: any) {
    console.error("Erreur lors de l'import Excel :", error);
    if (error.response) {
      let errorMessage: string;
      if (error.response.status === 400 && error.response.data) {
        if (typeof error.response.data === 'object' && !error.response.data.error) {
          const validationErrors = Object.entries(error.response.data)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Erreurs de validation : ${validationErrors}`;
        } else {
          errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de l'import du fichier Excel";
        }
      } else {
        errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de l'import du fichier Excel";
      }
      const adaptedError = new Error(errorMessage);
      (adaptedError as any).response = {
        ...error.response,
        status: error.response.status,
        data: error.response.data
      };
      throw adaptedError;
    }
    throw error;
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
  importerEnfantsExcel,
};
