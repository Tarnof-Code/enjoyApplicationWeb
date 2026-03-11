import React, { useState, useRef } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel } from "@fortawesome/free-solid-svg-icons";
import { sejourEnfantService } from "../../services/sejour-enfant.service";
import { ExcelImportResponse } from "../../types/api";
import { useRevalidator } from "react-router-dom";
import styles from "./ImportExcelEnfants.module.scss";

interface ImportExcelEnfantsProps {
    sejourId: number;
}

const ImportExcelEnfants: React.FC<ImportExcelEnfantsProps> = ({ sejourId }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState<ExcelImportResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const revalidator = useRevalidator();

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Vérifier que c'est un fichier Excel
        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validExtensions.includes(fileExtension)) {
            setErrorMessage("Veuillez sélectionner un fichier Excel (.xlsx ou .xls)");
            return;
        }

        setIsUploading(true);
        setErrorMessage(null);
        setImportResult(null);

        try {
            const result = await sejourEnfantService.importerEnfantsExcel(sejourId, file);
            setImportResult(result);
            setIsModalOpen(true);
            // Réinitialiser l'input file
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            // Rafraîchir la liste des enfants
            revalidator.revalidate();
        } catch (error: any) {
            console.error("Erreur lors de l'import Excel", error);
            console.error("Détails de l'erreur:", error.response?.data);
            
            // Gérer les erreurs réseau différemment des erreurs HTTP
            let errorMsg: string;
            if (!error.response) {
                // Erreur réseau (pas de réponse du serveur)
                if (error.message && error.message.toLowerCase().includes('network')) {
                    errorMsg = "Erreur de connexion réseau. Vérifiez votre connexion internet et que le serveur est accessible.";
                } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    errorMsg = "La requête a expiré. Veuillez réessayer.";
                } else {
                    errorMsg = "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
                }
            } else {
                // Erreur HTTP avec réponse du serveur
                // Extraire le message d'erreur du backend
                const backendError = error.response?.data;
                if (backendError) {
                    // Si c'est un objet avec un champ 'error' ou 'message'
                    if (typeof backendError === 'object') {
                        errorMsg = backendError.error || backendError.message || error.message || "Une erreur s'est produite lors de l'import du fichier Excel";
                        
                        // Si le message indique des données incomplètes, ajouter des conseils
                        if (errorMsg.toLowerCase().includes('incomplet') || errorMsg.toLowerCase().includes('manquant')) {
                            errorMsg += " Veuillez vérifier que votre fichier Excel contient toutes les colonnes requises : Nom, Prénom, Genre, Date de naissance, Niveau scolaire.";
                        }
                    } else {
                        errorMsg = backendError;
                    }
                } else {
                    errorMsg = error.message || "Une erreur s'est produite lors de l'import du fichier Excel";
                }
            }
            
            setErrorMessage(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setImportResult(null);
        setErrorMessage(null);
    };

    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <Button
                color="success"
                onClick={handleFileButtonClick}
                disabled={isUploading}
                className={styles.importButton}
            >
                <FontAwesomeIcon icon={faFileExcel} className={styles.icon} />
                {isUploading ? "Import en cours..." : "Importer depuis Excel"}
            </Button>
            
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {errorMessage && (
                <div className={styles.errorMessage}>
                    {errorMessage}
                </div>
            )}

            <Modal isOpen={isModalOpen} toggle={handleCloseModal} size="lg">
                <ModalHeader toggle={handleCloseModal}>
                    Résultat de l'import Excel
                </ModalHeader>
                <ModalBody>
                    {importResult ? (
                        <div className={styles.resultContainer}>
                            <div className={styles.summary}>
                                <h5>Résumé de l'import</h5>
                                <ul>
                                    <li><strong>Total de lignes traitées :</strong> {importResult.totalLignes}</li>
                                    <li className={styles.success}><strong>Enfants créés avec succès :</strong> {importResult.enfantsCrees}</li>
                                    {importResult.enfantsDejaExistants > 0 && (
                                        <li className={styles.warning}>
                                            <strong>Enfants déjà existants :</strong> {importResult.enfantsDejaExistants}
                                        </li>
                                    )}
                                    {importResult.erreurs > 0 && (
                                        <li className={styles.error}>
                                            <strong>Erreurs :</strong> {importResult.erreurs}
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {importResult.messagesErreur && importResult.messagesErreur.length > 0 && (
                                <div className={styles.errorsList}>
                                    <h5>Détails des erreurs :</h5>
                                    <ul>
                                        {importResult.messagesErreur.map((message, index) => (
                                            <li key={index} className={styles.errorItem}>{message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p>Veuillez sélectionner un fichier Excel à importer.</p>
                            <p className={styles.helpText}>
                                <strong>Format attendu :</strong> Le fichier Excel doit contenir les colonnes suivantes :
                                Nom, Prénom, Genre, Date de naissance, Niveau scolaire.
                            </p>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleCloseModal}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default ImportExcelEnfants;
