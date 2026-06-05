import type { GroupeDto, TypeGroupe } from "../types/api";

export const SECTIONS_TYPE_GROUPE: { type: TypeGroupe; label: string }[] = [
    { type: "THEMATIQUE", label: "Thématique" },
    { type: "AGE", label: "Par âge" },
    { type: "NIVEAU_SCOLAIRE", label: "Par niveau scolaire" },
];

export function comparerGroupesParNom(a: GroupeDto, b: GroupeDto): number {
    return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
}

export function trierGroupesParNom(groupes: readonly GroupeDto[]): GroupeDto[] {
    return [...groupes].sort(comparerGroupesParNom);
}

export type SectionGroupes = {
    type: TypeGroupe;
    label: string;
    groupes: GroupeDto[];
};

/** Groupes regroupés par type, triés par nom dans chaque section (sections vides exclues). */
export function groupesParSectionsType(groupes: readonly GroupeDto[]): SectionGroupes[] {
    return SECTIONS_TYPE_GROUPE.map((section) => ({
        ...section,
        groupes: trierGroupesParNom(groupes.filter((g) => g.typeGroupe === section.type)),
    })).filter((section) => section.groupes.length > 0);
}
