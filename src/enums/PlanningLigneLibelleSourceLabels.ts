import type { PlanningLigneLibelleSource } from "../types/api";

export const PlanningLigneLibelleSourceLabels: Record<PlanningLigneLibelleSource, string> = {
    SAISIE_LIBRE: "Saisie libre",
    HORAIRE: "Horaire",
    MOMENT: "Moment",
    GROUPE: "Groupe",
    LIEU: "Lieu",
    MEMBRE_EQUIPE: "Membre d'équipe",
};

export const planningLigneLibelleSourceOptions: { value: PlanningLigneLibelleSource; label: string }[] = (
    Object.entries(PlanningLigneLibelleSourceLabels) as [PlanningLigneLibelleSource, string][]
).map(([value, label]) => ({ value, label }));

/** Valeurs proposées pour `sourceLibelleLignes` uniquement (`MEMBRE_EQUIPE` est réservé au contenu des cellules). */
export const planningLibelleLignesSourceOptions = planningLigneLibelleSourceOptions.filter(
    (o) => o.value !== "MEMBRE_EQUIPE"
);
