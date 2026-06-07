import axios, { type InternalAxiosRequestConfig } from 'axios'
import { enregistrerCheminApresConnexionDepuisNavigateur } from '../helpers/cheminApresConnexion'
import { accountService } from './account.service'

axios.defaults.withCredentials = true;

let sessionExpiredRedirectPending = false;

function hasSkipTokenRefreshHeader(config: InternalAxiosRequestConfig | undefined): boolean {
    if (!config?.headers) return false;
    const headers = config.headers;
    if (typeof headers.get === 'function') {
        const value = headers.get('X-Skip-Token-Refresh');
        return value === true || value === 'true';
    }
    return (headers as Record<string, unknown>)['X-Skip-Token-Refresh'] === true;
}

function logoutAndRedirectToConnexion(): void {
    enregistrerCheminApresConnexionDepuisNavigateur();
    accountService.logout();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        if (sessionExpiredRedirectPending) return;
        sessionExpiredRedirectPending = true;
        window.location.replace('/');
    }
}

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
    const status = error.response?.status;
    const skipRefresh = hasSkipTokenRefreshHeader(originalRequest);

    if (status === 401) {
        if (!skipRefresh) {
            try {
                const refreshResponse = await accountService.refreshAccessToken();
                accountService.saveAccessToken(refreshResponse.data.access_token);
                return Axios(originalRequest);
            } catch (refreshError) {
                console.error("Erreur lors du rafraîchissement du jeton :", refreshError);
            }
        }

        const onLoginPage = typeof window !== 'undefined' && window.location.pathname === '/';
        if (!skipRefresh || !onLoginPage) {
            logoutAndRedirectToConnexion();
        }
    }

    return Promise.reject(error);
});



export default Axios