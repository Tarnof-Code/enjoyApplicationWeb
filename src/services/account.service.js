import Axios from './caller.service'
import { jwtDecode } from 'jwt-js-decode';
import Cookies from 'universal-cookie';
import store from "../redux/store";
import { clearUser } from "../redux/auth/authSlice";
import CryptoJS from "crypto-js";
import { secretKey } from "../../config.local.js"

const cookies = new Cookies();

/**
 * Connexion vers l'API
 * @param {object} credentials 
 * @returns {Promise}
 */
const login = async (credentials) => {
    try {
        const response = await Axios.post('/auth/connexion', credentials, {
            withCredentials: true,
            headers: {
                'X-Skip-Token-Refresh': true, // En tête personnalisée pour éviter l'interceptor
            },
        });
        console.log(response)
        return response;
    } catch (error) {
        throw error;
    }
};

let addUser = async (userInfos) => {
    try {
        const response = await Axios.post('/auth/inscription', userInfos, {
            withCredentials: true,
            headers: {
                'X-Skip-Token-Refresh': true, // En tête personnalisée pour éviter l'interceptor
            },
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Sauvegarde du token dans le localStorage
 * @param {string} access_token 
 */
let saveAccessToken = (access_token) => {
    let crypted_access_token = CryptoJS.AES.encrypt(access_token, secretKey).toString();
    localStorage.setItem('access_token', crypted_access_token)
    console.log(access_token)
    console.log(crypted_access_token)
}


/**
 * Suppression du token du localStorage
 */
let logout = () => {
    localStorage.removeItem('access_token')
    store.dispatch(clearUser());
    window.location.href = "/";
}

/**
 * Etat de la présence d'un token en localStorage
 * @returns {boolean}
 */
let isLogged = () => {
    let access_token = localStorage.getItem('access_token')
    return !!access_token
}

/**
 * Récupération brut du token en localStorage
 * @returns {string}
 */
let getToken = () => {
    let crypted_access_token = localStorage.getItem('access_token');
    let bytes = CryptoJS.AES.decrypt(crypted_access_token, secretKey);
    let originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
}

/**
 * Récupération du payload du tkoen
 * @returns {object}
 */
let getTokenInfo = () => {
    return jwtDecode(getToken())
}

let refreshAccessToken = async () => {
    logout();
    const response = await Axios.post('/auth/refresh-token')
    return response
}

// Déclaration des serivces pour import
export const accountService = {
    login, addUser, saveAccessToken, logout, isLogged, getToken, getTokenInfo, refreshAccessToken
}