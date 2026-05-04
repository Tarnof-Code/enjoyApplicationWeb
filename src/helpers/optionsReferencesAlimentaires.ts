import type { ReferenceAlimentaireDto } from "../types/api";
import { trierReferencesAlimentaires } from "../services/references-alimentaires.service";

/** Option pour cases à cocher (référentiel alimentaire). */
export type ReferenceCheckboxOption = { value: number; label: string };

/** Entrées actives + inactives présentes dans `idsPourEntreesInactives` (ex. sélection au chargement du formulaire). */
export function optionsCheckboxReferencesAlimentaires(
    refsApi: ReferenceAlimentaireDto[],
    idsPourEntreesInactives: number[],
): ReferenceCheckboxOption[] {
    const tri = trierReferencesAlimentaires(refsApi);
    const actifs = tri.filter((r) => r.actif);
    const inactifsSelectionnes = tri.filter((r) => !r.actif && idsPourEntreesInactives.includes(r.id));
    const liste = [...actifs, ...inactifsSelectionnes];
    return liste.map((r) => ({
        value: r.id,
        label: r.actif ? r.libelle : `${r.libelle} (inactif)`,
    }));
}
