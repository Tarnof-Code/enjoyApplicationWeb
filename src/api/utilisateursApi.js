import { jwtDecode } from 'jwt-js-decode';

const API_BASE_URL = "http://localhost:8080/api/v1/utilisateurs";

export async function fetchUtilisateurs(token) {

  try {
    const brutResponse = await fetch(`${API_BASE_URL}/liste`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!brutResponse.ok) {
      throw new Error("Erreur de réseau");
    }
    const response = await brutResponse.json();
    return response;
  } catch (error) {
    throw error;
  }
}

export async function fetchProfil(token) {

  if (token) {

    let decodedToken = jwtDecode(token);
    const userEmail = decodedToken.payload.sub;

    try {
      const brutResponse = await fetch(`${API_BASE_URL}/profil?email=${userEmail}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!brutResponse.ok) {
        throw new Error("Erreur de réseau");
      }
      const response = await brutResponse.json();
      return response;
    } catch (error) {
      throw error;
    }
  } else {
    throw new Error("Le jeton JWT est manquant.");
  }
};

