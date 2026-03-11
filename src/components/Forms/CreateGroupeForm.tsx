import { useState } from "react";
import Form, { FormField } from "./Form";
import { sejourGroupeService } from "../../services/sejour-groupe.service";
import { CreateGroupeRequest, GroupeDto, EnfantDto, TypeGroupe } from "../../types/api";
import { getNiveauScolaireOptions } from "../../enums/NiveauScolaire";
import { getEnfantsMatchingTranche } from "../../helpers/groupeTranche";

const NIVEAU_ORDER = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'SIXIEME', 'CINQUIEME', 'QUATRIEME', 'TROISIEME', 'DEUXIEME', 'PREMIERE', 'TERMINALE'];

interface CreateGroupeFormProps {
    handleCloseModal: () => void;
    sejourId: number;
    /** En mode édition, le groupe existant à modifier */
    groupe?: GroupeDto;
    /** Enfants du séjour (pour ajout auto à la création si backend ne l'a pas fait) */
    enfants?: EnfantDto[];
    /** Date de début du séjour pour le calcul de l'âge */
    dateDebutSejour?: string;
}

function CreateGroupeForm({ handleCloseModal, sejourId, groupe, enfants = [], dateDebutSejour = "" }: CreateGroupeFormProps) {
    const isEditMode = !!groupe;
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fields: FormField[] = [
        {
            name: "nom",
            label: "Nom du groupe",
            type: "text",
            required: true,
            validation: (value) => {
                if (!value || (value as string).trim().length < 2) return "Le nom doit contenir au moins 2 caractères";
                if ((value as string).length > 100) return "Le nom ne doit pas dépasser 100 caractères";
                return null;
            }
        },
        {
            name: "description",
            label: "Description",
            type: "textarea",
            required: false,
            placeholder: "Description optionnelle (max 500 caractères)",
            validation: (value) => (value && (value as string).length > 500) ? "Max 500 caractères" : null
        },
        {
            name: "typeGroupe",
            label: "Type de groupe",
            type: "select",
            required: true,
            options: [
                { value: "THEMATIQUE", label: "Thématique" },
                { value: "AGE", label: "Par âge" },
                { value: "NIVEAU_SCOLAIRE", label: "Par niveau scolaire" }
            ],
            validation: (value) => !value ? "Veuillez choisir un type de groupe" : null
        },
        {
            name: "ageMin",
            label: "Âge minimum (inclus)",
            type: "number",
            required: (formData) => formData.typeGroupe === "AGE",
            visible: (formData) => formData.typeGroupe === "AGE",
            validation: (value, allValues) => {
                if (allValues?.typeGroupe !== "AGE") return null;
                if (value === "" || value === null || value === undefined) return "Obligatoire pour un groupe par âge";
                const n = parseInt(String(value), 10);
                if (isNaN(n) || n < 0 || n > 20) return "Âge entre 0 et 20";
                if (allValues?.ageMax !== "" && allValues?.ageMax != null) {
                    const max = parseInt(String(allValues.ageMax), 10);
                    if (!isNaN(max) && n > max) return "ageMin doit être ≤ ageMax";
                }
                return null;
            }
        },
        {
            name: "ageMax",
            label: "Âge maximum (inclus)",
            type: "number",
            required: (formData) => formData.typeGroupe === "AGE",
            visible: (formData) => formData.typeGroupe === "AGE",
            validation: (value, allValues) => {
                if (allValues?.typeGroupe !== "AGE") return null;
                if (value === "" || value === null || value === undefined) return "Obligatoire pour un groupe par âge";
                const n = parseInt(String(value), 10);
                if (isNaN(n) || n < 0 || n > 20) return "Âge entre 0 et 20";
                if (allValues?.ageMin !== "" && allValues?.ageMin != null) {
                    const min = parseInt(String(allValues.ageMin), 10);
                    if (!isNaN(min) && n < min) return "ageMax doit être ≥ ageMin";
                }
                return null;
            }
        },
        {
            name: "niveauScolaireMin",
            label: "Niveau scolaire minimum",
            type: "select",
            required: (formData) => formData.typeGroupe === "NIVEAU_SCOLAIRE",
            options: [{ value: "", label: "—" }, ...getNiveauScolaireOptions()],
            visible: (formData) => formData.typeGroupe === "NIVEAU_SCOLAIRE",
            validation: (value, allValues) => {
                if (allValues?.typeGroupe !== "NIVEAU_SCOLAIRE") return null;
                if (!value) return "Obligatoire pour un groupe par niveau scolaire";
                if (allValues?.niveauScolaireMax) {
                    const idxMin = NIVEAU_ORDER.indexOf(value);
                    const idxMax = NIVEAU_ORDER.indexOf(allValues.niveauScolaireMax);
                    if (idxMin >= 0 && idxMax >= 0 && idxMin > idxMax) return "Le niveau min doit être antérieur ou égal au niveau max";
                }
                return null;
            }
        },
        {
            name: "niveauScolaireMax",
            label: "Niveau scolaire maximum",
            type: "select",
            required: (formData) => formData.typeGroupe === "NIVEAU_SCOLAIRE",
            options: [{ value: "", label: "—" }, ...getNiveauScolaireOptions()],
            visible: (formData) => formData.typeGroupe === "NIVEAU_SCOLAIRE",
            validation: (value, allValues) => {
                if (allValues?.typeGroupe !== "NIVEAU_SCOLAIRE") return null;
                if (!value) return "Obligatoire pour un groupe par niveau scolaire";
                if (allValues?.niveauScolaireMin) {
                    const idxMin = NIVEAU_ORDER.indexOf(allValues.niveauScolaireMin);
                    const idxMax = NIVEAU_ORDER.indexOf(value);
                    if (idxMin >= 0 && idxMax >= 0 && idxMin > idxMax) return "Le niveau max doit être postérieur ou égal au niveau min";
                }
                return null;
            }
        },
    ];

    const handleSubmit = async (formData: Record<string, unknown>) => {
        setErrorMessage(null);
        const typeGroupe = formData.typeGroupe as TypeGroupe;
        const request: CreateGroupeRequest = {
            nom: (formData.nom as string).trim(),
            description: formData.description ? (formData.description as string).trim() || null : null,
            typeGroupe,
            ageMin: typeGroupe === "AGE" && formData.ageMin !== "" ? parseInt(String(formData.ageMin), 10) : null,
            ageMax: typeGroupe === "AGE" && formData.ageMax !== "" ? parseInt(String(formData.ageMax), 10) : null,
            niveauScolaireMin: typeGroupe === "NIVEAU_SCOLAIRE" && formData.niveauScolaireMin ? (formData.niveauScolaireMin as string) : null,
            niveauScolaireMax: typeGroupe === "NIVEAU_SCOLAIRE" && formData.niveauScolaireMax ? (formData.niveauScolaireMax as string) : null,
        };
        try {
            if (isEditMode && groupe) {
                await sejourGroupeService.modifierGroupe(sejourId, groupe.id, request);
            } else {
                const created = await sejourGroupeService.creerGroupe(sejourId, request);
                // Si le backend n'a pas ajouté les enfants (ex. créés avant la liste d'enfants), on les ajoute côté frontend
                if (
                    (created.typeGroupe === "AGE" || created.typeGroupe === "NIVEAU_SCOLAIRE") &&
                    created.enfants.length === 0 &&
                    enfants.length > 0 &&
                    dateDebutSejour
                ) {
                    const matching = getEnfantsMatchingTranche(created, enfants, dateDebutSejour, new Set());
                    for (const enfant of matching) {
                        await sejourGroupeService.ajouterEnfantAuGroupe(sejourId, created.id, enfant.id);
                    }
                }
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || error.response?.data?.message || error.message || (isEditMode ? "Erreur lors de la modification du groupe" : "Erreur lors de la création du groupe");
            setErrorMessage(msg);
            throw error;
        }
    };

    const infoContent = (formData: Record<string, any>) => {
        const type = formData?.typeGroupe;
        if (type === "AGE" || type === "NIVEAU_SCOLAIRE") {
            return (
                <p className="text-muted small mb-3">
                    {isEditMode
                        ? "La modification de la tranche ne réapplique pas automatiquement les critères aux enfants déjà dans le groupe."
                        : "Les enfants du séjour correspondant à cette tranche seront ajoutés automatiquement au groupe."}
                </p>
            );
        }
        return null;
    };

    const initialData = isEditMode && groupe
        ? {
            nom: groupe.nom,
            description: groupe.description ?? "",
            typeGroupe: groupe.typeGroupe,
            ageMin: groupe.ageMin != null ? String(groupe.ageMin) : "",
            ageMax: groupe.ageMax != null ? String(groupe.ageMax) : "",
            niveauScolaireMin: groupe.niveauScolaireMin ?? "",
            niveauScolaireMax: groupe.niveauScolaireMax ?? "",
        }
        : {
            nom: "",
            description: "",
            typeGroupe: "",
            ageMin: "",
            ageMax: "",
            niveauScolaireMin: "",
            niveauScolaireMax: "",
        };

    return (
        <Form
            fields={fields}
            onSubmit={handleSubmit}
            onClose={handleCloseModal}
            submitText={isEditMode ? "Modifier le groupe" : "Créer le groupe"}
            initialData={initialData}
            errorMessage={errorMessage}
            successMessage={isEditMode ? "Le groupe a bien été modifié." : "Le groupe a bien été créé."}
            infoContent={infoContent}
        />
    );
}

export default CreateGroupeForm;
