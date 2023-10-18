export async function fetchUtilisateurs() {
    try {
        const brutResponse = await fetch("http://localhost:8080/utilisateurs");
        if (!brutResponse.ok) {
            throw new Error('Erreur de réseau');
        }
        const response = await brutResponse.json();
        return response;
    } catch (error) {
        throw error;
    }
}
