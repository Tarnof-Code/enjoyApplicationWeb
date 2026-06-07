import type { GroupeDto, TypeGroupe } from "../types/api";

export const SECTIONS_TYPE_GROUPE: { type: TypeGroupe; label: string }[] = [
    { type: "NIVEAU_SCOLAIRE", label: "Par niveau scolaire" },
    { type: "THEMATIQUE", label: "Thématique" },
    { type: "AGE", label: "Par âge" },
];

export function comparerGroupesParNom(a: GroupeDto, b: GroupeDto): number {
    return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
}

export function trierGroupesParNom(groupes: readonly GroupeDto[]): GroupeDto[] {
    return [...groupes].sort(comparerGroupesParNom);
}

function groupeAReferentPrioritaire(groupe: GroupeDto, tokenIdsPrioritaires: Set<string>): boolean {
    return (groupe.referents ?? []).some((r) => tokenIdsPrioritaires.has((r.tokenId ?? "").trim()));
}

/** Référents sélectionnés en tête de section, puis tri alphabétique. */
export function trierGroupesReferentsPuisNom(
    groupes: readonly GroupeDto[],
    tokenIdsReferentsPrioritaires: Iterable<string> = [],
): GroupeDto[] {
    const tokens = new Set(
        [...tokenIdsReferentsPrioritaires].map((t) => t.trim()).filter((t) => t !== ""),
    );
    if (tokens.size === 0) return trierGroupesParNom(groupes);
    return [...groupes].sort((a, b) => {
        const aPrioritaire = groupeAReferentPrioritaire(a, tokens);
        const bPrioritaire = groupeAReferentPrioritaire(b, tokens);
        if (aPrioritaire !== bPrioritaire) return aPrioritaire ? -1 : 1;
        return comparerGroupesParNom(a, b);
    });
}

export type SectionGroupes = {
    type: TypeGroupe;
    label: string;
    groupes: GroupeDto[];
};

export type GroupesParSectionsTypeOptions = {
    /** Groupes dont l’un de ces tokens est référent apparaissent en premier dans chaque section. */
    tokenIdsReferentsPrioritaires?: Iterable<string>;
};

/** Groupes regroupés par type, triés par nom dans chaque section (sections vides exclues). */
export function groupesParSectionsType(
    groupes: readonly GroupeDto[],
    options?: GroupesParSectionsTypeOptions,
): SectionGroupes[] {
    const trierSection = (liste: GroupeDto[]) =>
        options?.tokenIdsReferentsPrioritaires
            ? trierGroupesReferentsPuisNom(liste, options.tokenIdsReferentsPrioritaires)
            : trierGroupesParNom(liste);
    return SECTIONS_TYPE_GROUPE.map((section) => ({
        ...section,
        groupes: trierSection(groupes.filter((g) => g.typeGroupe === section.type)),
    })).filter((section) => section.groupes.length > 0);
}
