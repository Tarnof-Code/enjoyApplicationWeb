import { accountService } from "./account.service";
import Axios from "./caller.service";
import { trierUtilisateursParNom, trierEnfantsParNom } from "../helpers/trierUtilisateurs";
import { CreateSejourRequest, SejourDTO, MembreEquipeRequest, RegisterRequest, EnfantDto, CreateEnfantRequest, ExcelImportResponse } from "../types/api";

let getAllSejours = async (): Promise<SejourDTO[]> => {
  try {
    const response = await Axios.get("/sejours");
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let getSejourById = async (id: string): Promise<SejourDTO> => {
  try {
    const response = await Axios.get(`/sejours/${id}`);
    if (response.data && response.data.equipe) {
      response.data.equipe = trierUtilisateursParNom(response.data.equipe);
    }
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let ajouterNouveauMembreEquipe = async (sejourId: number, request: RegisterRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/equipe/nouveau`, request);
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite";
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


let ajouterMembreExistantEquipe = async (sejourId: number, data: MembreEquipeRequest) => {
  try {
    const response = await Axios.post(`/sejours/${sejourId}/equipe/existant`, data);
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite";
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

let modifierRoleMembreEquipe = async (sejourId: number, membreTokenId: string, roleSejour: string) => {
  try {
    const response = await Axios.put(`/sejours/${sejourId}/equipe/${membreTokenId}`, { roleSejour });
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la modification du rôle du membre :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la modification du rôle du membre";
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

let supprimerMembreEquipe = async (sejourId: number, userTokenId: string) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}/equipe/${userTokenId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la suppression du membre :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors de la suppression du membre";
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

let getAllSejoursByDirecteur = async (): Promise<SejourDTO[]> => {
  try {
    const tokenInfo = accountService.getTokenInfo();
    const directeurTokenId = tokenInfo?.payload?.sub;
    if (!directeurTokenId) {
      throw new Error("Impossible de récupérer le token ID du directeur");
    }
    const response = await Axios.get("/sejours/directeur/" + directeurTokenId);
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    throw error;
  }
};

let addSejour = async (sejourData: CreateSejourRequest): Promise<SejourDTO> => {
  try {
    const response = await Axios.post("/sejours", sejourData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite lors de l'ajout :", error);
    throw error;
  }
};

let updateSejour = async (id: number, sejourData: CreateSejourRequest): Promise<SejourDTO> => {
  try {
    const response = await Axios.put(`/sejours/${id}`, sejourData);
    return response.data;
  } catch (error) {
    console.error("Une erreur s'est produite lors de la modification :", error);
    throw error;
  }
};

let deleteSejour = async (sejourId: number) => {
  try {
    const response = await Axios.delete(`/sejours/${sejourId}`);
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Une erreur s'est produite lors de la suppression :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Une erreur s'est produite lors de la suppression";
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
    // L'endpoint POST /sejours/{id}/enfants crée directement un nouvel enfant avec CreateEnfantRequest
    const response = await Axios.post(`/sejours/${sejourId}/enfants`, request);
    if (response.status !== 201) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la création et l'ajout de l'enfant :", error);
    
    // Gérer les erreurs avec les détails
    if (error.response) {
      // Gérer les erreurs de validation (400) qui peuvent avoir un format différent
      let errorMessage: string;
      if (error.response.status === 400 && error.response.data) {
        // Si c'est un objet avec des champs de validation
        if (typeof error.response.data === 'object' && !error.response.data.error) {
          // C'est probablement un objet de validation avec les noms de champs
          const validationErrors = Object.entries(error.response.data)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Erreurs de validation : ${validationErrors}`;
        } else {
          errorMessage = error.response.data?.error || 
                        error.response.data?.message || 
                        "Erreur de validation";
        }
      } else {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      "Une erreur s'est produite lors de la création de l'enfant";
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
    // L'endpoint PUT /sejours/{id}/enfants/{enfantId} modifie un enfant existant avec CreateEnfantRequest
    const response = await Axios.put(`/sejours/${sejourId}/enfants/${enfantId}`, request);
    if (response.status !== 200) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return response.data; // Retourne EnfantDto
  } catch (error: any) {
    console.error("Erreur lors de la modification de l'enfant :", error);
    
    // Gérer les erreurs avec les détails
    if (error.response) {
      // Gérer les erreurs de validation (400) qui peuvent avoir un format différent
      let errorMessage: string;
      if (error.response.status === 400 && error.response.data) {
        // Si c'est un objet avec des champs de validation
        if (typeof error.response.data === 'object' && !error.response.data.error) {
          // C'est probablement un objet de validation avec les noms de champs
          const validationErrors = Object.entries(error.response.data)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Erreurs de validation : ${validationErrors}`;
        } else {
          errorMessage = error.response.data?.error || 
                        error.response.data?.message || 
                        "Erreur de validation";
        }
      } else {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      "Une erreur s'est produite lors de la modification de l'enfant";
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
    // Créer un FormData pour envoyer le fichier
    const formData = new FormData();
    formData.append('file', file);

    // L'endpoint POST /sejours/{id}/enfants/import accepte un fichier Excel
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
    
    // Gérer les erreurs avec les détails
    if (error.response) {
      let errorMessage: string;
      if (error.response.status === 400 && error.response.data) {
        if (typeof error.response.data === 'object' && !error.response.data.error) {
          // C'est probablement un objet de validation avec les noms de champs
          const validationErrors = Object.entries(error.response.data)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Erreurs de validation : ${validationErrors}`;
        } else {
          errorMessage = error.response.data?.error || 
                        error.response.data?.message || 
                        "Erreur lors de l'import du fichier Excel";
        }
      } else {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      "Une erreur s'est produite lors de l'import du fichier Excel";
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

export const sejourService = {
  getAllSejours,
  getSejourById,
  getAllSejoursByDirecteur,
  ajouterNouveauMembreEquipe,
  ajouterMembreExistantEquipe,
  modifierRoleMembreEquipe,
  supprimerMembreEquipe,
  addSejour,
  updateSejour,
  deleteSejour,
  getEnfantsDuSejour,
  supprimerEnfantDuSejour,
  supprimerTousLesEnfants,
  creerEtAjouterEnfant,
  modifierEnfant,
  importerEnfantsExcel,
};
