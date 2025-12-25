import Axios from "./caller.service";
import { accountService } from "./account.service";
import store from "../redux/store";
import { setUser } from "../redux/auth/authSlice";
import { normaliserEtTrierUtilisateurs, normaliserUtilisateur } from "../helpers/normaliserUtilisateur";
import { RoleSysteme } from "../enums/RoleSysteme";

let getAllUsers = async () => {
  try {
    let response = await Axios.get("/utilisateurs");
    normaliserEtTrierUtilisateurs(response.data);
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
      normaliserUtilisateur(response.data);
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
    normaliserEtTrierUtilisateurs(response.data);
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
    normaliserEtTrierUtilisateurs(response.data);
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
    if (response.data) {
        normaliserUtilisateur(response.data);
    }
    return response;
  } catch (error: any) {
    if (error.response?.status === 400) {
      const messageServeur = error.response.data?.message || error.response.data || "Erreur 400";
      throw new Error(messageServeur);
    }
    return null;
  }
};

let getRoleByGenre = (role: string, genre: string): string => {
  switch (genre) {
    case "Feminin":
      switch (role) {
        case RoleSysteme.ADMIN:
          role = "ADMINISTRATRICE";
          break;
        case RoleSysteme.DIRECTION:
          role = "DIRECTRICE";
          break;
        case "ADJ_DIRECTION":
          role = "ADJOINTE";
          break;
        case "ANIM":
          role = "ANIMATRICE";
          break;
        case "ANIM_AS":
          role = "ANIMATRICE_AS";
          break;
        default:
          break;
      }
      break;

    case "Masculin":
      switch (role) {
        case RoleSysteme.ADMIN:
          role = "ADMINISTRATEUR";
          break;
        case RoleSysteme.DIRECTION:
          role = "DIRECTEUR";
          break;
        case "ADJ_DIRECTION":
          role = "ADJOINT";
          break;
        case "ANIM":
          role = "ANIMATEUR";
          break;
        case "ANIM_AS":
          role = "ANIMATEUR_AS";
          break;
        default:
          break;
      }
      break;

    default:
      break;
  }
  return role;
};

export const utilisateurService = {
  getAllUsers,
  getUser,
  getDirecteurs,
  getEquipeBySejour,
  getRoleByGenre,
  updateUser,
  deleteUser,
  getUserByEmail,
};
