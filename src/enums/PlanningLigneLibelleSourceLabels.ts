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

/** Valeurs proposées pour le type de libellé des lignes d’une grille (incl. membre d’équipe). */
export const planningLibelleLignesSourceOptions = planningLigneLibelleSourceOptions;
