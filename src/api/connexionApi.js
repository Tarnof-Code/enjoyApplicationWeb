import store from '../redux/store';
import { setJWT } from '../redux/auth/jwtSlice';

const API_BASE_URL = 'http://localhost:8080/api/v1/auth';

export const loginUser = async (userData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/connexion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error(`Erreur lors de la connexion: ${response.status}`);
        }
        const data = await response.json();
        const jwt = data.token;

        store.dispatch(setJWT(jwt));

        return data;
    } catch (error) {
        throw new Error(`Erreur lors de la connexion: ${error.message}`);
    }
};
