import { useEffect } from "react";
import { LoaderFunctionArgs, useLoaderData, useNavigate, useParams } from "react-router-dom";
import styles from "./DossierEnfant.module.scss";
import { sejourService } from "../../../services/sejour.service";
import { DossierEnfantDto, EnfantDto } from "../../../types/api";

export async function dossierEnfantLoader({ params }: LoaderFunctionArgs) {
    const { sejourId, enfantId } = params;
    if (!sejourId || !enfantId) throw new Error("Paramètres manquants");
    try {
        const [dossier, enfants] = await Promise.all([
            sejourService.getDossierEnfant(parseInt(sejourId), parseInt(enfantId)),
            sejourService.getEnfantsDuSejour(parseInt(sejourId))
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

const DossierEnfant: React.FC = () => {
    const loaderData = useLoaderData() as { dossier: DossierEnfantDto; enfant: EnfantDto | undefined } | Error;
    const navigate = useNavigate();
    const { sejourId } = useParams();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleRetour = () => {
        if (sejourId) {
            navigate(`/directeur/sejours/${sejourId}`, { state: { openAccordion: '3' } });
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
        </div>
    );
};

export default DossierEnfant;
