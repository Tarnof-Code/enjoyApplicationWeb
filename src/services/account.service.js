import Axios from './caller.service'
import { jwtDecode } from 'jwt-js-decode';
import Cookies from 'universal-cookie';

const cookies = new Cookies();

/**
 * Connexion vers l'API
 * @param {object} credentials 
 * @returns {Promise}
 */
let login = async (credentials) => {
    const response = await Axios.post('/auth/connexion', credentials, {
        withCredentials: true
    })
    return response
}

/**
 * Sauvegarde du token dans le localStorage
 * @param {string} access_token 
 */
let saveAccessToken = (access_token) => {
    localStorage.setItem('access_token', access_token)
}


/**
 * Suppression du token du localStorage
 */
let logout = () => {
    localStorage.removeItem('access_token')
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
    return localStorage.getItem('access_token')
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
    login, saveAccessToken, logout, isLogged, getToken, getTokenInfo, refreshAccessToken
}