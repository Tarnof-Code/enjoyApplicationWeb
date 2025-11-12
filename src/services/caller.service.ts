import axios from 'axios'
import { accountService } from './account.service'

axios.defaults.withCredentials = true;

// Paramétrage de base d'axios
const Axios = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
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
    return response;
}, async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest.headers['X-Skip-Token-Refresh']) {
        try {
            const refreshResponse = await accountService.refreshAccessToken();
            accountService.saveAccessToken(refreshResponse.data.access_token);
            return Axios(originalRequest);
        } catch (refreshError) {
            console.error("Erreur lors du rafraîchissement du jeton :", refreshError);
            return Promise.reject(error);
        }
    } else {
        return Promise.reject(error);
    }
});



export default Axios