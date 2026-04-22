import { HoraireDto } from "../types/api";
import { LIBELLE_HORAIRE_REGEX } from "./validerLibelleHoraire";

function minutesDepuisMinuit(libelle: string): number {
    const m = libelle.trim().match(LIBELLE_HORAIRE_REGEX);
    if (!m) return 24 * 60 + 999;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Tri par heure réelle (libellé `6h00` … `23h59`), puis par `id` en cas d'égalité. */
export function trierHorairesChronologiquement(horaires: HoraireDto[]): HoraireDto[] {
    return [...horaires].sort((a, b) => {
        const d = minutesDepuisMinuit(a.libelle) - minutesDepuisMinuit(b.libelle);
        return d !== 0 ? d : a.id - b.id;
    });
}
