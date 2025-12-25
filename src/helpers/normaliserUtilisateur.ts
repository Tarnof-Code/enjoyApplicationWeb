import { Utilisateur } from "../types/Utilisateur";

export const normaliserUtilisateur = (user: Partial<Utilisateur>): Utilisateur => {
    if (user.dateExpirationCompte) {
        if (user.dateExpirationCompte < 10000000000) { 
            user.dateExpirationCompte = user.dateExpirationCompte * 1000;
        }
    }
    if (user.nom) {
        user.nom = user.nom.toUpperCase();
    }
    return user as Utilisateur;
};

export const normaliserEtTrierUtilisateurs = (users: Partial<Utilisateur>[]): Utilisateur[] => {
    users.forEach(normaliserUtilisateur);
    users.sort((a, b) => {
        const nomA = a.nom?.toLocaleLowerCase() || '';
        const nomB = b.nom?.toLocaleLowerCase() || '';
        return nomA.localeCompare(nomB);
    });
    return users as Utilisateur[];
};
