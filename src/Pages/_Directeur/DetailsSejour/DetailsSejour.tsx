import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from "react";
import { LoaderFunctionArgs, useLoaderData, useNavigate, useLocation } from "react-router-dom";
import { FaGripVertical } from "react-icons/fa";
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
import { trierMomentsChronologiquement } from "../../../helpers/trierMomentsChronologiquement";

const DEFAULT_ACCORDION_IDS = ["1", "2", "3", "4", "5", "6", "7"] as const;
const DEFAULT_ACCORDION_ID_LIST = [...DEFAULT_ACCORDION_IDS];
const ACCORDION_ID_SET = new Set<string>(DEFAULT_ACCORDION_ID_LIST);

function accordionOrderStorageKey(sejourId: number) {
    return `enjoy.detailsSejour.accordionOrder.${sejourId}`;
}

function readAccordionOrder(sejourId: number): string[] {
    try {
        const raw = localStorage.getItem(accordionOrderStorageKey(sejourId));
        if (!raw) return [...DEFAULT_ACCORDION_IDS];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [...DEFAULT_ACCORDION_IDS];
        return normalizeAccordionOrder(parsed as string[]);
    } catch {
        return [...DEFAULT_ACCORDION_IDS];
    }
}

function normalizeAccordionOrder(stored: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const id of stored) {
        if (ACCORDION_ID_SET.has(id) && !seen.has(id)) {
            seen.add(id);
            result.push(id);
        }
    }
    for (const id of DEFAULT_ACCORDION_IDS) {
        if (!seen.has(id)) result.push(id);
    }
    return result;
}

function reorderAccordionIds(order: string[], draggedId: string, targetId: string): string[] {
    if (draggedId === targetId) return order;
    const next = order.filter((x) => x !== draggedId);
    const idx = next.indexOf(targetId);
    if (idx === -1) return order;
    next.splice(idx, 0, draggedId);
    return next;
}

/** Composant stable (hors du parent) : évite de remonter tout le contenu à chaque rendu du détail séjour. */
function SejourAccordionItem({
    id,
    title,
    isOpen,
    onToggle,
    containerRef,
    children,
    isDragging,
    isDropTarget,
    onDragHandleStart,
    onDragHandleEnd,
    onItemDragOver,
    onReorderDrop,
}: {
    id: string;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    containerRef: (el: HTMLDivElement | null) => void;
    children: ReactNode;
    isDragging: boolean;
    isDropTarget: boolean;
    onDragHandleStart: () => void;
    onDragHandleEnd: () => void;
    onItemDragOver: () => void;
    onReorderDrop: (draggedId: string, targetId: string) => void;
}) {
    const itemClass = [
        styles.accordionItem,
        isDragging ? styles.accordionItemDragging : "",
        isDropTarget ? styles.accordionItemDropTarget : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            ref={containerRef}
            data-accordion-id={id}
            className={itemClass}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onItemDragOver();
            }}
            onDrop={(e) => {
                e.preventDefault();
                const dragged = e.dataTransfer.getData("text/plain");
                if (dragged) onReorderDrop(dragged, id);
            }}
        >
            <div className={styles.accordionHeaderRow}>
                <div
                    className={styles.dragHandle}
                    aria-label="Glisser pour réorganiser les blocs"
                    title="Réorganiser"
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "move";
                        onDragHandleStart();
                    }}
                    onDragEnd={onDragHandleEnd}
                >
                    <FaGripVertical aria-hidden size={18} />
                </div>
                <button type="button" className={`${styles.accordionHeader} ${isOpen ? styles.active : ""}`} onClick={onToggle}>
                    {title}
                </button>
            </div>
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
    const sejourIdForStorage = loaderData instanceof Error ? undefined : loaderData.sejour.id;
    const [accordionOrder, setAccordionOrder] = useState<string[]>(() => [...DEFAULT_ACCORDION_IDS]);
    const [draggingAccordionId, setDraggingAccordionId] = useState<string | null>(null);
    const [dropTargetAccordionId, setDropTargetAccordionId] = useState<string | null>(null);

    useEffect(() => {
        if (sejourIdForStorage === undefined) return;
        setAccordionOrder(readAccordionOrder(sejourIdForStorage));
    }, [sejourIdForStorage]);

    const handleAccordionReorder = useCallback(
        (draggedId: string, targetId: string) => {
            if (sejourIdForStorage === undefined || draggedId === targetId) return;
            if (!ACCORDION_ID_SET.has(draggedId) || !ACCORDION_ID_SET.has(targetId)) return;
            setAccordionOrder((prev) => {
                const next = reorderAccordionIds(prev, draggedId, targetId);
                localStorage.setItem(accordionOrderStorageKey(sejourIdForStorage), JSON.stringify(next));
                return next;
            });
        },
        [sejourIdForStorage]
    );

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
    
    const {
        sejour,
        enfants,
        groupes,
        lieux,
        moments: momentsFromLoader,
        activites: activitesFromLoader,
    } = loaderData;
    const [moments, setMoments] = useState<MomentDto[]>(momentsFromLoader);
    const [activites, setActivites] = useState<ActiviteDto[]>(activitesFromLoader);
    useEffect(() => {
        setMoments(momentsFromLoader);
        setActivites(activitesFromLoader);
    }, [momentsFromLoader, activitesFromLoader, sejour.id]);

    const synchroniserMomentsDansActivites = (listeMoments: MomentDto[]) => {
        const parId = new Map(listeMoments.map((mo) => [mo.id, mo]));
        setActivites((prev) =>
            prev.map((a) => {
                const mo = parId.get(a.moment.id);
                return mo ? { ...a, moment: mo } : a;
            })
        );
    };
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

    const accordionPanelTitle = (panelId: string): string => {
        switch (panelId) {
            case "1":
                return "Informations générales";
            case "2":
                return "Équipe";
            case "3":
                return `Liste des enfants (${enfants?.length || 0})`;
            case "4":
                return `Groupes (${groupes?.length || 0})`;
            case "5":
                return `Lieux (${lieux?.length ?? 0})`;
            case "6":
                return `Moments (${moments.length})`;
            case "7":
                return `Activités (${activites.length})`;
            default:
                return "";
        }
    };

    const accordionPanelBody = (panelId: string): ReactNode => {
        switch (panelId) {
            case "1":
                return (
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
                            <span className={styles.value}>
                                {duree} jour{duree > 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                );
            case "2":
                return <Equipe membres={sejour.equipe || []} sejourId={sejour.id} />;
            case "3":
                return (
                    <ListeEnfants
                        enfants={enfants || []}
                        groupes={groupes || []}
                        sejourId={sejour.id}
                    />
                );
            case "4":
                return (
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
                );
            case "5":
                return <ListeLieux lieux={lieux ?? []} sejourId={sejour.id} />;
            case "6":
                return (
                    <ListeMoments
                        moments={moments}
                        sejourId={sejour.id}
                        onMomentsReordered={(ordered) => {
                            setMoments(ordered);
                            synchroniserMomentsDansActivites(ordered);
                        }}
                        onMomentCreated={(m) =>
                            setMoments((prev) => trierMomentsChronologiquement([...prev, m]))
                        }
                        onMomentUpdated={(m) => {
                            setMoments((prev) =>
                                trierMomentsChronologiquement(prev.map((x) => (x.id === m.id ? m : x)))
                            );
                            setActivites((prev) =>
                                prev.map((a) => (a.moment.id === m.id ? { ...a, moment: m } : a))
                            );
                        }}
                        onMomentDeleted={(id) => setMoments((prev) => prev.filter((x) => x.id !== id))}
                    />
                );
            case "7":
                return (
                    <ListeActivites
                        activites={activites}
                        sejour={sejour}
                        groupes={groupes || []}
                        equipe={membresEquipePourActivites}
                        lieux={lieux ?? []}
                        moments={moments}
                    />
                );
            default:
                return null;
        }
    };

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
                {accordionOrder.map((panelId) => (
                    <SejourAccordionItem
                        key={panelId}
                        id={panelId}
                        title={accordionPanelTitle(panelId)}
                        isOpen={openAccordions.includes(panelId)}
                        onToggle={() => toggleAccordion(panelId)}
                        containerRef={(el) => {
                            accordionRefs.current[panelId] = el;
                        }}
                        isDragging={draggingAccordionId === panelId}
                        isDropTarget={
                            dropTargetAccordionId === panelId &&
                            draggingAccordionId !== null &&
                            draggingAccordionId !== panelId
                        }
                        onDragHandleStart={() => setDraggingAccordionId(panelId)}
                        onDragHandleEnd={() => {
                            setDraggingAccordionId(null);
                            setDropTargetAccordionId(null);
                        }}
                        onItemDragOver={() => setDropTargetAccordionId(panelId)}
                        onReorderDrop={handleAccordionReorder}
                    >
                        {accordionPanelBody(panelId)}
                    </SejourAccordionItem>
                ))}
            </div>
        </div>
    );
};

export default DetailsSejour;
