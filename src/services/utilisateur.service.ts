import Axios from "./caller.service";
import { accountService } from "./account.service";
import store from "../redux/store";
import { setUser } from "../redux/auth/authSlice";
import { trierUtilisateursParNom } from "../helpers/trierUtilisateurs";
import { RoleSysteme, RoleSystemeLabels } from "../enums/RoleSysteme";
import { RoleSejour, RoleSejourLabels } from "../enums/RoleSejour";
import { ChangePasswordRequest } from "../types/api";

let getAllUsers = async () => {
  try {
    let response = await Axios.get("/utilisateurs");
    response.data = trierUtilisateursParNom(response.data);
    return response;
  } catch {
    throw new Error("Impossible de récupérer la liste des utilisateurs");
  }
};

let getUser = async () => {
  try {
    let token_infos = accountService.getTokenInfo();
    const tokenId = token_infos?.payload.sub;
    const response = await Axios.get(
      `/utilisateurs/profil?tokenId=${tokenId}`,
      {
        withCredentials: true,
      }
    );
    if (response) {
      store.dispatch(
        setUser({
          role: response.data.role,
          prenom: response.data.prenom,
          genre: response.data.genre,
        })
      );
      return response;
    }
  } catch {
    throw new Error("access_token est manquant ou erreur de réseau");
  }
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
    if (response.status !== 204) {
      throw new Error(`Réponse inattendue : ${response.status}`);
    }
    return;
  } catch (error: any) {
    console.error("Erreur lors de la suppression de l'utilisateur :", error);
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Impossible de supprimer l'utilisateur";
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

let changePassword = async (request: ChangePasswordRequest) => {
  try {
    const response = await Axios.patch("/utilisateurs/mot-de-passe", request, {
      withCredentials: true,
    });
    return response;
  } catch (error: any) {
    if (error.response) {
      const errorMessage = error.response.data?.error || error.response.data?.message || "Erreur lors du changement de mot de passe";
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

let getRoleSystemeByGenre = (role: string | null, genre: string | null): string => {
  if (!role) return "Utilisateur";
  const baseLabel = role in RoleSystemeLabels 
    ? RoleSystemeLabels[role as RoleSysteme] 
    : role;
  if (genre === "Feminin" || genre === "Féminin") {
    switch (role) {
      case RoleSysteme.ADMIN:
        return "Administratrice";
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
        return "Administrateur";
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
};
