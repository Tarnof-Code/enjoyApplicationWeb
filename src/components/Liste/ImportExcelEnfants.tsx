import React, { useState, useRef } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { sejourEnfantService } from "../../services/sejour-enfant.service";
import { ExcelImportResponse, ExcelImportSpecResponse } from "../../types/api";
import { useRevalidator } from "react-router-dom";
import styles from "./ImportExcelEnfants.module.scss";

interface ImportExcelEnfantsProps {
    sejourId: number;
}

/** Formate un mot-clé pour l'affichage (ex: emailparent1 → email parent 1). Ne formate pas les chaînes déjà formatées par l'API (ex: "(email ou mail)"). */
function formatKeywordForDisplay(keyword: string): string {
    if (!keyword) return keyword;
    if (keyword.includes(" ou ") || keyword.startsWith("(")) return keyword;
    const words = ["parent", "naissance", "matin", "midi", "soir", "besoin", "sibesoin", "alimentaire", "alimentaires", "medical", "médical", "informations", "info", "infos", "regime", "medicament", "traitement", "prendre", "sortie", "autres", "autre", "sanitaire", "sanitaires"];
    let result = keyword
        .replace(/aprendreensortie/gi, "à prendre en sortie")
        .replace(/prendreensortie/gi, "prendre en sortie")
        .replace(/prendreen/gi, "prendre en")
        .replace(/traitementdu/gi, "traitement du")
        .replace(/traitementle/gi, "traitement le");
    for (const word of words) {
        const re = new RegExp(`(.*)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
        result = result.replace(re, (_, prefix) => (prefix ? prefix + " " : "") + word);
    }
    result = result.replace(/([a-zA-Zàâäéèêëïîôùûüç])(\d)/g, "$1 $2");
    return result.trim();
}

/** Formate les mots-clés d'une colonne pour l'affichage. L'API renvoie des groupes (ET entre groupes, OU dans un groupe). */
function formatMotsClesForDisplay(motsCles: string[]): string {
    if (!motsCles?.length) return "";
    return motsCles.map(formatKeywordForDisplay).join(" ET ");
}

/** Affiche les mots-clés avec ET et ou en gras */
function MotsClesAvecGras({ motsCles }: { motsCles: string[] }) {
    const text = formatMotsClesForDisplay(motsCles);
    if (!text) return null;
    const parts = text.split(/(\sET\s|\sou\s)/gi);
    return (
        <>
            {parts.map((part, i) =>
                /^\sET\s$/i.test(part) || /^\sou\s$/i.test(part) ? (
                    <strong key={i}>{part}</strong>
                ) : (
                    part
                )
            )}
        </>
    );
}

const ImportExcelEnfants: React.FC<ImportExcelEnfantsProps> = ({ sejourId }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [importSpec, setImportSpec] = useState<ExcelImportSpecResponse | null>(null);
    const [isLoadingSpec, setIsLoadingSpec] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState<ExcelImportResponse | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingRevalidateRef = useRef(false);
    const revalidator = useRevalidator();

    const handleOpenNotice = async () => {
        setIsNoticeModalOpen(true);
        if (!importSpec) {
            setIsLoadingSpec(true);
            try {
                const spec = await sejourEnfantService.getExcelImportSpec(sejourId);
                setImportSpec(spec);
            } catch (error) {
                console.error("Erreur lors du chargement de la notice", error);
                setImportSpec(null);
            } finally {
                setIsLoadingSpec(false);
            }
        }
    };

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
        pendingRevalidateRef.current = false;

        try {
            const result = await sejourEnfantService.importerEnfantsExcel(sejourId, file);
            setImportResult(result);
            setIsModalOpen(true);
            pendingRevalidateRef.current = result.enfantsCrees > 0;
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error("Erreur lors de l'import Excel", error);
            console.error("Détails de l'erreur:", error.response?.data);
            let errorMsg: string;
            if (!error.response) {
                if (error.message?.toLowerCase().includes('network')) {
                    errorMsg = "Erreur de connexion réseau. Vérifiez votre connexion internet et que le serveur est accessible.";
                } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    errorMsg = "La requête a expiré. Veuillez réessayer.";
                } else {
                    errorMsg = "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
                }
            } else {
                const backendError = error.response?.data;
                if (backendError && typeof backendError === 'object') {
                    errorMsg = backendError.error || backendError.message || error.message || "Une erreur s'est produite lors de l'import du fichier Excel";
                    if (errorMsg.toLowerCase().includes('incomplet') || errorMsg.toLowerCase().includes('manquant')) {
                        errorMsg += " Veuillez vérifier que votre fichier Excel contient toutes les colonnes requises : Nom, Prénom, Genre, Date de naissance, Niveau scolaire.";
                    }
                } else {
                    errorMsg = (typeof backendError === 'string' ? backendError : null) || error.message || "Une erreur s'est produite lors de l'import du fichier Excel";
                }
            }
            setErrorMessage(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseModal = () => {
        if (pendingRevalidateRef.current) {
            revalidator.revalidate();
            pendingRevalidateRef.current = false;
        }
        setIsModalOpen(false);
        setImportResult(null);
        setErrorMessage(null);
    };

    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <div className={styles.importGroup}>
                <Button
                    color="success"
                    onClick={handleFileButtonClick}
                    disabled={isUploading}
                    className={styles.importButton}
                >
                    <FontAwesomeIcon icon={faFileExcel} className={styles.icon} />
                    {isUploading ? "Import en cours..." : "Importer depuis Excel"}
                </Button>
                <button
                    type="button"
                    className={styles.infoButton}
                    onClick={handleOpenNotice}
                    title="Notice des colonnes Excel"
                    aria-label="Afficher la notice des colonnes Excel"
                >
                    <FontAwesomeIcon icon={faCircleInfo} />
                </button>
            </div>
            
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

            <Modal isOpen={isNoticeModalOpen} toggle={() => setIsNoticeModalOpen(false)} size="lg">
                <ModalHeader toggle={() => setIsNoticeModalOpen(false)}>
                    Notice d'import Excel — Colonnes et noms attendus
                </ModalHeader>
                <ModalBody>
                    {isLoadingSpec ? (
                        <p>Chargement de la notice...</p>
                    ) : importSpec ? (
                        <div className={styles.noticeContainer}>
                            <div className={styles.noticeIntro}>
                                <p><strong>Comment ça marche :</strong></p>
                                <ul>
                                    <li>La première ligne de votre fichier doit contenir les en-têtes des colonnes.</li>
                                    <li>Chaque colonne est détectée par <strong>groupes de mots-clés</strong> : l'en-tête doit contenir <strong>tous</strong> les groupes (<strong>ET</strong>), avec <strong>au moins un</strong> mot par groupe (<strong>ou</strong>). Ex. : Email parent 1 = (email <strong>ou</strong> mail) <strong>ET</strong> parent <strong>ET</strong> 1.</li>
                                    <li>Majuscules, espaces et accents sont ignorés — « Nom de l'enfant », « NOM », « Prénom » ou « Prenom » fonctionnent.</li>
                                    <li>Vous pouvez ajouter d'autres mots dans vos en-têtes (ex. « Email du parent 1 », « Date de naissance de l'enfant »).</li>
                                </ul>
                            </div>
                            <div className={styles.formatsSection}>
                                <strong>Formats acceptés :</strong> {importSpec.formatsAcceptes?.join(", ") || ".xlsx, .xls"}
                            </div>
                            <div className={styles.columnsSection}>
                                <h6>Colonnes obligatoires</h6>
                                <p className={styles.keywordsHint}>L'en-tête doit contenir tous les groupes (<strong>ET</strong>), au moins un mot par groupe (<strong>ou</strong>) :</p>
                                <ul>
                                    {importSpec.colonnesObligatoires?.map((col) => (
                                        <li key={col.champ}>
                                            <strong>{col.libelle}</strong> — {col.motsCles?.length ? <MotsClesAvecGras motsCles={col.motsCles} /> : formatKeywordForDisplay(col.champ)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {importSpec.colonnesOptionnelles && importSpec.colonnesOptionnelles.length > 0 && (
                                <div className={styles.columnsSection}>
                                    <h6>Colonnes optionnelles (dossier enfant)</h6>
                                    <p className={styles.keywordsHint}>L'en-tête doit contenir tous les groupes (<strong>ET</strong>), au moins un mot par groupe (<strong>ou</strong>) :</p>
                                    <ul>
                                        {importSpec.colonnesOptionnelles.map((col) => (
                                            <li key={col.champ}>
                                                <strong>{col.libelle}</strong> — {col.motsCles?.length ? <MotsClesAvecGras motsCles={col.motsCles} /> : formatKeywordForDisplay(col.champ)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p>Impossible de charger la notice. Veuillez réessayer.</p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => setIsNoticeModalOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={isModalOpen} toggle={handleCloseModal} size="lg" zIndex={1060}>
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

                            {(() => {
                                const messagesErreur = importResult.messagesErreur ?? [];
                                const hasDuplicates = importResult.enfantsDejaExistants > 0;
                                const hasDuplicateDetails = messagesErreur.some(
                                    (m) => m.toLowerCase().includes("déjà existant") || m.toLowerCase().includes("deja existant") || m.toLowerCase().includes("existe déjà") || m.toLowerCase().includes("doublon")
                                );
                                const allMessages = [
                                    ...messagesErreur,
                                    ...(hasDuplicates && !hasDuplicateDetails
                                        ? [`${importResult.enfantsDejaExistants} enfant(s) déjà présent(s) dans ce séjour — non réimporté(s).`]
                                        : []),
                                ];
                                return allMessages.length > 0 ? (
                                    <div className={styles.errorsList}>
                                        <h5>Détails des erreurs et avertissements :</h5>
                                        <ul>
                                            {allMessages.map((message, index) => (
                                                <li key={index} className={styles.errorItem}>{message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null;
                            })()}
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
