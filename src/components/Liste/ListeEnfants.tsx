import React, { useState } from "react";
import { useRevalidator, useNavigate } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { EnfantDto } from "../../types/api";
import Liste, { ColumnConfig } from "./Liste";
import { sejourService } from "../../services/sejour.service";
import calculerAge from "../../helpers/calculerAge";
import formaterDate from "../../helpers/formaterDate";
import AddEnfantForm from "../Forms/AddEnfantForm";
import ImportExcelEnfants from "./ImportExcelEnfants";
import { NiveauScolaireLabels } from "../../enums/NiveauScolaire";
import styles from "./ListeEnfants.module.scss";

interface ListeEnfantsProps {
    enfants: EnfantDto[];
    sejourId: number;
}

const ListeEnfants: React.FC<ListeEnfantsProps> = ({ enfants, sejourId }) => {
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const handleDeleteEnfant = async (enfant: EnfantDto, _index: number) => {
        try {
            await sejourService.supprimerEnfantDuSejour(sejourId, enfant.id);
            revalidator.revalidate();
        } catch (error) {
            console.error("Erreur lors du retrait de l'enfant", error);
            setErrorMessage("Erreur lors du retrait de l'enfant");
        }
    };

    const createColumn = (key: string, label: string, type: ColumnConfig['type'] = 'text', options?: Partial<ColumnConfig>): ColumnConfig => ({
        key, label, type, filterable: true, filterType: type === 'select' ? 'select' : 'text', ...options
    });

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
    ];

    const handleDeleteAllEnfants = async () => {
        setIsDeletingAll(true);
        setErrorMessage(null);
        try {
            await sejourService.supprimerTousLesEnfants(sejourId);
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
        navigate(`/directeur/sejours/${sejourId}/enfants/${enfant.id}/dossier`);
    };

    const FormWithProps = (props: any) => (
        <AddEnfantForm 
            {...props} 
            sejourId={sejourId}
        />
    );

    return (
        <div>
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
            
            {errorMessage && (
                <div className={styles.errorMessage}>
                    {errorMessage}
                </div>
            )}

            <Liste
                title={`Liste des enfants (${enfants.length})`}
                columns={columns}
                data={enfants}
                loading={false}
                onDelete={handleDeleteEnfant}
                canAdd={true}
                canEdit={true}
                canDelete={true}
                canDossier={true}
                onDossier={handleDossier}
                formComponent={FormWithProps}
                addButtonText="Ajouter un enfant"
                deleteConfirmationMessage={(enfant) => `Voulez-vous retirer ${enfant.prenom} ${enfant.nom} de ce séjour ?`}
                errorMessage={errorMessage}
            />

            {/* Modal de confirmation pour supprimer tous les enfants */}
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
                        color="dark" 
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
        </div>
    );
};

export default ListeEnfants;
