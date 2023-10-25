import { useSelector } from "react-redux";

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
