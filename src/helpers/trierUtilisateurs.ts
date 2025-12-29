import { ProfilUtilisateurDTO } from "../types/api";

/**
 * Trie les utilisateurs par nom 
 * Retourne un nouveau tableau trié par ordre alphabétique du nom
 */
export const trierUtilisateursParNom = (users: ProfilUtilisateurDTO[]): ProfilUtilisateurDTO[] => {
    return [...users].sort((a, b) => {
        const nomA = a.nom?.toLocaleLowerCase() || '';
        const nomB = b.nom?.toLocaleLowerCase() || '';
        return nomA.localeCompare(nomB);
    });
};
