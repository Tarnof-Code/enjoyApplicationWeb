import Axios from './caller.service'
import { accountService } from './account.service'


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
        return response
    } catch {
        throw new Error("access_token est manquant ou erreur de réseau")
    }
}

export const utilisateurService = {
    getAllUsers, getUser
}