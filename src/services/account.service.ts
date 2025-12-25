import Axios from "./caller.service";
import { jwtDecode } from "jwt-js-decode";
import store from "../redux/store";
import { clearUser } from "../redux/auth/authSlice";
import CryptoJS from "crypto-js";
import { UserInfos } from "../types/UserInfos";

const secretKey = import.meta.env.VITE_SECRET_KEY as string;

interface Credentials {
  email: string;
  password: string;
}

const login = async (credentials: Credentials) => {
  const response = await Axios.post("/auth/connexion", credentials, {
    withCredentials: true,
    headers: {
      "X-Skip-Token-Refresh": true, // En tête personnalisée pour éviter l'interceptor
    },
  });
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

let saveAccessToken = (access_token: string) => {
  let crypted_access_token = CryptoJS.AES.encrypt(
    access_token,
    secretKey
  ).toString();
  localStorage.setItem("access_token", crypted_access_token);
};

let logout = () => {
  localStorage.removeItem("access_token");
  store.dispatch(clearUser());
};

let isLogged = () => {
  let access_token = localStorage.getItem("access_token");
  return !!access_token;
};

let getToken = () => {
  let crypted_access_token = localStorage.getItem("access_token");
  if (!crypted_access_token) {
    return null;
  }
  let bytes = CryptoJS.AES.decrypt(crypted_access_token, secretKey);
  let originalText = bytes.toString(CryptoJS.enc.Utf8);
  return originalText;
};

let getTokenInfo = () => {
  const token = getToken();
  if (!token) {
    return null;
  }
  return jwtDecode(token);
};

let refreshAccessToken = async () => {
  localStorage.removeItem("access_token");
  const response = await Axios.post("/auth/refresh-token");
  return response;
};

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
