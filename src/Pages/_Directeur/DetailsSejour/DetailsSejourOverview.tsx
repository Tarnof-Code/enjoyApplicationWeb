import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from "react";
import { useRouteLoaderData, useNavigate, useLocation } from "react-router-dom";
import { FaGripVertical } from "react-icons/fa";
import styles from "./DetailsSejour.module.scss";
import formaterDate from "../../../helpers/formaterDate";
import calculerDureeEnJours from "../../../helpers/calculerDureeEnJours";
import Equipe from "../../../components/Liste/Equipe";
import ListeEnfants from "../../../components/Liste/ListeEnfants";
import ListeGroupes from "../../../components/Liste/ListeGroupes";
import ListeLieux from "../../../components/Liste/ListeLieux";
import ListeMoments from "../../../components/Liste/ListeMoments";
import ListeTypesActivite from "../../../components/Liste/ListeTypesActivite";
import { SejourDTO, EnfantDto, GroupeDto, ActiviteDto, LieuDto, MomentDto, TypeActiviteDto } from "../../../types/api";
import { trierMomentsChronologiquement } from "../../../helpers/trierMomentsChronologiquement";

/** Accordéons sur la vue générale (hors activités — onglet dédié). */
const OVERVIEW_ACCORDION_IDS = ["1", "2", "3", "4", "5", "6", "8"] as const;
const OVERVIEW_ACCORDION_ID_LIST = [...OVERVIEW_ACCORDION_IDS];
const OVERVIEW_ACCORDION_ID_SET = new Set<string>(OVERVIEW_ACCORDION_ID_LIST);

const LEGACY_FULL_STORAGE_PREFIX = "enjoy.detailsSejour.accordionOrder.";

function overviewAccordionOrderStorageKey(sejourId: number) {
    return `enjoy.detailsSejour.overviewAccordionOrder.${sejourId}`;
}

function readOverviewAccordionOrder(sejourId: number): string[] {
    try {
        const raw = localStorage.getItem(overviewAccordionOrderStorageKey(sejourId));
        if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed)) return normalizeOverviewAccordionOrder(parsed as string[]);
        }
        const legacyRaw = localStorage.getItem(`${LEGACY_FULL_STORAGE_PREFIX}${sejourId}`);
        if (legacyRaw) {
            const parsed = JSON.parse(legacyRaw) as unknown;
            if (Array.isArray(parsed)) {
                return normalizeOverviewAccordionOrder(
                    (parsed as string[]).filter((id) => id !== "7")
                );
            }
        }
        return [...OVERVIEW_ACCORDION_IDS];
    } catch {
        return [...OVERVIEW_ACCORDION_IDS];
    }
}

function normalizeOverviewAccordionOrder(stored: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const id of stored) {
        if (OVERVIEW_ACCORDION_ID_SET.has(id) && !seen.has(id)) {
            seen.add(id);
            result.push(id);
        }
    }
    for (const id of OVERVIEW_ACCORDION_IDS) {
        if (!seen.has(id)) result.push(id);
    }
    return result;
}

function reorderOverviewAccordionIds(order: string[], draggedId: string, targetId: string): string[] {
    if (draggedId === targetId) return order;
    const next = order.filter((x) => x !== draggedId);
    const idx = next.indexOf(targetId);
    if (idx === -1) return order;
    next.splice(idx, 0, draggedId);
    return next;
}

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

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    enfants: EnfantDto[];
    groupes: GroupeDto[];
    lieux: LieuDto[];
    moments: MomentDto[];
    activites: ActiviteDto[];
    typesActivite: TypeActiviteDto[];
};

const DetailsSejourOverview: React.FC = () => {
    /** Route index sans loader : données sur la route parent `sejour-detail`. */
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | Error | undefined;
    const location = useLocation();
    const [openAccordions, setOpenAccordions] = useState<string[]>(() => {
        const state = location.state as { openAccordion?: string; expandedGroupeId?: number } | null;
        return state?.openAccordion ? [state.openAccordion] : ["1"];
    });
    const expandedGroupeIdFromState = (location.state as { expandedGroupeId?: number } | null)?.expandedGroupeId;
    const navigate = useNavigate();
    const accordionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const lastOpenedAccordion = useRef<string | null>(null);
    const hasScrolledFromReturn = useRef(false);
    const scrollToGroupeRef = useRef<((groupeId: number) => void) | null>(null);
    const sejourIdForStorage =
        loaderData && !(loaderData instanceof Error) ? loaderData.sejour.id : undefined;
    const [accordionOrder, setAccordionOrder] = useState<string[]>(() => [...OVERVIEW_ACCORDION_IDS]);
    const [draggingAccordionId, setDraggingAccordionId] = useState<string | null>(null);
    const [dropTargetAccordionId, setDropTargetAccordionId] = useState<string | null>(null);

    useEffect(() => {
        if (sejourIdForStorage === undefined) return;
        setAccordionOrder(readOverviewAccordionOrder(sejourIdForStorage));
    }, [sejourIdForStorage]);

    const handleAccordionReorder = useCallback(
        (draggedId: string, targetId: string) => {
            if (sejourIdForStorage === undefined || draggedId === targetId) return;
            if (!OVERVIEW_ACCORDION_ID_SET.has(draggedId) || !OVERVIEW_ACCORDION_ID_SET.has(targetId)) return;
            setAccordionOrder((prev) => {
                const next = reorderOverviewAccordionIds(prev, draggedId, targetId);
                localStorage.setItem(overviewAccordionOrderStorageKey(sejourIdForStorage), JSON.stringify(next));
                return next;
            });
        },
        [sejourIdForStorage]
    );

    if (loaderData === undefined) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Chargement du séjour…</p>
            </div>
        );
    }

    if (loaderData instanceof Error) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
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
        typesActivite: typesActiviteFromLoader,
    } = loaderData;
    const [moments, setMoments] = useState<MomentDto[]>(momentsFromLoader);
    const [, setActivites] = useState<ActiviteDto[]>(activitesFromLoader);
    const [typesActivite, setTypesActivite] = useState<TypeActiviteDto[]>(typesActiviteFromLoader);
    useEffect(() => {
        setMoments(momentsFromLoader);
        setActivites(activitesFromLoader);
        setTypesActivite(typesActiviteFromLoader);
    }, [momentsFromLoader, activitesFromLoader, typesActiviteFromLoader, sejour.id]);

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
        setOpenAccordions((prev) => {
            const isOpening = !prev.includes(id);
            if (isOpening) lastOpenedAccordion.current = id;
            return isOpening ? [id] : prev.filter((item) => item !== id);
        });
    };
    useEffect(() => {
        const id = lastOpenedAccordion.current;
        if (!id) return;
        const el = accordionRefs.current[id];
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }
        lastOpenedAccordion.current = null;
    }, [openAccordions]);

    useEffect(() => {
        if (!openAccordions.includes("4")) {
            const state = location.state as { openAccordion?: string; expandedGroupeId?: number } | null;
            if (state?.expandedGroupeId) {
                const { expandedGroupeId: _, ...rest } = state;
                navigate(location.pathname, { state: rest, replace: true });
            }
        }
    }, [openAccordions, location.pathname, location.state, navigate]);

    useLayoutEffect(() => {
        const state = location.state as { openAccordion?: string; expandedGroupeId?: number } | null;
        const accordionId = state?.openAccordion;
        const expandedGroupeId = state?.expandedGroupeId;
        if (!accordionId || !openAccordions.includes(accordionId) || hasScrolledFromReturn.current) return;

        hasScrolledFromReturn.current = true;

        const headerOffset = 80;

        const scrollToGroupe = (el: HTMLElement) => {
            const elementTop = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementTop - headerOffset, behavior: "smooth" });
        };

        const scrollToAccordion = () => {
            const el =
                accordionRefs.current[accordionId] ??
                (document.querySelector(`[data-accordion-id="${accordionId}"]`) as HTMLElement | null);
            if (el) {
                const elementTop = el.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: elementTop - headerOffset, behavior: "smooth" });
            }
        };

        if (expandedGroupeId) {
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
                else scrollToAccordion();
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

    if (!sejour) {
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
            case "8":
                return `Types d'activité (${typesActivite.length})`;
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
                return <ListeEnfants enfants={enfants || []} groupes={groupes || []} sejourId={sejour.id} />;
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
                        onMomentCreated={(m) => setMoments((prev) => trierMomentsChronologiquement([...prev, m]))}
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
            case "8":
                return (
                    <ListeTypesActivite
                        typesActivite={typesActivite}
                        sejourId={sejour.id}
                        onTypeCreated={(t) => {
                            setTypesActivite((prev) =>
                                [...prev, t].sort((a, b) =>
                                    a.libelle.localeCompare(b.libelle, undefined, { sensitivity: "base" })
                                )
                            );
                        }}
                        onTypeUpdated={(t) => {
                            setTypesActivite((prev) =>
                                prev
                                    .map((x) => (x.id === t.id ? t : x))
                                    .sort((a, b) =>
                                        a.libelle.localeCompare(b.libelle, undefined, { sensitivity: "base" })
                                    )
                            );
                            setActivites((prev) =>
                                prev.map((a) => (a.typeActivite.id === t.id ? { ...a, typeActivite: t } : a))
                            );
                        }}
                        onTypeDeleted={(id) => {
                            setTypesActivite((prev) => prev.filter((x) => x.id !== id));
                        }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <button type="button" onClick={handleRetour} className={styles.backButton}>
                    ← Retour vers tous mes séjours
                </button>
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

export default DetailsSejourOverview;
