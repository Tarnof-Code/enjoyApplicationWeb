import { useState } from "react";
import Form, { FormField } from "./Form";
import { sejourService } from "../../services/sejour.service";
import { DossierEnfantDto, UpdateDossierEnfantRequest } from "../../types/api";
import { regexValidation } from "../../helpers/regexValidation";

interface DossierEnfantFormProps {
    handleCloseModal: () => void;
    sejourId: number;
    enfantId: number;
    data: DossierEnfantDto;
}

const toFormValue = (v: string | null): string => v ?? "";

const toRequestValue = (v: string): string | null => {
    const trimmed = v?.trim();
    return trimmed === "" ? null : trimmed;
};

function DossierEnfantForm({ handleCloseModal, sejourId, enfantId, data }: DossierEnfantFormProps) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const initialData = {
        emailParent1: toFormValue(data.emailParent1),
        telephoneParent1: toFormValue(data.telephoneParent1),
        emailParent2: toFormValue(data.emailParent2),
        telephoneParent2: toFormValue(data.telephoneParent2),
        informationsMedicales: toFormValue(data.informationsMedicales),
        pai: toFormValue(data.pai),
        informationsAlimentaires: toFormValue(data.informationsAlimentaires),
        traitementMatin: toFormValue(data.traitementMatin),
        traitementMidi: toFormValue(data.traitementMidi),
        traitementSoir: toFormValue(data.traitementSoir),
        traitementSiBesoin: toFormValue(data.traitementSiBesoin),
        autresInformations: toFormValue(data.autresInformations),
        aPrendreEnSortie: toFormValue(data.aPrendreEnSortie),
    };

    const optionalEmailValidation = (value: string) =>
        value && !regexValidation.validateEmail(value) ? "Email invalide" : null;

    const optionalPhoneValidation = (value: string) => {
        if (!value || !value.trim()) return null;
        const digitsOnly = value.replace(/\s/g, "");
        return !regexValidation.validatePhone(digitsOnly) ? "Téléphone invalide (10 chiffres commençant par 0)" : null;
    };

    const fields: FormField[] = [
        { name: "emailParent1", label: "Email parent 1", type: "email", validation: optionalEmailValidation },
        { name: "telephoneParent1", label: "Téléphone parent 1", type: "tel", validation: optionalPhoneValidation },
        { name: "emailParent2", label: "Email parent 2", type: "email", validation: optionalEmailValidation },
        { name: "telephoneParent2", label: "Téléphone parent 2", type: "tel", validation: optionalPhoneValidation },
        { name: "informationsMedicales", label: "Informations médicales générales", type: "textarea" },
        { name: "pai", label: "PAI (Projet d'Accueil Individualisé)", type: "textarea" },
        { name: "informationsAlimentaires", label: "Informations alimentaires", type: "textarea" },
        { name: "traitementMatin", label: "Traitement matin", type: "textarea" },
        { name: "traitementMidi", label: "Traitement midi", type: "textarea" },
        { name: "traitementSoir", label: "Traitement soir", type: "textarea" },
        { name: "traitementSiBesoin", label: "Traitement si besoin", type: "textarea" },
        { name: "autresInformations", label: "Autres informations", type: "textarea" },
        { name: "aPrendreEnSortie", label: "À prendre en sortie", type: "textarea" },
    ];

    const handleSubmit = async (formData: Record<string, unknown>) => {
        setErrorMessage(null);
        try {
            const request: UpdateDossierEnfantRequest = {
                emailParent1: toRequestValue(formData.emailParent1 as string),
                telephoneParent1: toRequestValue(formData.telephoneParent1 as string),
                emailParent2: toRequestValue(formData.emailParent2 as string),
                telephoneParent2: toRequestValue(formData.telephoneParent2 as string),
                informationsMedicales: toRequestValue(formData.informationsMedicales as string),
                pai: toRequestValue(formData.pai as string),
                informationsAlimentaires: toRequestValue(formData.informationsAlimentaires as string),
                traitementMatin: toRequestValue(formData.traitementMatin as string),
                traitementMidi: toRequestValue(formData.traitementMidi as string),
                traitementSoir: toRequestValue(formData.traitementSoir as string),
                traitementSiBesoin: toRequestValue(formData.traitementSiBesoin as string),
                autresInformations: toRequestValue(formData.autresInformations as string),
                aPrendreEnSortie: toRequestValue(formData.aPrendreEnSortie as string),
            };
            await sejourService.updateDossierEnfant(sejourId, enfantId, request);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                "Une erreur s'est produite lors de la modification du dossier";
            setErrorMessage(errorMsg);
            throw error;
        }
    };

    return (
        <Form
            fields={fields}
            onSubmit={handleSubmit}
            onClose={handleCloseModal}
            submitText="Enregistrer"
            initialData={initialData}
            errorMessage={errorMessage}
            successMessage="Le dossier a été mis à jour avec succès."
        />
    );
}

export default DossierEnfantForm;
