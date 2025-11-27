import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import formaterDate from "../../../helpers/formaterDate";
import calculerDureeEnJours from "../../../helpers/calculerDureeEnJours";
import { sejourService } from "../../../services/sejour.service";

interface Sejour {
    id: number;
    nom: string;
    description: string;
    lieuDuSejour: string;
    dateDebut: string;
    dateFin: string;
}

const DetailsSejour: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const sejourFromState = location.state?.sejour as Sejour | undefined;
    
    const [sejour, setSejour] = useState<Sejour | null>(sejourFromState || null);
    const [loading, setLoading] = useState(!sejourFromState);
    const [error, setError] = useState<string | null>(null);
    const [openAccordions, setOpenAccordions] = useState<string[]>(['1']);

    const toggleAccordion = (id: string) => {
        setOpenAccordions(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id) 
                : [...prev, id]
        );
    };

    const AccordionItem = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => {
        const isOpen = openAccordions.includes(id);
        return (
            <div className={styles.accordionItem}>
                <button 
                    className={`${styles.accordionHeader} ${isOpen ? styles.active : ''}`}
                    onClick={() => toggleAccordion(id)}
                >
                    {title}
                </button>
                {isOpen && (
                    <div className={styles.accordionBody}>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        if (sejourFromState) {
            return;
        }
        const fetchSejour = async () => {
            try {
                if (!id) {
                    setError("ID du séjour manquant");
                    setLoading(false);
                    return;
                }
                
                const sejours = await sejourService.getAllSejoursByDirecteur();
                const sejourTrouve = sejours.find((s: Sejour) => s.id === parseInt(id));
                
                if (sejourTrouve) {
                    setSejour(sejourTrouve);
                } else {
                    setError("Séjour non trouvé");
                }
                setLoading(false);
            } catch (err) {
                console.error("Erreur lors du chargement du séjour:", err);
                setError("Erreur lors du chargement du séjour");
                setLoading(false);
            }
        };

        fetchSejour();
    }, [id, sejourFromState]);

    const handleRetour = () => {
        navigate("/directeur/sejours");
    };

    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <p>Chargement...</p>
            </div>
        );
    }

    if (error || !sejour) {
        return (
            <div className={styles.pageContainer}>
                <p className={styles.error}>{error || "Séjour non trouvé"}</p>
                <button onClick={handleRetour} className={styles.backButton}>
                    ← Retour à la liste
                </button>
            </div>
        );
    }

    const duree = calculerDureeEnJours(sejour.dateDebut, sejour.dateFin);

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <button onClick={handleRetour} className={styles.backButton}>
                    ← Retour
                </button>
                <h1 className={styles.pageTitle}>
                    Nom du séjour : <span className={styles.sejourNameBadge}>{sejour.nom}</span>
                </h1>
            </div>

            <div className={styles.accordion}>
                {/* Informations générales */}
                <AccordionItem id="1" title="Informations générales">
                    <div className={styles.singleRow}>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Description</span>
                            <span className={styles.value}>{sejour.description}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Lieu</span>
                            <span className={styles.value}>{sejour.lieuDuSejour}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Date de début</span>
                            <span className={styles.value}>{formaterDate(new Date(sejour.dateDebut))}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Date de fin</span>
                            <span className={styles.value}>{formaterDate(new Date(sejour.dateFin))}</span>
                        </div>
                        <div className={styles.infoGroup}>
                            <span className={styles.label}>Durée</span>
                            <span className={styles.value}>{duree} jour{duree > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </AccordionItem>
          
                {/* Equipe */}
                <AccordionItem id="2" title="Équipe">
                    <p className={styles.placeholderText}>À venir...</p>
                </AccordionItem>

                {/* Liste enfants */}
                <AccordionItem id="3" title="Liste des enfants">
                    <p className={styles.placeholderText}>À venir...</p>
                </AccordionItem>

                {/* Plannings */}
                <AccordionItem id="4" title="Plannings">
                    <p className={styles.placeholderText}>À venir...</p>
                </AccordionItem>
            </div>
        </div>
    );
};

export default DetailsSejour;

