import Axios from './caller.service'
import { accountService } from './account.service'
import store from "../redux/store"
import { setUser } from '../redux/auth/authSlice'
import { useSelector } from "react-redux";


let getAllUsers = async () => {
    try {
        let response = await Axios.get('/utilisateurs/liste');
        response.data.forEach(user => {
            if (user.dateExpirationCompte) {
                user.dateExpirationCompte = user.dateExpirationCompte * 1000;
            }
        });
        return response;
    } catch {
        throw new Error('Impossible de récupérer la liste des utilisateurs')
    }
}

let getUser = async () => {
    try {
        let token_infos = accountService.getTokenInfo();
        const tokenId = token_infos.payload.sub;
        const response = await Axios.get(`/utilisateurs/profil?tokenId=${tokenId}`, {
            withCredentials: true
        })
        if (response) {
            response.data.dateExpirationCompte = response.data.dateExpirationCompte * 1000;
            store.dispatch(setUser({ role: response.data.role, prenom: response.data.prenom, genre: response.data.genre }));
            return response
        }

    } catch {
        throw new Error("access_token est manquant ou erreur de réseau")
    }
}

let updateUser = async (utilisateur) => {
    try {
        let token_infos = accountService.getTokenInfo();
        const tokenId = token_infos.payload.sub;
        utilisateur.tokenId = tokenId;
        const response = await Axios.post('/utilisateurs/modifierInfos', utilisateur, {
            withCredentials: true,
            headers: {
                'X-Skip-Token-Refresh': true, // En tête personnalisée pour éviter l'interceptor
            },
        });
        return response;
    } catch (error) {
        //  console.error("Une erreur s'est produite lors de la mise à jour de l'utilisateur :", error.response.data.message);
        throw error; // Vous pouvez choisir de rejeter à nouveau l'erreur ou de la traiter différemment selon vos besoins.
    }
};


let getRoleByGenre = (role, genre) => {
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
    getAllUsers, getUser, getRoleByGenre, updateUser
}