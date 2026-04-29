import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useRouteLoaderData, useNavigate, useRevalidator } from "react-router-dom";
import styles from "./DetailsSejour.module.scss";
import ListeLieux from "../../../components/Liste/ListeLieux";
import ListeMoments from "../../../components/Liste/ListeMoments";
import ListeTypesActivite from "../../../components/Liste/ListeTypesActivite";
import ListeHoraires from "../../../components/Liste/ListeHoraires";
import {
    SejourDTO,
    EnfantDto,
    GroupeDto,
    ActiviteDto,
    LieuDto,
    MomentDto,
    TypeActiviteDto,
    HoraireDto,
    PlanningGrilleSummaryDto,
} from "../../../types/api";
import { trierMomentsChronologiquement } from "../../../helpers/trierMomentsChronologiquement";
import { trierHorairesChronologiquement } from "../../../helpers/trierHorairesChronologiquement";
import DetailsSejourAccordionItem from "../../../components/DetailsSejour/DetailsSejourAccordionItem";

/** Ordre des blocs sur la page Paramétrage (1 Lieux … 4 Types). */
const PARAM_ACCORDION_IDS = ["1", "2", "3", "4"] as const;
const PARAM_ACCORDION_ID_LIST = [...PARAM_ACCORDION_IDS];
const PARAM_ACCORDION_ID_SET = new Set<string>(PARAM_ACCORDION_ID_LIST);

function parametrageAccordionOrderStorageKey(sejourId: number) {
    return `enjoy.detailsSejour.parametrageAccordionOrder.${sejourId}`;
}

function normalizeParametrageAccordionOrder(stored: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const id of stored) {
        if (PARAM_ACCORDION_ID_SET.has(id) && !seen.has(id)) {
            seen.add(id);
            result.push(id);
        }
    }
    for (const id of PARAM_ACCORDION_IDS) {
        if (!seen.has(id)) result.push(id);
    }
    return result;
}

function readParametrageAccordionOrder(sejourId: number): string[] {
    try {
        const raw = localStorage.getItem(parametrageAccordionOrderStorageKey(sejourId));
        if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed)) return normalizeParametrageAccordionOrder(parsed as string[]);
        }
        return [...PARAM_ACCORDION_IDS];
    } catch {
        return [...PARAM_ACCORDION_IDS];
    }
}

function reorderParametrageAccordionIds(order: string[], draggedId: string, targetId: string): string[] {
    if (draggedId === targetId) return order;
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return order;
    const next = order.filter((x) => x !== draggedId);
    const idx = next.indexOf(targetId);
    if (idx === -1) return order;
    const insertAt = from < to ? idx + 1 : idx;
    next.splice(insertAt, 0, draggedId);
    return next;
}

type SejourDetailLoaderSuccess = {
    sejour: SejourDTO;
    enfants: EnfantDto[];
    groupes: GroupeDto[];
    lieux: LieuDto[];
    moments: MomentDto[];
    horaires: HoraireDto[];
    activites: ActiviteDto[];
    typesActivite: TypeActiviteDto[];
    planningGrilles: PlanningGrilleSummaryDto[];
};

const DetailsSejourParametrage: React.FC = () => {
    const loaderData = useRouteLoaderData("sejour-detail") as SejourDetailLoaderSuccess | Error | undefined;
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const refreshLoaderData = useCallback(() => {
        void revalidator.revalidate();
    }, [revalidator]);

    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    const accordionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const lastOpenedAccordion = useRef<string | null>(null);
    const sejourIdForStorage =
        loaderData && !(loaderData instanceof Error) ? loaderData.sejour.id : undefined;
    const [accordionOrder, setAccordionOrder] = useState<string[]>(() => [...PARAM_ACCORDION_IDS]);
    const [draggingAccordionId, setDraggingAccordionId] = useState<string | null>(null);
    const [dropTargetAccordionId, setDropTargetAccordionId] = useState<string | null>(null);

    useEffect(() => {
        if (sejourIdForStorage === undefined) return;
        setAccordionOrder(readParametrageAccordionOrder(sejourIdForStorage));
    }, [sejourIdForStorage]);

    const handleAccordionReorder = useCallback(
        (draggedId: string, targetId: string) => {
            if (sejourIdForStorage === undefined || draggedId === targetId) return;
            if (!PARAM_ACCORDION_ID_SET.has(draggedId) || !PARAM_ACCORDION_ID_SET.has(targetId)) return;
            setAccordionOrder((prev) => {
                const next = reorderParametrageAccordionIds(prev, draggedId, targetId);
                localStorage.setItem(parametrageAccordionOrderStorageKey(sejourIdForStorage), JSON.stringify(next));
                return next;
            });
        },
        [sejourIdForStorage]
    );

    const [moments, setMoments] = useState<MomentDto[]>([]);
    const [horaires, setHoraires] = useState<HoraireDto[]>([]);
    const [, setActivites] = useState<ActiviteDto[]>([]);
    const [typesActivite, setTypesActivite] = useState<TypeActiviteDto[]>([]);

    useEffect(() => {
        if (!loaderData || loaderData instanceof Error) return;
        const { moments: m, horaires: h, activites: a, typesActivite: t } = loaderData;
        setMoments(m);
        setHoraires(trierHorairesChronologiquement(h));
        setActivites(a);
        setTypesActivite(t);
    }, [loaderData]);

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
        lieux,
    } = loaderData;

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

    if (!sejour) {
        return (
            <div className={styles.pageContainer}>
                <button type="button" onClick={() => navigate("/directeur/sejours")} className={styles.backButton}>
                    ← Retour à la liste
                </button>
                <p className={styles.error}>Séjour introuvable</p>
            </div>
        );
    }

    const accordionPanelTitle = (panelId: string): string => {
        switch (panelId) {
            case "1":
                return `Lieux (${lieux?.length ?? 0})`;
            case "2":
                return `Moments (${moments.length})`;
            case "3":
                return `Horaires (${horaires.length})`;
            case "4":
                return `Types d'activité (${typesActivite.length})`;
            default:
                return "";
        }
    };

    const accordionPanelBody = (panelId: string): ReactNode => {
        switch (panelId) {
            case "1":
                return <ListeLieux lieux={lieux ?? []} sejourId={sejour.id} />;
            case "2":
                return (
                    <ListeMoments
                        moments={moments}
                        sejourId={sejour.id}
                        onMomentsReordered={(ordered) => {
                            setMoments(ordered);
                            synchroniserMomentsDansActivites(ordered);
                            refreshLoaderData();
                        }}
                        onMomentCreated={(m) => {
                            setMoments((prev) => trierMomentsChronologiquement([...prev, m]));
                            refreshLoaderData();
                        }}
                        onMomentUpdated={(m) => {
                            setMoments((prev) =>
                                trierMomentsChronologiquement(prev.map((x) => (x.id === m.id ? m : x)))
                            );
                            setActivites((prev) =>
                                prev.map((a) => (a.moment.id === m.id ? { ...a, moment: m } : a))
                            );
                            refreshLoaderData();
                        }}
                        onMomentDeleted={(id) => {
                            setMoments((prev) => prev.filter((x) => x.id !== id));
                            refreshLoaderData();
                        }}
                    />
                );
            case "3":
                return (
                    <ListeHoraires
                        horaires={horaires}
                        sejourId={sejour.id}
                        onHoraireCreated={(h) => {
                            setHoraires((prev) => trierHorairesChronologiquement([...prev, h]));
                            refreshLoaderData();
                        }}
                        onHoraireUpdated={(h) => {
                            setHoraires((prev) =>
                                trierHorairesChronologiquement(prev.map((x) => (x.id === h.id ? h : x)))
                            );
                            refreshLoaderData();
                        }}
                        onHoraireDeleted={(id) => {
                            setHoraires((prev) => prev.filter((x) => x.id !== id));
                            refreshLoaderData();
                        }}
                    />
                );
            case "4":
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
            <h1 className={styles.overviewSectionTitle}>Paramétrage</h1>
            <div className={styles.accordion}>
                {accordionOrder.map((panelId) => (
                    <DetailsSejourAccordionItem
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
                    </DetailsSejourAccordionItem>
                ))}
            </div>
        </div>
    );
};

export default DetailsSejourParametrage;
