import { useEffect, useMemo, useState } from "react";
import Form, { FormField } from "./Form";
import { sejourEnfantService } from "../../services/sejour-enfant.service";
import { referencesAlimentairesService, trierReferencesAlimentaires } from "../../services/references-alimentaires.service";
import { optionsCheckboxReferencesAlimentaires } from "../../helpers/optionsReferencesAlimentaires";
import { DossierEnfantDto, ReferenceAlimentaireDto, UpdateDossierEnfantRequest } from "../../types/api";
import { regexValidation } from "../../helpers/regexValidation";

type SectionType = 'contacts' | 'medical' | 'traitements' | 'autres';

interface DossierEnfantFormProps {
    handleCloseModal: () => void;
    sejourId: number;
    enfantId: number;
    data: DossierEnfantDto;
    section?: SectionType;
}

const toFormValue = (v: string | null): string => v ?? "";

const toRequestValue = (v: string): string | null => {
    const trimmed = v?.trim();
    return trimmed === "" ? null : trimmed;
};

const optionalEmailValidation = (value: string) =>
    value && !regexValidation.validateEmail(value) ? "Email invalide" : null;

const optionalPhoneValidation = (value: string) => {
    if (!value || !value.trim()) return null;
    const digitsOnly = value.replace(/\s/g, "");
    return !regexValidation.validatePhone(digitsOnly) ? "Téléphone invalide (10 chiffres commençant par 0)" : null;
};

const sectionFieldsMap: Record<SectionType, string[]> = {
    contacts: ['emailParent1', 'telephoneParent1', 'emailParent2', 'telephoneParent2'],
    medical: ['informationsMedicales', 'pai', 'allergeneIds', 'regimePreferenceIds', 'informationsAlimentaires'],
    traitements: ['traitementMatin', 'traitementMidi', 'traitementSoir', 'traitementSiBesoin'],
    autres: ['autresInformations', 'aPrendreEnSortie'],
};

function DossierEnfantForm({ handleCloseModal, sejourId, enfantId, data, section }: DossierEnfantFormProps) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [refsAllergenes, setRefsAllergenes] = useState<ReferenceAlimentaireDto[]>([]);
    const [refsRegimes, setRefsRegimes] = useState<ReferenceAlimentaireDto[]>([]);
    const [refsLoading, setRefsLoading] = useState(true);
    const [refsError, setRefsError] = useState<string | null>(null);

    const allergeneIdsInit = data.allergenes?.map((r) => r.id) ?? [];
    const regimePreferenceIdsInit = data.regimesEtPreferences?.map((r) => r.id) ?? [];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setRefsLoading(true);
            setRefsError(null);
            try {
                const [a, r] = await Promise.all([
                    referencesAlimentairesService.getReferencesAlimentaires("ALLERGENE"),
                    referencesAlimentairesService.getReferencesAlimentaires("REGIME_PREFERENCE"),
                ]);
                if (!cancelled) {
                    setRefsAllergenes(trierReferencesAlimentaires(a));
                    setRefsRegimes(trierReferencesAlimentaires(r));
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Erreur lors du chargement des références alimentaires";
                if (!cancelled) setRefsError(msg);
            } finally {
                if (!cancelled) setRefsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const initialData = useMemo(
        () => ({
            emailParent1: toFormValue(data.emailParent1),
            telephoneParent1: toFormValue(data.telephoneParent1),
            emailParent2: toFormValue(data.emailParent2),
            telephoneParent2: toFormValue(data.telephoneParent2),
            informationsMedicales: toFormValue(data.informationsMedicales),
            pai: toFormValue(data.pai),
            allergeneIds: [...allergeneIdsInit],
            regimePreferenceIds: [...regimePreferenceIdsInit],
            informationsAlimentaires: toFormValue(data.informationsAlimentaires),
            traitementMatin: toFormValue(data.traitementMatin),
            traitementMidi: toFormValue(data.traitementMidi),
            traitementSoir: toFormValue(data.traitementSoir),
            traitementSiBesoin: toFormValue(data.traitementSiBesoin),
            autresInformations: toFormValue(data.autresInformations),
            aPrendreEnSortie: toFormValue(data.aPrendreEnSortie),
        }),
        [data],
    );

    const fields: FormField[] = useMemo(() => {
        const allergOpts = optionsCheckboxReferencesAlimentaires(refsAllergenes, allergeneIdsInit);
        const regimeOpts = optionsCheckboxReferencesAlimentaires(refsRegimes, regimePreferenceIdsInit);

        const allFields: FormField[] = [
            { name: "emailParent1", label: "Email parent 1", type: "email", validation: optionalEmailValidation },
            { name: "telephoneParent1", label: "Téléphone parent 1", type: "tel", validation: optionalPhoneValidation },
            { name: "emailParent2", label: "Email parent 2", type: "email", validation: optionalEmailValidation },
            { name: "telephoneParent2", label: "Téléphone parent 2", type: "tel", validation: optionalPhoneValidation },
            { name: "informationsMedicales", label: "Informations médicales générales", type: "textarea" },
            { name: "pai", label: "PAI (Projet d'Accueil Individualisé)", type: "textarea" },
            {
                name: "allergeneIds",
                label: "Allergènes",
                type: "checkbox-group",
                checkboxOptions: allergOpts,
            },
            {
                name: "regimePreferenceIds",
                label: "Régimes et préférences alimentaires",
                type: "checkbox-group",
                checkboxOptions: regimeOpts,
            },
            {
                name: "informationsAlimentaires",
                label: "Informations alimentaires (complément libre)",
                type: "textarea",
                rows: 3,
            },
            { name: "traitementMatin", label: "Traitement matin", type: "textarea" },
            { name: "traitementMidi", label: "Traitement midi", type: "textarea" },
            { name: "traitementSoir", label: "Traitement soir", type: "textarea" },
            { name: "traitementSiBesoin", label: "Traitement si besoin", type: "textarea" },
            { name: "autresInformations", label: "Autres informations", type: "textarea" },
            { name: "aPrendreEnSortie", label: "À prendre en sortie", type: "textarea" },
        ];

        if (section) {
            const allowedFields = sectionFieldsMap[section];
            return allFields.filter(field => allowedFields.includes(field.name));
        }

        return allFields;
    }, [refsAllergenes, refsRegimes, data, section]);

    const handleSubmit = async (formData: Record<string, unknown>) => {
        setErrorMessage(null);
        try {
            const allergeneIds = formData.allergeneIds as number[];
            const regimePreferenceIds = formData.regimePreferenceIds as number[];

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
                allergeneIds,
                regimePreferenceIds,
            };
            await sejourEnfantService.updateDossierEnfant(sejourId, enfantId, request);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string; message?: string } } };
            const errorMsg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                (error instanceof Error ? error.message : null) ||
                "Une erreur s'est produite lors de la modification du dossier";
            setErrorMessage(errorMsg);
            throw error;
        }
    };

    if (refsLoading) {
        return <p className="text-muted mb-0">Chargement des référentiels alimentaires…</p>;
    }

    if (refsError) {
        return (
            <div>
                <p className="text-danger">{refsError}</p>
                <p className="text-muted small">Impossible de charger les listes d&apos;allergènes et de régimes. Réessayez plus tard.</p>
            </div>
        );
    }

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
