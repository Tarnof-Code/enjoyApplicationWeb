import { useEffect, useState } from "react";
import { LoaderFunctionArgs, useLoaderData, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import styles from "./DossierEnfant.module.scss";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import { DossierEnfantDto, EnfantDto } from "../../../types/api";
import DossierEnfantForm from "../../../components/Forms/DossierEnfantForm";

export async function dossierEnfantLoader({ params }: LoaderFunctionArgs) {
    const { sejourId, enfantId } = params;
    if (!sejourId || !enfantId) throw new Error("Paramètres manquants");
    try {
        const [dossier, enfants] = await Promise.all([
            sejourEnfantService.getDossierEnfant(parseInt(sejourId), parseInt(enfantId)),
            sejourEnfantService.getEnfantsDuSejour(parseInt(sejourId))
        ]);
        const enfant = enfants.find((e: EnfantDto) => e.id === parseInt(enfantId));
        return { dossier, enfant };
    } catch (error) {
        console.error("Erreur chargement dossier enfant", error);
        return error;
    }
}

const formatValue = (value: string | null): string => {
    return value?.trim() || "—";
};

interface DossierLocationState {
    from?: 'groupes' | 'enfants';
    openAccordion?: string;
    expandedGroupeId?: number;
}

const DossierEnfant: React.FC = () => {
    const loaderData = useLoaderData() as { dossier: DossierEnfantDto; enfant: EnfantDto | undefined } | Error;
    const navigate = useNavigate();
    const location = useLocation();
    const { sejourId, enfantId } = useParams();
    const [showEditModal, setShowEditModal] = useState(false);
    const returnState = location.state as DossierLocationState | null;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleRetour = () => {
        if (sejourId && returnState?.openAccordion) {
            navigate(`/directeur/sejours/${sejourId}`, {
                state: {
                    openAccordion: returnState.openAccordion,
                    expandedGroupeId: returnState.expandedGroupeId
                },
                replace: true
            });
        } else if (sejourId) {
            navigate(`/directeur/sejours/${sejourId}`, { replace: true });
        } else {
            navigate(-1);
        }
    };

    if (loaderData instanceof Error) {
        const message = (loaderData as any).response?.status === 403
            ? "Vous ne participez pas à ce séjour"
            : (loaderData as any).response?.status === 404
                ? "Dossier non trouvé ou enfant non inscrit à ce séjour"
                : "Erreur lors du chargement du dossier";
        return (
            <div className={styles.pageContainer}>
                <button onClick={handleRetour} className={styles.backButton}>
                    ← Retour
                </button>
                <p className={styles.error}>{message}</p>
            </div>
        );
    }

    const { dossier, enfant } = loaderData;
    const enfantNom = enfant ? `${enfant.prenom} ${enfant.nom}` : `Enfant #${dossier.enfantId}`;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <button onClick={handleRetour} className={styles.backButton}>
                    ← Retour
                </button>
                <h1 className={styles.pageTitle}>
                    Dossier de <span className={styles.enfantNameBadge}>{enfantNom}</span>
                </h1>
                {sejourId && enfantId && (
                    <Button
                        color="primary"
                        onClick={() => setShowEditModal(true)}
                        className={styles.editButton}
                    >
                        <FontAwesomeIcon icon={faPencilAlt} className={styles.editIcon} />
                        Modifier
                    </Button>
                )}
            </div>

            <div className={styles.dossierContent}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Contacts parents</h2>
                    <div className={styles.grid}>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Email parent 1</span>
                            <span className={styles.value}>{formatValue(dossier.emailParent1)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Téléphone parent 1</span>
                            <span className={styles.value}>{formatValue(dossier.telephoneParent1)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Email parent 2</span>
                            <span className={styles.value}>{formatValue(dossier.emailParent2)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Téléphone parent 2</span>
                            <span className={styles.value}>{formatValue(dossier.telephoneParent2)}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Informations médicales</h2>
                    <div className={styles.infoStack}>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Informations médicales générales</span>
                            <span className={styles.value}>{formatValue(dossier.informationsMedicales)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>PAI (Projet d'Accueil Individualisé)</span>
                            <span className={styles.value}>{formatValue(dossier.pai)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Informations alimentaires</span>
                            <span className={styles.value}>{formatValue(dossier.informationsAlimentaires)}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Traitements</h2>
                    <div className={styles.grid}>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Matin</span>
                            <span className={styles.value}>{formatValue(dossier.traitementMatin)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Midi</span>
                            <span className={styles.value}>{formatValue(dossier.traitementMidi)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Soir</span>
                            <span className={styles.value}>{formatValue(dossier.traitementSoir)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Si besoin</span>
                            <span className={styles.value}>{formatValue(dossier.traitementSiBesoin)}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Autres informations</h2>
                    <div className={styles.infoStack}>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Autres informations</span>
                            <span className={styles.value}>{formatValue(dossier.autresInformations)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>À prendre en sortie</span>
                            <span className={styles.value}>{formatValue(dossier.aPrendreEnSortie)}</span>
                        </div>
                    </div>
                </section>
            </div>

            <Modal isOpen={showEditModal} toggle={() => setShowEditModal(false)} size="lg">
                <ModalHeader toggle={() => setShowEditModal(false)}>
                    Modifier le dossier
                </ModalHeader>
                <ModalBody>
                    {showEditModal && sejourId && enfantId && (
                        <DossierEnfantForm
                            handleCloseModal={() => setShowEditModal(false)}
                            sejourId={parseInt(sejourId)}
                            enfantId={parseInt(enfantId)}
                            data={dossier}
                        />
                    )}
                </ModalBody>
            </Modal>
        </div>
    );
};

export default DossierEnfant;
