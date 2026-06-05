import React, { useState } from "react";
import { useRevalidator, useNavigate } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { EnfantDto, GroupeDto, TypeGroupe } from "../../types/api";
import Liste, { ColumnConfig } from "./Liste";
import { sejourEnfantService } from "../../services/sejour-enfant.service";
import { sejourGroupeService } from "../../services/sejour-groupe.service";
import calculerAge from "../../helpers/calculerAge";
import formaterDate from "../../helpers/formaterDate";
import AddEnfantForm from "../Forms/AddEnfantForm";
import ImportExcelEnfants from "./ImportExcelEnfants";
import { NiveauScolaireLabels } from "../../enums/NiveauScolaire";
import styles from "./ListeEnfants.module.scss";

const SECTIONS_TYPE_GROUPE: { type: TypeGroupe; label: string }[] = [
    { type: "THEMATIQUE", label: "Thématique" },
    { type: "AGE", label: "Par âge" },
    { type: "NIVEAU_SCOLAIRE", label: "Par niveau scolaire" },
];

export interface ListeEnfantsProps {
    enfants: EnfantDto[];
    groupes?: GroupeDto[];
    sejourId: number;
    /** Directeur du séjour ou adjoint : import, ajout, édition, suppressions ; sinon lecture + dossier uniquement */
    peutGererEnfants: boolean;
}

const ListeEnfants: React.FC<ListeEnfantsProps> = ({ enfants, groupes = [], sejourId, peutGererEnfants }) => {
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [groupeModalEnfant, setGroupeModalEnfant] = useState<EnfantDto | null>(null);
    const [selectedGroupeIds, setSelectedGroupeIds] = useState<Set<number>>(new Set());
    const [isSavingGroupes, setIsSavingGroupes] = useState(false);
    const [groupeModalError, setGroupeModalError] = useState<string | null>(null);

    const handleDeleteEnfant = async (enfant: EnfantDto, _index: number) => {
        await sejourEnfantService.supprimerEnfantDuSejour(sejourId, enfant.id);
        revalidator.revalidate();
    };

    const createColumn = (key: string, label: string, type: ColumnConfig['type'] = 'text', options?: Partial<ColumnConfig>): ColumnConfig => ({
        key, label, type, filterable: true, filterType: type === 'select' ? 'select' : 'text', ...options
    });

    const getGroupesPourEnfant = (enfantId: number): GroupeDto[] => {
        return groupes.filter((g) => g.enfants.some((e) => e.id === enfantId));
    };

    const getNomsGroupesPourEnfant = (enfantId: number): string[] => {
        return getGroupesPourEnfant(enfantId).map((g) => g.nom);
    };

    const openGroupeModal = (enfant: EnfantDto) => {
        const ids = new Set(getGroupesPourEnfant(enfant.id).map((g) => g.id));
        setSelectedGroupeIds(ids);
        setGroupeModalError(null);
        setGroupeModalEnfant(enfant);
    };

    const closeGroupeModal = () => {
        if (isSavingGroupes) return;
        setGroupeModalEnfant(null);
        setGroupeModalError(null);
        setSelectedGroupeIds(new Set());
    };

    const toggleGroupeSelection = (groupeId: number) => {
        setSelectedGroupeIds((prev) => {
            const next = new Set(prev);
            if (next.has(groupeId)) next.delete(groupeId);
            else next.add(groupeId);
            return next;
        });
    };

    const handleSaveGroupes = async () => {
        if (!groupeModalEnfant) return;
        const enfantId = groupeModalEnfant.id;
        const anciensIds = new Set(getGroupesPourEnfant(enfantId).map((g) => g.id));
        const aAjouter = [...selectedGroupeIds].filter((id) => !anciensIds.has(id));
        const aRetirer = [...anciensIds].filter((id) => !selectedGroupeIds.has(id));

        if (aAjouter.length === 0 && aRetirer.length === 0) {
            closeGroupeModal();
            return;
        }

        setIsSavingGroupes(true);
        setGroupeModalError(null);
        try {
            for (const groupeId of aRetirer) {
                await sejourGroupeService.retirerEnfantDuGroupe(sejourId, groupeId, enfantId);
            }
            for (const groupeId of aAjouter) {
                await sejourGroupeService.ajouterEnfantAuGroupe(sejourId, groupeId, enfantId);
            }
            closeGroupeModal();
            revalidator.revalidate();
        } catch (error) {
            console.error("Erreur lors de la mise à jour des groupes", error);
            setGroupeModalError(
                error instanceof Error ? error.message : "Erreur lors de la mise à jour des groupes"
            );
        } finally {
            setIsSavingGroupes(false);
        }
    };

    const columns: ColumnConfig[] = [
        createColumn('nom', 'Nom'),
        createColumn('prenom', 'Prénom'),
        createColumn('genre', 'Genre', 'select', {
            filterOptions: [
                { value: '', label: 'Tous' },
                { value: 'Masculin', label: 'Masculin' },
                { value: 'Féminin', label: 'Féminin' }
            ]
        }),
        createColumn('niveauScolaire', 'Niveau scolaire', 'text', {
            render: (value) => {
                const niveau = value as keyof typeof NiveauScolaireLabels;
                return NiveauScolaireLabels[niveau] || value;
            }
        }),
        createColumn('dateNaissance', 'Date de naissance', 'date', {
            render: (value) => formaterDate(new Date(value))
        }),
        createColumn('age', 'Âge', 'custom', {
            filterType: 'number',
            render: (_, item) => `${calculerAge(item.dateNaissance)} ans`
        }),
        ...(groupes.length > 0
            ? [
                createColumn('groupes', 'Groupe(s)', 'text', {
                    filterable: true,
                    render: (_, item) => {
                        const noms = getNomsGroupesPourEnfant(item.id);
                        const label = noms.length > 0 ? noms.join(", ") : "—";
                        if (!peutGererEnfants) {
                            return label;
                        }
                        return (
                            <span className={styles.groupeCell}>
                                <span>{label}</span>
                                <FontAwesomeIcon
                                    className={`icone_crayon_edit ${styles.groupeEditIcon}`}
                                    icon={faPencilAlt}
                                    onClick={() => openGroupeModal(item)}
                                    title="Gérer les groupes"
                                />
                            </span>
                        );
                    }
                })
            ]
            : []),
    ];

    const dataWithGroupes = groupes.length > 0
        ? enfants.map((e) => ({ ...e, groupes: getNomsGroupesPourEnfant(e.id).join(", ") || "—" }))
        : enfants;

    const handleDeleteAllEnfants = async () => {
        setIsDeletingAll(true);
        setErrorMessage(null);
        try {
            await sejourEnfantService.supprimerTousLesEnfants(sejourId);
            setShowDeleteAllModal(false);
            revalidator.revalidate();
        } catch (error: any) {
            console.error("Erreur lors de la suppression de tous les enfants", error);
            setErrorMessage(error.message || "Une erreur s'est produite lors de la suppression de tous les enfants");
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleDossier = (enfant: EnfantDto) => {
        const state = { from: 'enfants' as const, openAccordion: '3' };
        navigate(`/mes-sejours/${sejourId}`, { state, replace: true });
        navigate(`/mes-sejours/${sejourId}/enfants/${enfant.id}/dossier`, { state });
    };

    const FormWithProps = (props: any) => (
        <AddEnfantForm 
            {...props} 
            sejourId={sejourId}
        />
    );

    return (
        <div>
            {peutGererEnfants && (
                <div className={styles.actionsContainer}>
                    <ImportExcelEnfants sejourId={sejourId} />
                    {enfants.length > 0 && (
                        <Button
                            color="danger"
                            onClick={() => setShowDeleteAllModal(true)}
                            className={styles.deleteAllButton}
                        >
                            <FontAwesomeIcon icon={faTrash} className={styles.icon} />
                            Supprimer tous les enfants
                        </Button>
                    )}
                </div>
            )}
            
            {errorMessage && (
                <div className={styles.errorMessage}>
                    {errorMessage}
                </div>
            )}

            <Liste
                title={`Liste des enfants (${enfants.length})`}
                columns={columns}
                data={dataWithGroupes}
                loading={false}
                onDelete={handleDeleteEnfant}
                canAdd={peutGererEnfants}
                canEdit={peutGererEnfants}
                canDelete={peutGererEnfants}
                canDossier={true}
                onDossier={handleDossier}
                formComponent={FormWithProps}
                addButtonText="Ajouter un enfant"
                deleteConfirmationMessage={(enfant) => `Voulez-vous retirer ${enfant.prenom} ${enfant.nom} de ce séjour ?`}
                errorMessage={errorMessage}
            />

            {peutGererEnfants && groupeModalEnfant && (
                <Modal isOpen toggle={closeGroupeModal} size="md">
                    <ModalHeader toggle={closeGroupeModal}>
                        Groupes de {groupeModalEnfant.prenom} {groupeModalEnfant.nom}
                    </ModalHeader>
                    <ModalBody>
                        <p className={styles.groupeModalIntro}>
                            Cochez les groupes auxquels cet enfant doit appartenir.
                        </p>
                        <div className={styles.groupePickerSections}>
                            {SECTIONS_TYPE_GROUPE.map((section) => {
                                const groupesSection = groupes
                                    .filter((g) => g.typeGroupe === section.type)
                                    .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
                                if (groupesSection.length === 0) return null;
                                return (
                                    <section key={section.type} className={styles.groupePickerSection}>
                                        <h3 className={styles.groupePickerSectionTitle}>{section.label}</h3>
                                        <ul className={styles.groupePickerList}>
                                            {groupesSection.map((groupe) => (
                                                <li key={groupe.id} className={styles.groupePickerRow}>
                                                    <label className={styles.groupePickerLabel}>
                                                        <input
                                                            type="checkbox"
                                                            className={styles.groupePickerCheckbox}
                                                            checked={selectedGroupeIds.has(groupe.id)}
                                                            onChange={() => toggleGroupeSelection(groupe.id)}
                                                            disabled={isSavingGroupes}
                                                        />
                                                        <span>{groupe.nom}</span>
                                                    </label>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                );
                            })}
                        </div>
                        {groupeModalError && (
                            <div className={styles.errorMessage}>{groupeModalError}</div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={closeGroupeModal} disabled={isSavingGroupes}>
                            Annuler
                        </Button>
                        <Button color="success" onClick={handleSaveGroupes} disabled={isSavingGroupes}>
                            {isSavingGroupes ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </ModalFooter>
                </Modal>
            )}

            {peutGererEnfants && (
            <Modal isOpen={showDeleteAllModal} toggle={() => setShowDeleteAllModal(false)}>
                <ModalHeader toggle={() => setShowDeleteAllModal(false)}>
                    Confirmation de suppression
                </ModalHeader>
                <ModalBody>
                    <p>
                        Vous allez supprimer <strong>tous les enfants</strong> de ce séjour ({enfants.length} enfant{enfants.length > 1 ? 's' : ''}).
                    </p>
                    <p className={styles.warningText}>
                        <strong>Attention :</strong> Cette action est irréversible.
                    </p>
                    <p>Êtes-vous sûr de vouloir continuer ?</p>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="secondary" 
                        onClick={() => setShowDeleteAllModal(false)}
                        disabled={isDeletingAll}
                        className={styles.cancelButton}
                    >
                        Annuler
                    </Button>
                    <Button 
                        color="danger" 
                        onClick={handleDeleteAllEnfants}
                        disabled={isDeletingAll}
                    >
                        {isDeletingAll ? "Suppression en cours..." : "Confirmer la suppression"}
                    </Button>
                </ModalFooter>
            </Modal>
            )}
        </div>
    );
};

export default ListeEnfants;
