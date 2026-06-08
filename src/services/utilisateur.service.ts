import Axios from "./caller.service";
import { accountService } from "./account.service";
import { validateResponseStatus, adaptAxiosError } from "../helpers/axiosError";
import store from "../redux/store";
import { setUser } from "../redux/auth/authSlice";
import { trierUtilisateursParNom } from "../helpers/trierUtilisateurs";
import { RoleSysteme, RoleSystemeLabels } from "../enums/RoleSysteme";
import { RoleSejour, RoleSejourLabels } from "../enums/RoleSejour";
import { ChangePasswordRequest, ProfilUtilisateurDTO } from "../types/api";

let getAllUsers = async () => {
  const response = await Axios.get("/utilisateurs");
  response.data = trierUtilisateursParNom(response.data);
  return response;
};

let getUser = async () => {
  const token_infos = accountService.getTokenInfo();
  const tokenId = token_infos?.payload.sub;
  if (!tokenId) {
    throw new Error("Session invalide : identifiant utilisateur manquant.");
  }
  const response = await Axios.get(`/utilisateurs/profil?tokenId=${tokenId}`, {
    withCredentials: true,
  });
  store.dispatch(
    setUser({
      role: response.data.role,
      prenom: response.data.prenom,
      genre: response.data.genre,
    })
  );
  return response;
};

let updateUser = async (utilisateur: any) => {
  const response = await Axios.put("/utilisateurs", utilisateur, {
    withCredentials: true,
    headers: {
      "X-Skip-Token-Refresh": true, // En tête personnalisée pour éviter l'interceptor
    },
  });
  return response;
};

let getDirecteurs = async () => {
  try {
    let response = await Axios.get(`/utilisateurs/${RoleSysteme.DIRECTION}`);
    response.data = trierUtilisateursParNom(response.data);
    return { data: response.data };
  } catch {
    throw new Error("Impossible de récupérer la liste des directeurs");
  }
};

let deleteUser = async (tokenId: string) => {
  try {
    const response = await Axios.delete(`/utilisateurs/${tokenId}`, {
      withCredentials: true,
    });
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Impossible de supprimer l'utilisateur",
      logContext: "Erreur lors de la suppression de l'utilisateur",
    });
  }
};

let getEquipeBySejour = async (sejourId: number) => {
  try {
    const response = await Axios.get(`/utilisateurs/equipe/${sejourId}`);
    response.data = trierUtilisateursParNom(response.data);
    return response;
  } catch {
    throw new Error("Impossible de récupérer la liste des membres de l'équipe");
  }
};

let getUserByEmail = async (email: string) => {
  try {
    const response = await Axios.get(`/utilisateurs/search`, {
      params: {
          email: email
      }
    });
    return response;
  } catch (error: any) {
    if (error.response?.status === 400) {
      const messageServeur = error.response.data?.message || error.response.data || "Erreur 400";
      throw new Error(messageServeur);
    }
    return null;
  }
};

const PHOTO_PROFIL_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_PROFIL_TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"] as const;

let uploadPhotoProfil = async (tokenId: string, file: File): Promise<ProfilUtilisateurDTO> => {
  if (!PHOTO_PROFIL_TYPES_ACCEPTES.includes(file.type as (typeof PHOTO_PROFIL_TYPES_ACCEPTES)[number])) {
    throw new Error("Format non accepté. Utilisez une image JPEG, PNG ou WebP.");
  }
  if (file.size > PHOTO_PROFIL_MAX_BYTES) {
    throw new Error("La photo ne doit pas dépasser 2 Mo.");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await Axios.post(`/utilisateurs/${tokenId}/photo-profil`, formData, {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data as ProfilUtilisateurDTO;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de l'envoi de la photo de profil",
      logContext: "Erreur lors de l'upload de la photo de profil",
    });
  }
};

let getPhotoProfilBlobUrl = async (
  tokenId: string,
  cacheBust?: number
): Promise<string | null> => {
  try {
    const response = await Axios.get(`/utilisateurs/${tokenId}/photo-profil`, {
      withCredentials: true,
      responseType: "blob",
      params: cacheBust != null ? { _: cacheBust } : undefined,
    });
    return URL.createObjectURL(response.data);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 404) {
      return null;
    }
    return null;
  }
};

let deletePhotoProfil = async (tokenId: string): Promise<void> => {
  try {
    const response = await Axios.delete(`/utilisateurs/${tokenId}/photo-profil`, {
      withCredentials: true,
    });
    validateResponseStatus(response, 204);
    return;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors de la suppression de la photo de profil",
      logContext: "Erreur lors de la suppression de la photo de profil",
    });
  }
};

/** Supprime l'ancienne photo si elle existe (404 ignoré), puis envoie la nouvelle. */
let remplacerPhotoProfil = async (tokenId: string, file: File): Promise<ProfilUtilisateurDTO> => {
  try {
    const response = await Axios.delete(`/utilisateurs/${tokenId}/photo-profil`, {
      withCredentials: true,
    });
    validateResponseStatus(response, 204);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status !== 404) {
      adaptAxiosError(error, {
        defaultMessage: "Erreur lors du remplacement de la photo de profil",
        logContext: "Erreur lors de la suppression de l'ancienne photo de profil",
      });
    }
  }

  return uploadPhotoProfil(tokenId, file);
};

let changePassword = async (request: ChangePasswordRequest) => {
  try {
    const response = await Axios.patch("/utilisateurs/mot-de-passe", request, {
      withCredentials: true,
    });
    return response;
  } catch (error: unknown) {
    adaptAxiosError(error, {
      defaultMessage: "Erreur lors du changement de mot de passe",
      logContext: "Erreur lors du changement de mot de passe",
    });
  }
};

let getRoleSystemeByGenre = (role: string | null, genre: string | null): string => {
  if (!role) return "Utilisateur";
  const baseLabel = role in RoleSystemeLabels 
    ? RoleSystemeLabels[role as RoleSysteme] 
    : role;
  if (genre === "Feminin" || genre === "Féminin") {
    switch (role) {
      case RoleSysteme.ADMIN:
        return "Admin";
      case RoleSysteme.DIRECTION:
        return "Directrice";
      case RoleSysteme.BASIC_USER:
        return "Utilisatrice";
      default:
        return baseLabel;
    }
  } else if (genre === "Masculin") {
    switch (role) {
      case RoleSysteme.ADMIN:
        return "Admin";
      case RoleSysteme.DIRECTION:
        return "Directeur";
      case RoleSysteme.BASIC_USER:
        return "Utilisateur";
      default:
        return baseLabel;
    }
  }
  return baseLabel;
};

let getRoleSejourByGenre = (role: string | null, genre: string | null): string => {
  if (!role) return "";
  const baseLabel = role in RoleSejourLabels 
    ? RoleSejourLabels[role as RoleSejour] 
    : role;
  if (genre === "Feminin" || genre === "Féminin") {
    switch (role) {
      case RoleSejour.ANIM:
        return "Animatrice";
      case RoleSejour.AS:
        return "Assistante sanitaire";
      case RoleSejour.ADJOINT:
        return "Adjointe";
      case RoleSejour.SB:
        return "Surveillante de baignade";
      case RoleSejour.AUTRE:
        return "Autre";
      default:
        return baseLabel;
    }
  } else if (genre === "Masculin") {
    switch (role) {
      case RoleSejour.ANIM:
        return "Animateur";
      case RoleSejour.AS:
        return "Assistant sanitaire";
      case RoleSejour.ADJOINT:
        return "Adjoint";
      case RoleSejour.SB:
        return "Surveillant de baignade";
      case RoleSejour.AUTRE:
        return "Autre";
      default:
        return baseLabel;
    }
  }
  
  return baseLabel;
};

export const utilisateurService = {
  getAllUsers,
  getUser,
  getDirecteurs,
  getEquipeBySejour,
  getRoleSystemeByGenre,
  getRoleSejourByGenre,
  updateUser,
  deleteUser,
  getUserByEmail,
  changePassword,
  uploadPhotoProfil,
  remplacerPhotoProfil,
  getPhotoProfilBlobUrl,
  deletePhotoProfil,
};
