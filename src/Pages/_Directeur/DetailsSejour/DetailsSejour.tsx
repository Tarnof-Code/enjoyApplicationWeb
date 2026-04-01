import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import { LoaderFunctionArgs, useLoaderData, useNavigate, useLocation } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import formaterDate from "../../../helpers/formaterDate";
import calculerDureeEnJours from "../../../helpers/calculerDureeEnJours";
import { sejourService } from "../../../services/sejour.service";
import { sejourEnfantService } from "../../../services/sejour-enfant.service";
import { sejourGroupeService } from "../../../services/sejour-groupe.service";
import { sejourActiviteService } from "../../../services/sejour-activite.service";
import { sejourLieuService } from "../../../services/sejour-lieu.service";
import { sejourMomentService } from "../../../services/sejour-moment.service";
import Equipe from "../../../components/Liste/Equipe";
import ListeEnfants from "../../../components/Liste/ListeEnfants";
import ListeGroupes from "../../../components/Liste/ListeGroupes";
import ListeLieux from "../../../components/Liste/ListeLieux";
import ListeMoments from "../../../components/Liste/ListeMoments";
import ListeActivites from "../../../components/Liste/ListeActivites";
import { SejourDTO, EnfantDto, GroupeDto, ActiviteDto, LieuDto, MomentDto } from "../../../types/api";

/** Composant stable (hors du parent) : évite de remonter tout le contenu à chaque rendu du détail séjour. */
function SejourAccordionItem({
    id,
    title,
    isOpen,
    onToggle,
    containerRef,
    children,
}: {
    id: string;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    containerRef: (el: HTMLDivElement | null) => void;
    children: ReactNode;
}) {
    return (
        <div ref={containerRef} data-accordion-id={id} className={styles.accordionItem}>
            <button type="button" className={`${styles.accordionHeader} ${isOpen ? styles.active : ""}`} onClick={onToggle}>
                {title}
            </button>
            {isOpen && <div className={styles.accordionBody}>{children}</div>}
        </div>
    );
}

export async function detailsSejourLoader({params}: LoaderFunctionArgs) {
    if (!params.id) throw new Error("ID du séjour manquant");
    try {
        const [sejour, enfants, groupes, lieux, moments, activites] = await Promise.all([
            sejourService.getSejourById(params.id),
            sejourEnfantService.getEnfantsDuSejour(parseInt(params.id)),
            sejourGroupeService.getGroupesDuSejour(parseInt(params.id)),
            sejourLieuService.getLieuxDuSejour(parseInt(params.id)),
            sejourMomentService.getMomentsDuSejour(parseInt(params.id)),
            sejourActiviteService.getActivitesDuSejour(parseInt(params.id)),
        ]);
        return { sejour, enfants, groupes, lieux, moments, activites };
    } catch (error) {
        console.error("Erreur chargement séjour", error);
        return error;
    }
}

const DetailsSejour: React.FC = () => {
    const loaderData = useLoaderData() as
        | {
              sejour: SejourDTO;
              enfants: EnfantDto[];
              groupes: GroupeDto[];
              lieux: LieuDto[];
              moments: MomentDto[];
              activites: ActiviteDto[];
          }
        | Error;
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
    
    const { sejour, enfants, groupes, lieux, moments, activites } = loaderData;
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

    const membresEquipePourActivites = (() => {
        const seen = new Set<string>();
        const result: { tokenId: string; nom: string; prenom: string }[] = [];
        if (sejour.directeur && !seen.has(sejour.directeur.tokenId)) {
            seen.add(sejour.directeur.tokenId);
            result.push({
                tokenId: sejour.directeur.tokenId,
                nom: sejour.directeur.nom,
                prenom: sejour.directeur.prenom,
            });
        }
        for (const m of sejour.equipe || []) {
            if (!seen.has(m.tokenId)) {
                seen.add(m.tokenId);
                result.push({ tokenId: m.tokenId, nom: m.nom, prenom: m.prenom });
            }
        }
        return result.sort((a, b) => {
            const c = a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" });
            return c !== 0 ? c : a.prenom.localeCompare(b.prenom, undefined, { sensitivity: "base" });
        });
    })();

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
                <SejourAccordionItem
                    id="1"
                    title="Informations générales"
                    isOpen={openAccordions.includes("1")}
                    onToggle={() => toggleAccordion("1")}
                    containerRef={(el) => {
                        accordionRefs.current["1"] = el;
                    }}
                >
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
                </SejourAccordionItem>
                <SejourAccordionItem
                    id="2"
                    title="Équipe"
                    isOpen={openAccordions.includes("2")}
                    onToggle={() => toggleAccordion("2")}
                    containerRef={(el) => {
                        accordionRefs.current["2"] = el;
                    }}
                >
                    <Equipe 
                        membres={sejour.equipe || []} 
                        sejourId={sejour.id}
                    />
                </SejourAccordionItem>
                <SejourAccordionItem
                    id="3"
                    title={`Liste des enfants (${enfants?.length || 0})`}
                    isOpen={openAccordions.includes("3")}
                    onToggle={() => toggleAccordion("3")}
                    containerRef={(el) => {
                        accordionRefs.current["3"] = el;
                    }}
                >
                    <ListeEnfants 
                        enfants={enfants || []} 
                        groupes={groupes || []}
                        sejourId={sejour.id}
                    />
                </SejourAccordionItem>
                <SejourAccordionItem
                    id="4"
                    title={`Groupes (${groupes?.length || 0})`}
                    isOpen={openAccordions.includes("4")}
                    onToggle={() => toggleAccordion("4")}
                    containerRef={(el) => {
                        accordionRefs.current["4"] = el;
                    }}
                >
                    <ListeGroupes 
                        groupes={groupes || []} 
                        enfants={enfants || []} 
                        sejourId={sejour.id}
                        dateDebutSejour={sejour.dateDebut}
                        equipe={membresEquipePourActivites}
                        initialExpandedGroupeId={expandedGroupeIdFromState}
                        onGroupRendered={(groupeId) => {
                            requestAnimationFrame(() => scrollToGroupeRef.current?.(groupeId));
                        }}
                    />
                </SejourAccordionItem>
                <SejourAccordionItem
                    id="5"
                    title={`Lieux (${lieux?.length ?? 0})`}
                    isOpen={openAccordions.includes("5")}
                    onToggle={() => toggleAccordion("5")}
                    containerRef={(el) => {
                        accordionRefs.current["5"] = el;
                    }}
                >
                    <ListeLieux lieux={lieux ?? []} sejourId={sejour.id} />
                </SejourAccordionItem>
                <SejourAccordionItem
                    id="6"
                    title={`Moments (${moments?.length ?? 0})`}
                    isOpen={openAccordions.includes("6")}
                    onToggle={() => toggleAccordion("6")}
                    containerRef={(el) => {
                        accordionRefs.current["6"] = el;
                    }}
                >
                    <ListeMoments moments={moments ?? []} sejourId={sejour.id} />
                </SejourAccordionItem>
                <SejourAccordionItem
                    id="7"
                    title={`Activités (${activites?.length ?? 0})`}
                    isOpen={openAccordions.includes("7")}
                    onToggle={() => toggleAccordion("7")}
                    containerRef={(el) => {
                        accordionRefs.current["7"] = el;
                    }}
                >
                    <ListeActivites
                        activites={activites || []}
                        sejour={sejour}
                        groupes={groupes || []}
                        equipe={membresEquipePourActivites}
                        lieux={lieux ?? []}
                        moments={moments ?? []}
                    />
                </SejourAccordionItem>
            </div>
        </div>
    );
};

export default DetailsSejour;
