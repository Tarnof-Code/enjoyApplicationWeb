import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { LoaderFunctionArgs, useLoaderData, useNavigate, useLocation } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import formaterDate from "../../../helpers/formaterDate";
import calculerDureeEnJours from "../../../helpers/calculerDureeEnJours";
import { sejourService } from "../../../services/sejour.service";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import { sejourGroupeService } from "../../../services/sejour-groupe.service";
import Equipe from "../../../components/Liste/Equipe";
import ListeEnfants from "../../../components/Liste/ListeEnfants";
import ListeGroupes from "../../../components/Liste/ListeGroupes";
import { SejourDTO, EnfantDto, GroupeDto } from "../../../types/api";

export async function detailsSejourLoader({params}: LoaderFunctionArgs) {
    if (!params.id) throw new Error("ID du séjour manquant");
    try {
        const [sejour, enfants, groupes] = await Promise.all([
            sejourService.getSejourById(params.id),
            sejourEnfantService.getEnfantsDuSejour(parseInt(params.id)),
            sejourGroupeService.getGroupesDuSejour(parseInt(params.id)),
        ]);
        return { sejour, enfants, groupes };
    } catch (error) {
        console.error("Erreur chargement séjour", error);
        return error;
    }
}

const DetailsSejour: React.FC = () => {
    const loaderData = useLoaderData() as { sejour: SejourDTO; enfants: EnfantDto[]; groupes: GroupeDto[] } | Error;
    const location = useLocation();
    const [openAccordions, setOpenAccordions] = useState<string[]>(() => {
        const state = location.state as { openAccordion?: string; expandedGroupeId?: number } | null;
        return state?.openAccordion ? [state.openAccordion] : ['1'];
    });
    const expandedGroupeIdFromState = (location.state as { expandedGroupeId?: number } | null)?.expandedGroupeId;
    const navigate = useNavigate();
    const accordionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const lastOpenedAccordion = useRef<string | null>(null);
    const hasScrolledFromReturn = useRef(false);
    const scrollToGroupeRef = useRef<((groupeId: number) => void) | null>(null);
    
    // Gérer le cas où loaderData est une erreur
    if (loaderData instanceof Error) {
        return (
            <div className={styles.pageContainer}>              
                <button onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Erreur lors du chargement du séjour</p>
            </div>
        );
    }
    
    const { sejour, enfants, groupes } = loaderData;
    const toggleAccordion = (id: string) => {
        setOpenAccordions(prev => {
            const isOpening = !prev.includes(id);
            if (isOpening) lastOpenedAccordion.current = id;
            // Un seul accordéon ouvert à la fois
            return isOpening ? [id] : prev.filter(item => item !== id);
        });
    };
    useEffect(() => {
        const id = lastOpenedAccordion.current;
        if (!id) return;
        const el = accordionRefs.current[id];
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        lastOpenedAccordion.current = null;
    }, [openAccordions]);

    // Quand l'accordéon Groupes est fermé, réinitialiser le state pour que les groupes soient fermés à la réouverture
    useEffect(() => {
        if (!openAccordions.includes('4')) {
            const state = location.state as { openAccordion?: string; expandedGroupeId?: number } | null;
            if (state?.expandedGroupeId) {
                const { expandedGroupeId: _, ...rest } = state;
                navigate(location.pathname, { state: rest, replace: true });
            }
        }
    }, [openAccordions, location.pathname, location.state, navigate]);

    // Scroll vers l'accordéon ou le groupe au retour depuis le dossier enfant
    useLayoutEffect(() => {
        const state = location.state as { openAccordion?: string; expandedGroupeId?: number } | null;
        const accordionId = state?.openAccordion;
        const expandedGroupeId = state?.expandedGroupeId;
        if (!accordionId || !openAccordions.includes(accordionId) || hasScrolledFromReturn.current) return;

        hasScrolledFromReturn.current = true;

        const headerOffset = 80;

        const scrollToGroupe = (el: HTMLElement) => {
            const elementTop = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementTop - headerOffset, behavior: 'smooth' });
        };

        const scrollToAccordion = () => {
            const el = accordionRefs.current[accordionId] ?? document.querySelector(`[data-accordion-id="${accordionId}"]`) as HTMLElement | null;
            if (el) {
                const elementTop = el.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: elementTop - headerOffset, behavior: 'smooth' });
            }
        };

        if (expandedGroupeId) {
            // Priorité au groupe : ListeGroupes notifiera via onGroupRendered, sinon polling
            scrollToGroupeRef.current = (groupeId: number) => {
                const el = document.querySelector(`[data-groupe-id="${groupeId}"]`) as HTMLElement | null;
                if (el) scrollToGroupe(el);
            };
            let cancelled = false;
            let attempts = 0;
            const tryScrollToGroupe = () => {
                if (cancelled) return;
                const el = document.querySelector(`[data-groupe-id="${expandedGroupeId}"]`) as HTMLElement | null;
                if (el) {
                    scrollToGroupe(el);
                    return;
                }
                if (++attempts < 40) setTimeout(tryScrollToGroupe, 80);
                else scrollToAccordion(); // fallback si groupe introuvable
            };
            setTimeout(tryScrollToGroupe, 150);
            const timer2 = setTimeout(tryScrollToGroupe, 600);
            return () => {
                cancelled = true;
                scrollToGroupeRef.current = null;
                clearTimeout(timer2);
            };
        }

        scrollToAccordion();
        const timer = setTimeout(scrollToAccordion, 400);
        return () => clearTimeout(timer);
    }, [location.state, location.key, openAccordions]);
    const AccordionItem = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => {
        const isOpen = openAccordions.includes(id);
        return (
            <div ref={ref => { accordionRefs.current[id] = ref; }} data-accordion-id={id} className={styles.accordionItem}>
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
                <AccordionItem id="3" title={`Liste des enfants (${enfants?.length || 0})`}>
                    <ListeEnfants 
                        enfants={enfants || []} 
                        groupes={groupes || []}
                        sejourId={sejour.id}
                    />
                </AccordionItem>
                <AccordionItem id="4" title={`Groupes (${groupes?.length || 0})`}>
                    <ListeGroupes 
                        groupes={groupes || []} 
                        enfants={enfants || []} 
                        sejourId={sejour.id}
                        dateDebutSejour={sejour.dateDebut}
                        initialExpandedGroupeId={expandedGroupeIdFromState}
                        onGroupRendered={(groupeId) => {
                            requestAnimationFrame(() => scrollToGroupeRef.current?.(groupeId));
                        }}
                    />
                </AccordionItem>
                <AccordionItem id="5" title="Plannings">
                    <p className={styles.placeholderText}>À venir...</p>
                </AccordionItem>
            </div>
        </div>
    );
};

export default DetailsSejour;
