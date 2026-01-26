import { ProfilUtilisateurDTO, EnfantDto } from "../types/api";

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

/**
 * Trie les enfants par nom puis par prénom
 * Retourne un nouveau tableau trié par ordre alphabétique (nom, puis prénom)
 */
export const trierEnfantsParNom = (enfants: EnfantDto[]): EnfantDto[] => {
    return [...enfants].sort((a, b) => {
        const nomA = a.nom?.toLocaleLowerCase() || '';
        const nomB = b.nom?.toLocaleLowerCase() || '';
        const comparaisonNom = nomA.localeCompare(nomB);
        
        // Si les noms sont identiques, trier par prénom
        if (comparaisonNom === 0) {
            const prenomA = a.prenom?.toLocaleLowerCase() || '';
            const prenomB = b.prenom?.toLocaleLowerCase() || '';
            return prenomA.localeCompare(prenomB);
        }
        
        return comparaisonNom;
    });
};
