import Axios from "./caller.service";
import { accountService } from "./account.service";
import store from "../redux/store";
import { setUser } from "../redux/auth/authSlice";

let getAllUsers = async () => {
  try {
    let response = await Axios.get("/utilisateurs");
    response.data.forEach((user: any) => {
      if (user.dateExpirationCompte) {
        user.dateExpirationCompte = user.dateExpirationCompte * 1000;
      }
      user.nom = user.nom.toUpperCase();
    });
    response.data.sort((a: any, b: any) => {
      return a.nom.toLocaleLowerCase().localeCompare(b.nom.toLocaleLowerCase());
    });
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
      response.data.dateExpirationCompte =
        response.data.dateExpirationCompte * 1000;
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
  // let token_infos = accountService.getTokenInfo();
  // const tokenId = token_infos.payload.sub;
  // utilisateur.tokenId = tokenId;
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
    let response = await Axios.get("/utilisateurs/DIRECTION");
    const directeurs = response.data;

    directeurs.forEach((user: any) => {
      if (user.dateExpirationCompte) {
        user.dateExpirationCompte = user.dateExpirationCompte * 1000;
      }
      user.nom = user.nom.toUpperCase();
    });

    directeurs.sort((a: any, b: any) => {
      return a.nom.toLocaleLowerCase().localeCompare(b.nom.toLocaleLowerCase());
    });

    return { data: directeurs };
  } catch {
    throw new Error("Impossible de récupérer la liste des directeurs");
  }
};

let deleteUser = async (tokenId: string) => {
  try {
    const response = await Axios.delete(`/utilisateurs/${tokenId}`, {
      withCredentials: true,
    });
    return response;
  } catch {
    throw new Error("Impossible de supprimer l'utilisateur");
  }
};

let getRoleByGenre = (role: string, genre: string): string => {
  switch (genre) {
    case "Feminin":
      switch (role) {
        case "ADMIN":
          role = "ADMINISTRATRICE";
          break;
        case "DIRECTION":
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
        case "ADMIN":
          role = "ADMINISTRATEUR";
          break;
        case "DIRECTION":
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
  getRoleByGenre,
  updateUser,
  deleteUser,
};
