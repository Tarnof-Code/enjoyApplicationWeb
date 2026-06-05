import { ProfilUtilisateurDTO } from "../types/api";

const LOCALE_COMPARAISON = "fr";
const OPTIONS_COMPARAISON = { sensitivity: "base" } as const;

/** Objet minimal nom + prénom (équipe, référents, enfants, etc.) */
export type PersonneNomPrenom = { nom?: string | null; prenom?: string | null };

function normaliserChamp(valeur: string | null | undefined): string {
    return valeur?.toLocaleLowerCase() ?? "";
}

function comparerChamps(a: string, b: string): number {
    return a.localeCompare(b, LOCALE_COMPARAISON, OPTIONS_COMPARAISON);
}

/**
 * Comparaison alignée sur l'affichage « Prénom Nom » : tri alphabétique par prénom, puis par nom.
 */
export function comparerParPrenomPuisNom(a: PersonneNomPrenom, b: PersonneNomPrenom): number {
    const comparaisonPrenom = comparerChamps(normaliserChamp(a.prenom), normaliserChamp(b.prenom));
    if (comparaisonPrenom !== 0) return comparaisonPrenom;
    return comparerChamps(normaliserChamp(a.nom), normaliserChamp(b.nom));
}

/**
 * Comparaison alignée sur l'affichage « Nom Prénom » : tri alphabétique par nom, puis par prénom.
 */
export function comparerParNomPuisPrenom(a: PersonneNomPrenom, b: PersonneNomPrenom): number {
    const comparaisonNom = comparerChamps(normaliserChamp(a.nom), normaliserChamp(b.nom));
    if (comparaisonNom !== 0) return comparaisonNom;
    return comparerChamps(normaliserChamp(a.prenom), normaliserChamp(b.prenom));
}

/** Alias conservé pour compatibilité interne. */
export const comparerNomPuisPrenom = comparerParNomPuisPrenom;

/** Tri pour listes affichées « Prénom Nom ». */
export const trierParPrenomPuisNom = <T extends PersonneNomPrenom>(personnes: T[]): T[] =>
    [...personnes].sort(comparerParPrenomPuisNom);

/** Tri pour listes affichées « Nom Prénom ». */
export const trierParNomPuisPrenom = <T extends PersonneNomPrenom>(personnes: T[]): T[] =>
    [...personnes].sort(comparerParNomPuisPrenom);

/** Enfants affichés « Nom Prénom » (modales chambres, groupes…). */
export const trierEnfantsParNom = <T extends PersonneNomPrenom>(enfants: T[]): T[] => trierParNomPuisPrenom(enfants);

/** Enfants affichés « Prénom Nom » (ex. cahier infirmerie). */
export const trierEnfantsParPrenom = <T extends PersonneNomPrenom>(enfants: T[]): T[] =>
    trierParPrenomPuisNom(enfants);

/**
 * Tri des utilisateurs pour tableaux à colonnes Nom / Prénom.
 */
export const trierUtilisateursParNom = (users: ProfilUtilisateurDTO[]): ProfilUtilisateurDTO[] =>
    trierParNomPuisPrenom(users);
