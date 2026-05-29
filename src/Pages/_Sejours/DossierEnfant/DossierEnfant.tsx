import { useEffect, useMemo, useState } from "react";
import { LoaderFunctionArgs, json, useLoaderData, useLocation, useNavigate, useParams, useRouteLoaderData } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import styles from "./DossierEnfant.module.scss";
import { throwRouteLoaderError } from "../../../helpers/routeError";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import { DossierEnfantDto, EnfantDto, ReferenceAlimentaireDto, SejourDTO } from "../../../types/api";
import DossierEnfantForm from "../../../components/Forms/DossierEnfantForm";
import { accountService } from "../../../services/account.service";
import { peutModifierDossierEnfant } from "../../../helpers/peutModifierDossierEnfant";

export async function dossierEnfantLoader({ params }: LoaderFunctionArgs) {
    const sejourId = params.id;
    const enfantId = params.enfantId;
    if (!sejourId || !enfantId) {
        throw json(
            { kind: "not-found", message: "La ressource demandée est introuvable." },
            { status: 404 }
        );
    }
    try {
        const [dossierRaw, enfants] = await Promise.all([
            sejourEnfantService.getDossierEnfant(parseInt(sejourId), parseInt(enfantId)),
            sejourEnfantService.getEnfantsDuSejour(parseInt(sejourId))
        ]);
        const dossier: DossierEnfantDto = {
            ...dossierRaw,
            allergenes: dossierRaw.allergenes ?? [],
            regimesEtPreferences: dossierRaw.regimesEtPreferences ?? [],
        };
        const enfant = enfants.find((e: EnfantDto) => e.id === parseInt(enfantId));
        return { dossier, enfant };
    } catch (error) {
        throwRouteLoaderError(error);
    }
}

const formatValue = (value: string | null): string => {
    return value?.trim() || "—";
};

const formatReferencesLine = (refs: ReferenceAlimentaireDto[] | undefined): string => {
    const list = refs ?? [];
    if (!list.length) return "—";
    return [...list]
        .sort((a, b) => a.ordre - b.ordre || a.id - b.id)
        .map((r) => r.libelle)
        .join(", ");
};

interface DossierLocationState {
    from?: 'groupes' | 'enfants' | 'sanitaire';
    openAccordion?: string;
    expandedGroupeId?: number;
}

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
};

type SectionType = 'contacts' | 'medical' | 'traitements' | 'autres';

const getSectionTitle = (section: SectionType | null): string => {
    switch (section) {
        case 'contacts':
            return 'Contacts parents';
        case 'medical':
            return 'Informations médicales';
        case 'traitements':
            return 'Traitements';
        case 'autres':
            return 'Autres informations';
        default:
            return 'Modifier le dossier';
    }
};

const DossierEnfant: React.FC = () => {
    const loaderData = useLoaderData() as { dossier: DossierEnfantDto; enfant: EnfantDto | undefined };
    const sejourDetailLoader = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | undefined;
    const navigate = useNavigate();
    const location = useLocation();
    const { id: sejourId, enfantId } = useParams();
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSection, setEditingSection] = useState<SectionType | null>(null);
    const returnState = location.state as DossierLocationState | null;

    const peutModifierDossier = useMemo(() => {
        if (!sejourDetailLoader) return false;
        const sub = accountService.getTokenInfo()?.payload?.sub;
        return peutModifierDossierEnfant(
            typeof sub === "string" ? sub : undefined,
            sejourDetailLoader.sejour.directeur,
            sejourDetailLoader.sejour.equipe
        );
    }, [sejourDetailLoader]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleRetour = () => {
        if (!sejourId) {
            navigate(-1);
            return;
        }
        if (returnState?.from === "sanitaire") {
            navigate(`/mes-sejours/${sejourId}/sanitaire`, { replace: true });
            return;
        }
        if (returnState?.openAccordion) {
            navigate(`/mes-sejours/${sejourId}`, {
                state: {
                    openAccordion: returnState.openAccordion,
                    expandedGroupeId: returnState.expandedGroupeId,
                },
                replace: true,
            });
        } else {
            navigate(`/mes-sejours/${sejourId}`, { replace: true });
        }
    };

    const { dossier, enfant } = loaderData;
    const enfantNom = enfant ? `${enfant.prenom} ${enfant.nom}` : `Enfant #${dossier.enfantId}`;

    const handleOpenEditModal = (section: SectionType) => {
        setEditingSection(section);
        setShowEditModal(true);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setEditingSection(null);
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <button onClick={handleRetour} className={styles.backButton}>
                    ← Retour
                </button>
                <h1 className={styles.pageTitle}>
                    Dossier de <span className={styles.enfantNameBadge}>{enfantNom}</span>
                </h1>
            </div>

            <div className={styles.dossierContent}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Contacts parents</h2>
                        {peutModifierDossier && sejourId && enfantId && (
                            <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleOpenEditModal('contacts')}
                                className={styles.sectionEditButton}
                            >
                                <FontAwesomeIcon icon={faPencilAlt} />
                            </Button>
                        )}
                    </div>
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
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Informations médicales</h2>
                        {peutModifierDossier && sejourId && enfantId && (
                            <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleOpenEditModal('medical')}
                                className={styles.sectionEditButton}
                            >
                                <FontAwesomeIcon icon={faPencilAlt} />
                            </Button>
                        )}
                    </div>
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
                            <span className={styles.label}>Allergènes</span>
                            <span className={styles.value}>{formatReferencesLine(dossier.allergenes)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Régimes et préférences alimentaires</span>
                            <span className={styles.value}>{formatReferencesLine(dossier.regimesEtPreferences)}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Informations alimentaires (complément)</span>
                            <span className={styles.value}>{formatValue(dossier.informationsAlimentaires)}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Traitements</h2>
                        {peutModifierDossier && sejourId && enfantId && (
                            <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleOpenEditModal('traitements')}
                                className={styles.sectionEditButton}
                            >
                                <FontAwesomeIcon icon={faPencilAlt} />
                            </Button>
                        )}
                    </div>
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
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Autres informations</h2>
                        {peutModifierDossier && sejourId && enfantId && (
                            <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleOpenEditModal('autres')}
                                className={styles.sectionEditButton}
                            >
                                <FontAwesomeIcon icon={faPencilAlt} />
                            </Button>
                        )}
                    </div>
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

            <Modal isOpen={peutModifierDossier && showEditModal} toggle={handleCloseEditModal} size="lg">
                <ModalHeader toggle={handleCloseEditModal}>
                    {getSectionTitle(editingSection)}
                </ModalHeader>
                <ModalBody>
                    {peutModifierDossier && showEditModal && sejourId && enfantId && editingSection && (
                        <DossierEnfantForm
                            handleCloseModal={handleCloseEditModal}
                            sejourId={parseInt(sejourId)}
                            enfantId={parseInt(enfantId)}
                            data={dossier}
                            section={editingSection}
                        />
                    )}
                </ModalBody>
            </Modal>
        </div>
    );
};

export default DossierEnfant;
