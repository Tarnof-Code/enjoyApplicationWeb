/**
 * Aligné sur {@code Horaire.LIBELLE_HORAIRE_PATTERN} côté API Java.
 * Heures 0–23, minutes 00–59, lettre h entre les deux.
 */
export const LIBELLE_HORAIRE_REGEX = /^([0-9]|1\d|2[0-3])h([0-5]\d)$/;

export function validerLibelleHoraire(libelle: string): string | null {
    const t = libelle.trim();
    if (!t) return "Le libellé d'horaire est obligatoire.";
    if (!LIBELLE_HORAIRE_REGEX.test(t)) {
        return "Format attendu : 6h00, 7h15, 18h30… (heures 0–23, minutes sur deux chiffres).";
    }
    return null;
}
