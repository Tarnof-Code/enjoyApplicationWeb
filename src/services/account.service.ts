import Axios from "./caller.service";
import { jwtDecode } from "jwt-js-decode";
import store from "../redux/store";
import { clearUser } from "../redux/auth/authSlice";
import CryptoJS from "crypto-js";

const secretKey = import.meta.env.VITE_SECRET_KEY as string;

interface Credentials {
  email: string;
  password: string;
}

interface UserInfos {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  genre: string;
  telephone: string;
  dateNaissance: string;
}

/**
 * Connexion vers l'API
 * @param {object} credentials
 * @returns {Promise}
 */
const login = async (credentials: Credentials) => {
  const response = await Axios.post("/auth/connexion", credentials, {
    withCredentials: true,
    headers: {
      "X-Skip-Token-Refresh": true, // En tête personnalisée pour éviter l'interceptor
    },
  });
  console.log(response);
  return response;
};

let addUser = async (userInfos: UserInfos) => {
  const response = await Axios.post("/auth/inscription", userInfos, {
    withCredentials: true,
    headers: {
      "X-Skip-Token-Refresh": true, // En tête personnalisée pour éviter l'interceptor
    },
  });
  return response;
};

/**
 * Sauvegarde du token dans le localStorage
 * @param {string} access_token
 */
let saveAccessToken = (access_token: string) => {
  let crypted_access_token = CryptoJS.AES.encrypt(
    access_token,
    secretKey
  ).toString();
  localStorage.setItem("access_token", crypted_access_token);
  console.log(access_token);
  console.log(crypted_access_token);
};

/**
 * Suppression du token du localStorage
 */
let logout = () => {
  localStorage.removeItem("access_token");
  store.dispatch(clearUser());
  window.location.href = "/";
};

/**
 * Etat de la présence d'un token en localStorage
 * @returns {boolean}
 */
let isLogged = () => {
  let access_token = localStorage.getItem("access_token");
  return !!access_token;
};

/**
 * Récupération brut du token en localStorage
 * @returns {string}
 */
let getToken = () => {
  let crypted_access_token = localStorage.getItem("access_token");
  if (!crypted_access_token) {
    return null;
  }
  let bytes = CryptoJS.AES.decrypt(crypted_access_token, secretKey);
  let originalText = bytes.toString(CryptoJS.enc.Utf8);
  return originalText;
};

/**
 * Récupération du payload du tkoen
 * @returns {object}
 */
let getTokenInfo = () => {
  const token = getToken();
  if (!token) {
    return null;
  }
  return jwtDecode(token);
};

let refreshAccessToken = async () => {
  logout();
  const response = await Axios.post("/auth/refresh-token");
  return response;
};

// Déclaration des serivces pour import
export const accountService = {
  login,
  addUser,
  saveAccessToken,
  logout,
  isLogged,
  getToken,
  getTokenInfo,
  refreshAccessToken,
};
