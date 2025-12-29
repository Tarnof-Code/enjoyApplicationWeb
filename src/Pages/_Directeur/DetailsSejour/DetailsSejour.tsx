import { useState } from "react";
import { LoaderFunctionArgs, useLoaderData, useNavigate } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import formaterDate from "../../../helpers/formaterDate";
import calculerDureeEnJours from "../../../helpers/calculerDureeEnJours";
import { sejourService } from "../../../services/sejour.service";
import Equipe from "../../../components/Liste/Equipe";
import { SejourDTO } from "../../../types/api";

export async function detailsSejourLoader({params}: LoaderFunctionArgs) {
    if (!params.id) throw new Error("ID du séjour manquant");
    try {
        const response = await sejourService.getSejourById(params.id);
        return response;
    } catch (error) {
        console.error("Erreur chargement séjour", error);
        return error;
    }
}

const DetailsSejour: React.FC = () => {
    const sejour = useLoaderData() as SejourDTO;
    const [openAccordions, setOpenAccordions] = useState<string[]>(['1']);
    const navigate = useNavigate();
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
    const handleRetour = () => {
        navigate("/directeur/sejours");
    };
    if(!sejour) {
        return (
            <div className={styles.pageContainer}>              
                <button onClick={handleRetour} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Séjour introuvable</p>
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
                <AccordionItem id="2" title="Équipe">
                    <Equipe 
                        membres={sejour.equipe || []} 
                        sejourId={sejour.id}
                    />
                </AccordionItem>
                <AccordionItem id="3" title="Liste des enfants">
                    <p className={styles.placeholderText}>À venir...</p>
                </AccordionItem>
                <AccordionItem id="4" title="Plannings">
                    <p className={styles.placeholderText}>À venir...</p>
                </AccordionItem>
            </div>
        </div>
    );
};

export default DetailsSejour;
