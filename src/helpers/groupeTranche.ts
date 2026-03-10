import { GroupeDto, EnfantDto } from "../types/api";
import calculerAge from "./calculerAge";
import { trierEnfantsParNom } from "./trierUtilisateurs";
import { niveauScolaireDansTranche } from "../enums/NiveauScolaire";

/**
 * Retourne les enfants qui correspondent à la tranche du groupe (âge ou niveau scolaire)
 * et qui ne sont pas dans la liste d'exclusion.
 * @param groupe - Le groupe avec typeGroupe, ageMin/Max ou niveauScolaireMin/Max
 * @param enfants - Liste des enfants du séjour
 * @param dateDebutSejour - Date de début du séjour pour le calcul de l'âge
 * @param idsExclus - IDs des enfants à exclure (déjà dans le groupe)
 */
export function getEnfantsMatchingTranche(
    groupe: GroupeDto,
    enfants: EnfantDto[],
    dateDebutSejour: string,
    idsExclus: Set<number> = new Set()
): EnfantDto[] {
    const ageAtSejour = (e: EnfantDto) => calculerAge(e.dateNaissance, dateDebutSejour);
    return trierEnfantsParNom(
        enfants.filter((e) => {
            if (idsExclus.has(e.id)) return false;
            if (groupe.typeGroupe === "AGE") {
                const age = ageAtSejour(e);
                const min = groupe.ageMin ?? 0;
                const max = groupe.ageMax ?? 999;
                return age >= min && age <= max;
            }
            if (groupe.typeGroupe === "NIVEAU_SCOLAIRE") {
                return niveauScolaireDansTranche(
                    e.niveauScolaire,
                    groupe.niveauScolaireMin,
                    groupe.niveauScolaireMax
                );
            }
            return false;
        })
    );
}
