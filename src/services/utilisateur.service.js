import Axios from './caller.service'
import { accountService } from './account.service'
import store from "../redux/store"
import { setUser } from '../redux/auth/authSlice'


let getAllUsers = async () => {
    try {
        let response = await Axios.get('/utilisateurs/liste');
        return response;
    } catch {
        throw new Error('Impossible de récupérer la liste des utilisateurs')
    }
}

let getUser = async () => {
    try {
        let token_infos = accountService.getTokenInfo();
        const userEmail = token_infos.payload.sub;
        const response = await Axios.get(`/utilisateurs/profil?email=${userEmail}`, {
            withCredentials: true
        })
        if (response) {
            store.dispatch(setUser({ role: response.data.role }));
        }
        return response
    } catch {
        throw new Error("access_token est manquant ou erreur de réseau")
    }
}

export const utilisateurService = {
    getAllUsers, getUser
}