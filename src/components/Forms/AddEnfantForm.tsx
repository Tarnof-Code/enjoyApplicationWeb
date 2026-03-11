import { useState, useMemo } from "react";
import Form, { FormField } from "./Form";
import { sejourEnfantService } from "../../services/sejour-enfant.service";
import { CreateEnfantRequest, EnfantDto } from "../../types/api";
import dateToISO from "../../helpers/dateToISO";
import formatDateAnglais from "../../helpers/formatDateAnglais";
import { getNiveauScolaireOptions } from "../../enums/NiveauScolaire";

interface AddEnfantFormProps {
    handleCloseModal: () => void;
    sejourId: number;
    data?: EnfantDto;
    isEditMode?: boolean;
}

function AddEnfantForm({ handleCloseModal, sejourId, data, isEditMode = false }: AddEnfantFormProps) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const initialData = useMemo(() => {
        if (isEditMode && data) {
            const dateNaissanceFormatted = data.dateNaissance 
                ? formatDateAnglais(new Date(data.dateNaissance))
                : "";
            
            return {
                nom: data.nom || "",
                prenom: data.prenom || "",
                genre: data.genre || "",
                dateNaissance: dateNaissanceFormatted,
                niveauScolaire: data.niveauScolaire || "",
            };
        }
        return {
            nom: "",
            prenom: "",
            genre: "",
            dateNaissance: "",
            niveauScolaire: "",
        };
    }, [isEditMode, data]);

    const fields: FormField[] = [
        {
            name: "prenom",
            label: "Prénom",
            type: "text",
            required: true,
            validation: (value) => !value ? "Veuillez saisir le prénom de l'enfant" : null
        },
        {
            name: "nom",
            label: "Nom",
            type: "text",
            required: true,
            validation: (value) => !value ? "Veuillez saisir le nom de l'enfant" : null
        },
        {
            name: "genre",
            label: "Genre",
            type: "select",
            required: true,
            options: [
                { value: "Masculin", label: "Masculin" },
                { value: "Féminin", label: "Féminin" }
            ],
            validation: (value) => value === "" ? "Veuillez choisir un genre" : null
        },
        {
            name: "dateNaissance",
            label: "Date de naissance",
            type: "date",
            required: true,
            validation: (value) => !value ? "Veuillez entrer la date de naissance" : null
        },
        {
            name: "niveauScolaire",
            label: "Niveau scolaire",
            type: "select",
            required: true,
            options: getNiveauScolaireOptions(),
            validation: (value) => !value ? "Veuillez choisir un niveau scolaire" : null
        },
    ];

    const getSuccessMessage = (formData: Record<string, unknown>): string => {
        const prenom = formData.prenom as string;
        const nom = formData.nom as string;
        const genre = formData.genre as string;
        
        const participe = genre === "Féminin" ? "e" : "";
        const action = isEditMode ? `modifié${participe}` : `ajouté${participe} au séjour`;

        return `${prenom} ${nom} a bien été ${action}.`;
    };

    const handleSubmit = async (formData: Record<string, unknown>) => {
        setErrorMessage(null);
        try {
            // Vérifier que la date de naissance est valide
            const dateNaissanceISO = dateToISO(formData.dateNaissance as string);
            if (!dateNaissanceISO) {
                setErrorMessage("La date de naissance est invalide");
                return;
            }

            // Construire la requête avec uniquement les informations personnelles de l'enfant
            const request: CreateEnfantRequest = {
                nom: formData.nom as string,
                prenom: formData.prenom as string,
                genre: formData.genre as string,
                dateNaissance: dateNaissanceISO,
                niveauScolaire: formData.niveauScolaire as string,
            };
            
            if (isEditMode && data?.id) {
                // Mode édition : modifier l'enfant existant
                console.log("Modification de l'enfant:", request);
                await sejourEnfantService.modifierEnfant(sejourId, data.id, request);
            } else {
                // Mode création : créer un nouvel enfant
                console.log("Création de l'enfant:", request);
                await sejourEnfantService.creerEtAjouterEnfant(sejourId, request);
            }
            // Ne pas fermer le modal ici, le composant Form le fera après avoir affiché le message de succès
        } catch (error: any) {
            const action = isEditMode ? "modification" : "création";
            console.error(`Erreur lors de la ${action} de l'enfant`, error);
            console.error("Détails de l'erreur:", error.response?.data);
            
            // Gérer les erreurs de validation (400) qui peuvent avoir un format différent
            let errorMsg: string;
            if (error.response?.status === 400 && error.response.data) {
                if (typeof error.response.data === 'object' && !error.response.data.error) {
                    // C'est probablement un objet de validation avec les noms de champs
                    const validationErrors = Object.entries(error.response.data)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join(', ');
                    errorMsg = `Erreurs de validation : ${validationErrors}`;
                } else {
                    errorMsg = error.response.data?.error || 
                              error.response.data?.message || 
                              "Erreur de validation";
                }
            } else {
                errorMsg = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          `Une erreur s'est produite lors de la ${action} de l'enfant`;
            }
            setErrorMessage(errorMsg);
            throw error; // Relancer l'erreur pour que Form ne ferme pas le modal
        }
    };

    return (
        <div>
            <Form
                fields={fields}
                onSubmit={handleSubmit}
                onClose={handleCloseModal}
                submitText={isEditMode ? "Modifier l'enfant" : "Ajouter l'enfant"}
                initialData={initialData}
                errorMessage={errorMessage}
                successMessage={getSuccessMessage}
            />
        </div>
    );
}

export default AddEnfantForm;
