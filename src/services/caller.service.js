import axios from 'axios'
import { accountService } from './account.service'

axios.defaults.withCredentials = true;

// Paramétrage de base d'axios
const Axios = axios.create({
    baseURL: 'http://localhost:8080/api/v1'
})


// Intercepteur pour la mise en place du token dans la requête
Axios.interceptors.request.use(request => {

    if (accountService.isLogged()) {
        request.headers.Authorization = 'Bearer ' + accountService.getToken()
    }

    return request
})

// Intercepteur de réponse API pour vérification de la session
Axios.interceptors.response.use(response => {
    return response
}, error => {
    if (error.response.status === 401) {
        accountService.logout()
        const response = accountService
            .refreshAccessToken()
            .then((response) => {
                accountService.saveAccessToken(response.data.access_token);
            })
        //   window.location = '/'
    } else {
        return Promise.reject(error)
    }
})

export default Axios