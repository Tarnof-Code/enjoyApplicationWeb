import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import {
    ActiviteDto,
    ActivitePrestataireDto,
    CreateActiviteRequest,
    EmplacementLieu,
    NonParticipationPrestataireDto,
    UpdateActiviteRequest,
} from "../../types/api";
import { EmplacementLieuLabels, EmplacementLieuValues } from "../../enums/EmplacementLieu";
import { sejourActiviteService } from "../../services/sejour-activite.service";
import { sejourActivitePrestataireService } from "../../services/sejour-activite-prestataire.service";
import { HistoriqueModificationListeModal, type HistoriqueModificationListeModalLigne } from "../common/HistoriqueModificationListeModal";
import {
    formatDateHeureHistorique,
    formatNomModificateurHistorique,
    libelleActionHistorique,
} from "../../helpers/libelleHistoriqueModification";
import { trierMomentsChronologiquement } from "../../helpers/trierMomentsChronologiquement";
import {
    aplatirMomentsHierarchiquement,
    libelleMomentIndenté,
} from "../../helpers/construireArbreMoments";
import { trierParPrenomPuisNom } from "../../helpers/trierUtilisateurs";
import { trierGroupesParNom } from "../../helpers/groupesParType";
import { SelectionGroupesParType } from "./SelectionGroupesParType";
import styles from "./ListeActivites.module.scss";
import { PlanningModalFooterFormulaire } from "../PlanningCalendrier/PlanningModalFooterFormulaire";
import {
    CalendrierFiltresPlanning,
    CalendrierNavigationPeriode,
    CalendrierPlanning,
} from "./ListeActivitesCalendrier";
import { ListeActivitesListeFiltres, ListeActivitesListeResultat } from "./ListeActivitesListe";
import {
    CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN,
    CALENDRIER_FILTRE_AUCUN_GROUPE_ID,
    type ChoixResolutionConflitPrestataire,
    type ListeActivitesProps,
    type MembreEquipeSejour,
} from "./listeActivitesTypes";
import {
    activiteInternePourTokenMomentDate,
    cleNonParticipation,
    cleRetraitSortieCalendrier,
    conflitsSansChoixResolution,
    construireCellulesPlanningParAnimateurEtDate,
    construireSortiesParAnimateurEtDate,
    datePrestataireVersYmd,
    estNonParticipation,
    fusionnerNonParticipationsApresChoix,
    libellePlageHorairePrestataire,
    listerConflitsActiviteInterneAvecSortie,
    sortieVersSaveRequest,
    type CalendrierCelluleItem,
    type ConflitActiviteAvecSortie,
} from "./listeActivitesPrestatairesCalendrier";
import type { MomentDto } from "../../types/api";
import {
    EMPLACEMENT_FILTRE_TOUS_ACTIVITE,
    FILTRE_LISTE_LIEU_SANS,
    activiteDateToFilterKey,
    activiteDateToInputDate,
    couleurFondCalendrierPourTypeActivite,
    equipeAvecTokenEnTete,
    groupeIdsReferentsPourToken,
    enumererJoursDuSejour,
    resumePartageLieu,
    sejourDebutToInputDate,
    tokensEquipePourFiltreGroupesCalendrier,
    trierLieuxParNom,
    trierTypesParLibelle,
} from "./listeActivitesUtils";
import { useCalendrierFenetreJours } from "./useCalendrierFenetreJours";
import {
    PRINT_GLOBAL_CLASS,
    PRINT_STYLE_PRESETS,
    PrintContentRoot,
    PrintDocumentHeader,
    PrintTrigger,
    buildPrintDocumentContext,
    usePrintContent,
} from "../../print";

export type { ListeActivitesProps, MembreEquipeSejour } from "./listeActivitesTypes";

type VueActivites = "liste" | "calendrier";
type ModeImpressionPlanningActivites = "noir-blanc" | "couleurs";

function normaliserPrestataireDto(p: ActivitePrestataireDto): ActivitePrestataireDto {
    return {
        ...p,
        groupeIds: p.groupeIds ?? [],
        moments: p.moments ?? [],
        nonParticipations: p.nonParticipations ?? [],
    };
}

function itemPasseFiltreGroupeCalendrierPrint(
    item: CalendrierCelluleItem,
    filtreCalendrierGroupeIds: Set<number>,
): boolean {
    if (filtreCalendrierGroupeIds.size === 0) return true;
    if (item.kind === "activite") {
        return (item.activite.groupeIds ?? []).some((id) => filtreCalendrierGroupeIds.has(id));
    }
    return (item.sortie.groupeIds ?? []).some((id) => filtreCalendrierGroupeIds.has(id));
}

function applyListeActivitesPinnedGeometry(
    root: HTMLDivElement,
    stack: HTMLDivElement,
    options: { mettreAJourHauteurBarre: boolean },
): void {
    const hdr = document.querySelector("header");
    const headerH = hdr?.getBoundingClientRect().height ?? 0;
    if (headerH > 0) {
        root.style.setProperty("--liste-act-site-header", `${Math.floor(headerH)}px`);
    }
    const rootRect = root.getBoundingClientRect();
    root.style.setProperty("--liste-act-pinned-left", `${Math.round(rootRect.left)}px`);
    root.style.setProperty("--liste-act-pinned-width", `${Math.round(rootRect.width)}px`);
    if (options.mettreAJourHauteurBarre) {
        const stackH = stack.getBoundingClientRect().height;
        root.style.setProperty("--liste-act-top-pinned-height", `${stackH}px`);
    }
}

/** Attend la fin du scroll-lock reactstrap avant de réactiver le sticky des en-têtes calendrier. */
function planifierReactivationEnTetesCalendrierSticky(apresLayout: () => void): () => void {
    let cancelled = false;
    const executer = () => {
        if (cancelled) return;
        requestAnimationFrame(() => {
            if (cancelled) return;
            requestAnimationFrame(() => {
                if (!cancelled) apresLayout();
            });
        });
    };

    if (document.body.classList.contains("modal-open")) {
        const mo = new MutationObserver(() => {
            if (!document.body.classList.contains("modal-open")) {
                mo.disconnect();
                executer();
            }
        });
        mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        return () => {
            cancelled = true;
            mo.disconnect();
        };
    }

    executer();
    return () => {
        cancelled = true;
    };
}

const ListeActivites: React.FC<ListeActivitesProps> = ({
    activites,
    activitesPrestataires = [],
    sejour,
    groupes,
    equipe,
    lieux,
    moments,
    typesActivite,
    peutGererActivitesComplet = true,
    tokenUtilisateurConnecte = null,
}) => {
    const revalidator = useRevalidator();
    const [prestataires, setPrestataires] = useState<ActivitePrestataireDto[]>(() =>
        activitesPrestataires.map(normaliserPrestataireDto),
    );
    const [conflitResolutionEnCours, setConflitResolutionEnCours] = useState<string | null>(null);
    const [retirerSortieModalOpen, setRetirerSortieModalOpen] = useState(false);
    const [pendingRetraitSortie, setPendingRetraitSortie] = useState<{
        sortie: ActivitePrestataireDto;
        moment: MomentDto;
        tokenId: string;
        animateurLabel: string;
    } | null>(null);
    const [retirerSortieCalendrierEnCours, setRetirerSortieCalendrierEnCours] = useState<string | null>(
        null,
    );
    const [conflitActiviteModalOpen, setConflitActiviteModalOpen] = useState(false);
    const [conflitsActiviteEnCours, setConflitsActiviteEnCours] = useState<ConflitActiviteAvecSortie[]>(
        [],
    );
    const [choixConflitsActivite, setChoixConflitsActivite] = useState<
        Map<string, ChoixResolutionConflitPrestataire>
    >(() => new Map());
    const [pendingActiviteSave, setPendingActiviteSave] = useState<{
        payload: CreateActiviteRequest | UpdateActiviteRequest;
        membreTokenIds: string[];
    } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteActiviteId, setPendingDeleteActiviteId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingActiviteId, setEditingActiviteId] = useState<number | null>(null);
    const [deletingActiviteId, setDeletingActiviteId] = useState<number | null>(null);
    const [formDate, setFormDate] = useState("");
    const [formNom, setFormNom] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [selectedGroupeIds, setSelectedGroupeIds] = useState<Set<number>>(() => new Set());
    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(() => new Set());
    /** Chaîne vide = aucun lieu ; en édition, null est envoyé à l'API pour retirer le lieu */
    const [formLieuId, setFormLieuId] = useState<number | "">("");
    /** Moment obligatoire dès qu'au moins un créneau existe pour le séjour */
    const [formMomentId, setFormMomentId] = useState<number | "">("");
    /** Obligatoire côté API pour toute activité */
    const [formTypeActiviteId, setFormTypeActiviteId] = useState<number | "">("");
    const [filtreEmplacementLieu, setFiltreEmplacementLieu] = useState<
        typeof EMPLACEMENT_FILTRE_TOUS_ACTIVITE | EmplacementLieu
    >(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);

    /** Filtres sur la liste (cumulables, ET logique) ; date = yyyy-MM-dd ou vide (toutes les dates) */
    const [filtreListeDate, setFiltreListeDate] = useState("");
    const [filtreListeLieu, setFiltreListeLieu] = useState("");
    const [filtreListeGroupe, setFiltreListeGroupe] = useState("");
    const [filtreListeAnimateur, setFiltreListeAnimateur] = useState("");
    const [filtreListeType, setFiltreListeType] = useState("");
    const [vueActivites, setVueActivites] = useState<VueActivites>("calendrier");
    const [printChoiceModalOpen, setPrintChoiceModalOpen] = useState(false);
    const [modeImpressionPlanning, setModeImpressionPlanning] =
        useState<ModeImpressionPlanningActivites>("noir-blanc");
    /** Filtres vue calendrier : ensemble vide = tout afficher (animateurs / groupes d’activité). */
    const [filtreCalendrierTokens, setFiltreCalendrierTokens] = useState<Set<string>>(() => new Set());
    const [filtreCalendrierGroupeIds, setFiltreCalendrierGroupeIds] = useState<Set<number>>(() => new Set());

    const [historiqueActiviteModalOpen, setHistoriqueActiviteModalOpen] = useState(false);
    const [historiqueActiviteNom, setHistoriqueActiviteNom] = useState("");
    const [historiqueActiviteChargement, setHistoriqueActiviteChargement] = useState(false);
    const [historiqueActiviteErreur, setHistoriqueActiviteErreur] = useState<string | null>(null);
    const [historiqueActiviteLignes, setHistoriqueActiviteLignes] = useState<
        HistoriqueModificationListeModalLigne[] | null
    >(null);

    useEffect(() => {
        setPrestataires(activitesPrestataires.map(normaliserPrestataireDto));
    }, [activitesPrestataires]);

    const momentsTriés = trierMomentsChronologiquement(moments);
    const momentsAplat = aplatirMomentsHierarchiquement(moments);
    const typesPredefinisSelect = useMemo(
        () => typesActivite.filter((t) => t.predefini).sort(trierTypesParLibelle),
        [typesActivite]
    );
    const typesPersoSelect = useMemo(
        () => typesActivite.filter((t) => !t.predefini).sort(trierTypesParLibelle),
        [typesActivite]
    );

    const tokenSelf = (tokenUtilisateurConnecte ?? "").trim();
    const estAnimateurRestreintActivites = !peutGererActivitesComplet && tokenSelf !== "";
    const tokenConnecteDansEquipe =
        estAnimateurRestreintActivites &&
        equipe.some((m) => (m.tokenId ?? "").trim() === tokenSelf);

    /** Nouvelle activité ; depuis le calendrier on peut préremplir le jour et l’animateur de la case. */
    const openModalNouvelleActivite = (opts?: { dateYmd?: string; animateurTokenId?: string }) => {
        setErrorMessage(null);
        setEditingActiviteId(null);
        setFormDate(opts?.dateYmd ?? sejourDebutToInputDate(sejour.dateDebut));
        setFormNom("");
        setFormDescription("");
        const initialGroupes = new Set<number>();
        if (
            opts?.animateurTokenId != null &&
            equipe.some((m) => m.tokenId === opts.animateurTokenId)
        ) {
            groupeIdsReferentsPourToken(groupes, opts.animateurTokenId).forEach((id) =>
                initialGroupes.add(id)
            );
        } else if (
            tokenSelf !== "" &&
            equipe.some((m) => (m.tokenId ?? "").trim() === tokenSelf)
        ) {
            groupeIdsReferentsPourToken(groupes, tokenSelf).forEach((id) => initialGroupes.add(id));
        }
        if (initialGroupes.size === 0 && groupes.length === 1) {
            initialGroupes.add(groupes[0].id);
        }
        setSelectedGroupeIds(initialGroupes);
        const initial = new Set<string>();
        if (
            opts?.animateurTokenId != null &&
            equipe.some((m) => m.tokenId === opts.animateurTokenId)
        ) {
            initial.add(opts.animateurTokenId);
        } else         if (equipe.length === 1) {
            initial.add(equipe[0].tokenId);
        }
        if (estAnimateurRestreintActivites && tokenSelf && tokenConnecteDansEquipe) {
            initial.add(tokenSelf);
        }
        setSelectedTokens(initial);
        setFormLieuId("");
        if (momentsTriés.length === 1) {
            setFormMomentId(momentsTriés[0].id);
        } else {
            setFormMomentId("");
        }
        const typesOrdonnes = [...typesPredefinisSelect, ...typesPersoSelect];
        if (typesOrdonnes.length === 1) {
            setFormTypeActiviteId(typesOrdonnes[0].id);
        } else {
            setFormTypeActiviteId("");
        }
        setFiltreEmplacementLieu(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);
        setModalOpen(true);
    };

    const openModal = () => openModalNouvelleActivite();

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const openEditModal = (activite: ActiviteDto) => {
        if (estAnimateurRestreintActivites && tokenSelf) {
            const dansActivite = activite.membres?.some(
                (m) => (m.tokenId ?? "").trim() === tokenSelf
            );
            if (!dansActivite) return;
        }
        setErrorMessage(null);
        setEditingActiviteId(activite.id);
        setFormDate(activiteDateToInputDate(activite.date));
        setFormNom(activite.nom);
        setFormDescription(activite.description ?? "");
        setSelectedGroupeIds(new Set(activite.groupeIds ?? []));
        const tokensEdit = new Set(
            (activite.membres ?? []).map((m) => m.tokenId).filter((id): id is string => Boolean(id?.trim()))
        );
        if (estAnimateurRestreintActivites && tokenSelf && tokenConnecteDansEquipe) {
            tokensEdit.add(tokenSelf);
        }
        setSelectedTokens(tokensEdit);
        setFormLieuId(activite.lieu?.id ?? "");
        setFormMomentId(activite.moment?.id ?? "");
        setFormTypeActiviteId(activite.typeActivite?.id ?? "");
        setFiltreEmplacementLieu(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);
        setModalOpen(true);
    };

    const fermerHistoriqueActiviteModal = useCallback(() => {
        setHistoriqueActiviteModalOpen(false);
        setHistoriqueActiviteNom("");
        setHistoriqueActiviteErreur(null);
        setHistoriqueActiviteLignes(null);
        setHistoriqueActiviteChargement(false);
    }, []);

    const ouvrirHistoriqueActivite = useCallback(
        async (activite: ActiviteDto) => {
            setHistoriqueActiviteNom(activite.nom);
            setHistoriqueActiviteModalOpen(true);
            setHistoriqueActiviteChargement(true);
            setHistoriqueActiviteErreur(null);
            setHistoriqueActiviteLignes(null);
            try {
                const rows = await sejourActiviteService.getHistoriqueActivite(sejour.id, activite.id);
                setHistoriqueActiviteLignes(
                    rows.map((r) => ({
                        id: r.id,
                        quand: formatDateHeureHistorique(r.dateModification),
                        qui: formatNomModificateurHistorique(r.modificateurPrenom, r.modificateurNom),
                        action: libelleActionHistorique(r.action),
                        ancienneValeur: r.ancienneValeur,
                        nouvelleValeur: r.nouvelleValeur,
                    }))
                );
            } catch (e: unknown) {
                setHistoriqueActiviteErreur(
                    e instanceof Error ? e.message : "Impossible de charger l'historique"
                );
            } finally {
                setHistoriqueActiviteChargement(false);
            }
        },
        [sejour.id]
    );

    const toggleToken = (tokenId: string) => {
        if (estAnimateurRestreintActivites && tokenSelf && (tokenId ?? "").trim() === tokenSelf) return;
        setSelectedTokens((prev) => {
            const next = new Set(prev);
            if (next.has(tokenId)) next.delete(tokenId);
            else next.add(tokenId);
            return next;
        });
    };

    const toggleGroupeId = (groupeId: number) => {
        setSelectedGroupeIds((prev) => {
            const next = new Set(prev);
            if (next.has(groupeId)) next.delete(groupeId);
            else next.add(groupeId);
            return next;
        });
    };

    const lieuxFiltrésParEmplacement = useMemo(() => {
        // Filtrer d'abord les lieux avec usage ACTIVITE
        const lieuxPourActivites = lieux.filter((l) => l.usages && l.usages.includes('ACTIVITE'));
        if (filtreEmplacementLieu === EMPLACEMENT_FILTRE_TOUS_ACTIVITE) return lieuxPourActivites;
        return lieuxPourActivites.filter((l) => l.emplacement === filtreEmplacementLieu);
    }, [lieux, filtreEmplacementLieu]);

    const lieuxTriés = trierLieuxParNom(lieuxFiltrésParEmplacement);
    const lieuSélectionnéForm = formLieuId !== "" ? lieux.find((l) => l.id === formLieuId) : undefined;

    useEffect(() => {
        if (formLieuId === "") return;
        if (!lieuxFiltrésParEmplacement.some((l) => l.id === formLieuId)) {
            setFormLieuId("");
        }
    }, [lieuxFiltrésParEmplacement, formLieuId]);

    const groupesTriésFiltre = useMemo(() => trierGroupesParNom(groupes), [groupes]);
    const equipeTriéeFiltre = useMemo(() => trierParPrenomPuisNom(equipe), [equipe]);

    const toggleFiltreCalendrierToken = useCallback((tokenId: string) => {
        setFiltreCalendrierTokens((prev) => {
            const allIds = new Set(equipe.map((m) => m.tokenId));
            if (prev.size === 1 && prev.has(CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN)) {
                return new Set([tokenId]);
            }
            if (prev.size === 0) {
                const next = new Set(allIds);
                next.delete(tokenId);
                return next;
            }
            const next = new Set(prev);
            next.delete(CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN);
            if (next.has(tokenId)) next.delete(tokenId);
            else next.add(tokenId);
            if (next.size === 0) return new Set([CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN]);
            if (next.size === allIds.size && [...allIds].every((id) => next.has(id))) return new Set();
            return next;
        });
    }, [equipe]);

    const toggleFiltreCalendrierGroupe = useCallback((groupeId: number) => {
        setFiltreCalendrierGroupeIds((prev) => {
            const allIds = new Set(groupes.map((g) => g.id));
            if (prev.size === 1 && prev.has(CALENDRIER_FILTRE_AUCUN_GROUPE_ID)) {
                return new Set([groupeId]);
            }
            if (prev.size === 0) {
                const next = new Set(allIds);
                next.delete(groupeId);
                return next;
            }
            const next = new Set(prev);
            next.delete(CALENDRIER_FILTRE_AUCUN_GROUPE_ID);
            if (next.has(groupeId)) next.delete(groupeId);
            else next.add(groupeId);
            if (next.size === 0) return new Set([CALENDRIER_FILTRE_AUCUN_GROUPE_ID]);
            if (next.size === allIds.size && [...allIds].every((id) => next.has(id))) return new Set();
            return next;
        });
    }, [groupes]);

    const toutSelectionnerFiltreCalendrierAnim = useCallback(() => {
        setFiltreCalendrierTokens(new Set());
    }, []);

    const rienSelectionnerFiltreCalendrierAnim = useCallback(() => {
        setFiltreCalendrierTokens(new Set([CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN]));
    }, []);

    const toutSelectionnerFiltreCalendrierGroupes = useCallback(() => {
        setFiltreCalendrierGroupeIds(new Set());
    }, []);

    const rienSelectionnerFiltreCalendrierGroupes = useCallback(() => {
        setFiltreCalendrierGroupeIds(new Set([CALENDRIER_FILTRE_AUCUN_GROUPE_ID]));
    }, []);

    const reinitialiserFiltresCalendrier = useCallback(() => {
        setFiltreCalendrierTokens(new Set());
        setFiltreCalendrierGroupeIds(new Set());
    }, []);

    const filtresCalendrierActifs =
        filtreCalendrierTokens.size > 0 || filtreCalendrierGroupeIds.size > 0;

    const libelleResumeFiltreCalendrierAnim = useMemo(() => {
        if (filtreCalendrierTokens.size === 0) return "Tous les animateurs";
        if (
            filtreCalendrierTokens.size === 1 &&
            filtreCalendrierTokens.has(CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN)
        ) {
            return "Aucun animateur";
        }
        const noms = [...filtreCalendrierTokens]
            .filter((tid) => tid !== CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN)
            .map((tid) => {
                const m = equipeTriéeFiltre.find((x) => x.tokenId === tid);
                return m ? `${m.prenom} ${m.nom}`.trim() : null;
            })
            .filter((x): x is string => Boolean(x));
        if (noms.length <= 2) return noms.join(", ");
        return `${noms.length} animateurs`;
    }, [filtreCalendrierTokens, equipeTriéeFiltre]);

    const libelleResumeFiltreCalendrierGroupes = useMemo(() => {
        if (filtreCalendrierGroupeIds.size === 0) return "Tous les groupes";
        if (
            filtreCalendrierGroupeIds.size === 1 &&
            filtreCalendrierGroupeIds.has(CALENDRIER_FILTRE_AUCUN_GROUPE_ID)
        ) {
            return "Aucun groupe";
        }
        const noms = [...filtreCalendrierGroupeIds]
            .filter((id) => id !== CALENDRIER_FILTRE_AUCUN_GROUPE_ID)
            .map((id) => groupesTriésFiltre.find((g) => g.id === id)?.nom)
            .filter((x): x is string => Boolean(x));
        if (noms.length <= 2) return noms.join(", ");
        return `${noms.length} groupes`;
    }, [filtreCalendrierGroupeIds, groupesTriésFiltre]);

    /** Lignes du tableau calendrier : filtre animateurs ∩ membres concernés par les groupes sélectionnés (référents + activités). */
    const equipePourCalendrier = useMemo(() => {
        let lignes =
            filtreCalendrierTokens.size === 0
                ? equipeTriéeFiltre
                : equipeTriéeFiltre.filter((m) => filtreCalendrierTokens.has(m.tokenId));

        const idsGroupesEfficaces = new Set(
            [...filtreCalendrierGroupeIds].filter((id) => id !== CALENDRIER_FILTRE_AUCUN_GROUPE_ID)
        );
        if (idsGroupesEfficaces.size === 0) return lignes;

        const tokensDuFiltreGroupe = tokensEquipePourFiltreGroupesCalendrier(
            groupes,
            idsGroupesEfficaces,
            activites
        );
        return equipeAvecTokenEnTete(
            lignes.filter((m) => tokensDuFiltreGroupe.has(m.tokenId)),
            tokenSelf,
        );
    }, [
        activites,
        equipeTriéeFiltre,
        filtreCalendrierGroupeIds,
        filtreCalendrierTokens,
        groupes,
        tokenSelf,
    ]);

    /** Filtre « aucun groupe » : aucune activité ne peut correspondre — pas de grille (évite cases vides « cliquer pour ajouter »). */
    const calendrierFiltreExclutTousLesGroupes =
        groupes.length > 0 &&
        filtreCalendrierGroupeIds.size === 1 &&
        filtreCalendrierGroupeIds.has(CALENDRIER_FILTRE_AUCUN_GROUPE_ID);

    /** Noms des groupes dont la personne est référent (pour la colonne animateur du calendrier). */
    const libellesGroupesReferentParToken = useMemo(() => {
        const nomsParToken = new Map<string, Set<string>>();
        for (const g of groupes) {
            for (const r of g.referents ?? []) {
                let set = nomsParToken.get(r.tokenId);
                if (!set) {
                    set = new Set();
                    nomsParToken.set(r.tokenId, set);
                }
                set.add(g.nom);
            }
        }
        const lignes = new Map<string, string>();
        for (const [tokenId, set] of nomsParToken) {
            const triés = [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
            lignes.set(tokenId, triés.join(" · "));
        }
        return lignes;
    }, [groupes]);
    const typesTriésFiltre = useMemo(
        () => [...typesActivite].sort(trierTypesParLibelle),
        [typesActivite]
    );
    const lieuxTriésListe = useMemo(() => trierLieuxParNom(lieux), [lieux]);

    const joursDuSejourPourFiltre = useMemo(() => enumererJoursDuSejour(sejour), [sejour.dateDebut, sejour.dateFin]);

    const {
        nombreJoursVue: calendrierNombreJoursVue,
        setNombreJoursVue: setCalendrierNombreJoursVue,
        joursFenetre: joursFenetreCalendrier,
        libellePlage: libellePlageCalendrier,
        peutReculer: peutDefilerCalendrierVersPasse,
        peutAvancer: peutDefilerCalendrierVersFutur,
        decalage: decalageFenetreCalendrier,
        debutFenetreYmd: calDebutFenetreYmd,
        minDebutFenetreYmd: calMinDebutFenetreYmd,
        maxDebutFenetreYmd: calMaxDebutFenetreYmd,
        definirDebutFenetre: definirDebutFenetreCalendrier,
    } = useCalendrierFenetreJours(joursDuSejourPourFiltre);

    const planningTitreImpression = `Planning d'activités — ${sejour.nom}`;

    const printHeaderContext = useMemo(() => {
        const meta: { label: string; value: string }[] = [];
        if (filtreCalendrierTokens.size > 0) {
            meta.push({ label: "Animateurs", value: libelleResumeFiltreCalendrierAnim });
        }
        if (filtreCalendrierGroupeIds.size > 0) {
            meta.push({ label: "Groupes", value: libelleResumeFiltreCalendrierGroupes });
        }
        return buildPrintDocumentContext(planningTitreImpression, meta);
    }, [
        filtreCalendrierGroupeIds.size,
        filtreCalendrierTokens.size,
        libelleResumeFiltreCalendrierAnim,
        libelleResumeFiltreCalendrierGroupes,
        planningTitreImpression,
    ]);

    const { contentRef, print, fixedRunningHeaderLabel } = usePrintContent({
        documentTitle: planningTitreImpression,
        runningHeaderLabel: planningTitreImpression,
        format: "landscape-a4",
        extraPageStyle: PRINT_STYLE_PRESETS.activitesCalendarGrid,
    });

    useEffect(() => {
        setFiltreListeDate("");
        setFiltreListeLieu("");
        setFiltreListeGroupe("");
        setFiltreListeAnimateur("");
        setFiltreListeType("");
    }, [sejour.id, sejour.dateDebut, sejour.dateFin]);

    /** Dès qu’une date est renseignée, elle compte comme filtre (lien « voir toutes les activités », compteur). */
    const filtresListeActifs =
        filtreListeDate !== "" ||
        filtreListeLieu !== "" ||
        filtreListeGroupe !== "" ||
        filtreListeAnimateur !== "" ||
        filtreListeType !== "";

    const activitesFiltrees = useMemo(() => {
        const out = activites.filter((a) => {
            if (filtreListeDate !== "") {
                if (activiteDateToFilterKey(a.date) !== filtreListeDate) return false;
            }
            if (filtreListeLieu !== "") {
                if (filtreListeLieu === FILTRE_LISTE_LIEU_SANS) {
                    if (a.lieu != null) return false;
                } else {
                    const id = Number.parseInt(filtreListeLieu, 10);
                    if (Number.isNaN(id) || a.lieu?.id !== id) return false;
                }
            }
            if (filtreListeGroupe !== "") {
                const gid = Number.parseInt(filtreListeGroupe, 10);
                if (Number.isNaN(gid) || !a.groupeIds?.includes(gid)) return false;
            }
            if (filtreListeAnimateur !== "") {
                if (!a.membres?.some((m) => m.tokenId === filtreListeAnimateur)) return false;
            }
            if (filtreListeType !== "") {
                const tid = Number.parseInt(filtreListeType, 10);
                if (Number.isNaN(tid) || a.typeActivite?.id !== tid) return false;
            }
            return true;
        });
        const particip = (a: ActiviteDto) =>
            tokenSelf !== "" &&
            (a.membres ?? []).some((m) => (m.tokenId ?? "").trim() === tokenSelf);
        out.sort((a, b) => {
            const pa = particip(a) ? 0 : 1;
            const pb = particip(b) ? 0 : 1;
            if (pa !== pb) return pa - pb;
            const ka = activiteDateToFilterKey(a.date);
            const kb = activiteDateToFilterKey(b.date);
            if (ka !== kb) return ka.localeCompare(kb);
            return a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" });
        });
        return out;
    }, [
        activites,
        filtreListeDate,
        filtreListeLieu,
        filtreListeGroupe,
        filtreListeAnimateur,
        filtreListeType,
        tokenSelf,
    ]);

    const activitesParAnimateurEtDate = useMemo(() => {
        const map = new Map<string, Map<string, ActiviteDto[]>>();
        for (const membre of equipeTriéeFiltre) {
            map.set(membre.tokenId, new Map());
        }
        for (const a of activites) {
            const ymd = activiteDateToFilterKey(a.date);
            for (const m of a.membres ?? []) {
                let inner = map.get(m.tokenId);
                if (!inner) {
                    inner = new Map();
                    map.set(m.tokenId, inner);
                }
                const prev = inner.get(ymd) ?? [];
                inner.set(ymd, [...prev, a]);
            }
        }
        return map;
    }, [activites, equipeTriéeFiltre]);

    const sortiesParAnimateurEtDate = useMemo(
        () => construireSortiesParAnimateurEtDate(prestataires, groupes),
        [prestataires, groupes],
    );

    const cellulesParAnimateurEtDate = useMemo(
        () =>
            construireCellulesPlanningParAnimateurEtDate(
                activitesParAnimateurEtDate,
                sortiesParAnimateurEtDate,
                momentsTriés,
                peutGererActivitesComplet,
            ),
        [
            activitesParAnimateurEtDate,
            sortiesParAnimateurEtDate,
            momentsTriés,
            peutGererActivitesComplet,
        ],
    );

    const requestRetirerSortieCalendrier = (
        sortie: ActivitePrestataireDto,
        moment: MomentDto,
        tokenId: string,
        animateurLabel: string,
    ) => {
        setPendingRetraitSortie({ sortie, moment, tokenId, animateurLabel });
        setRetirerSortieModalOpen(true);
    };

    const confirmerRetirerSortieCalendrier = async () => {
        if (!pendingRetraitSortie) return;
        const { sortie, moment, tokenId } = pendingRetraitSortie;
        const tid = tokenId.trim();
        const sortieCourante = prestataires.find((p) => p.id === sortie.id) ?? sortie;
        if (estNonParticipation(sortieCourante.nonParticipations, tid, moment.id)) {
            setRetirerSortieModalOpen(false);
            setPendingRetraitSortie(null);
            return;
        }
        const cle = cleRetraitSortieCalendrier(sortie.id, moment.id, tid);
        setRetirerSortieCalendrierEnCours(cle);
        setErrorMessage(null);
        try {
            const ymd = datePrestataireVersYmd(sortieCourante.date);
            const activiteConflit = activiteInternePourTokenMomentDate(
                activites,
                tid,
                ymd,
                moment.id,
            );
            if (activiteConflit) {
                await sejourActiviteService.supprimerActivite(sejour.id, activiteConflit.id);
            }

            const nonParts = fusionnerNonParticipationsApresChoix(
                sortieCourante.nonParticipations ?? [],
                [{ tokenId: tid, momentId: moment.id }],
                [],
            );
            const updated = await sejourActivitePrestataireService.modifierActivitePrestataire(
                sejour.id,
                sortieCourante.id,
                sortieVersSaveRequest(sortieCourante, nonParts),
            );
            setPrestataires((prev) =>
                prev.map((p) => (p.id === updated.id ? normaliserPrestataireDto(updated) : p)),
            );
            setRetirerSortieModalOpen(false);
            setPendingRetraitSortie(null);
            revalidator.revalidate();
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Impossible de retirer la sortie du calendrier";
            setErrorMessage(msg);
        } finally {
            setRetirerSortieCalendrierEnCours(null);
        }
    };

    const resoudreConflitPrestataireCalendrier = async (
        item: Extract<CalendrierCelluleItem, { kind: "conflit" }>,
        tokenId: string,
        choix: ChoixResolutionConflitPrestataire,
    ) => {
        const tid = tokenId.trim();
        if (!tid) return;

        const sortieCourante = prestataires.find((p) => p.id === item.sortie.id) ?? item.sortie;
        const cleConflit = `conflit-${item.sortie.id}-${item.moment.id}-${tid}`;
        setConflitResolutionEnCours(cleConflit);
        try {
            let nonParts = [...(sortieCourante.nonParticipations ?? [])];
            if (choix === "sortie") {
                await sejourActiviteService.supprimerActivite(sejour.id, item.activite.id);
                nonParts = fusionnerNonParticipationsApresChoix(nonParts, [], [
                    { tokenId: tid, momentId: item.moment.id },
                ]);
            } else if (!estNonParticipation(nonParts, tid, item.moment.id)) {
                nonParts = fusionnerNonParticipationsApresChoix(
                    nonParts,
                    [{ tokenId: tid, momentId: item.moment.id }],
                    [],
                );
            }
            const updated = await sejourActivitePrestataireService.modifierActivitePrestataire(
                sejour.id,
                sortieCourante.id,
                sortieVersSaveRequest(sortieCourante, nonParts),
            );
            setPrestataires((prev) =>
                prev.map((p) => (p.id === updated.id ? normaliserPrestataireDto(updated) : p)),
            );
            revalidator.revalidate();
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Impossible de résoudre le conflit sortie / activité";
            setErrorMessage(msg);
        } finally {
            setConflitResolutionEnCours(null);
        }
    };

    const peutAjouterActivite =
        equipe.length > 0 && groupes.length > 0 && moments.length > 0 && typesActivite.length > 0;

    const voirToutesLesActivites = () => {
        setFiltreListeDate("");
        setFiltreListeLieu("");
        setFiltreListeGroupe("");
        setFiltreListeAnimateur("");
        setFiltreListeType("");
    };

    const fermerModalActivite = () => {
        if (submitting) return;
        setModalOpen(false);
        setErrorMessage(null);
    };

    const fermerModalConflitActivite = () => {
        if (submitting) return;
        setConflitActiviteModalOpen(false);
        setErrorMessage(null);
    };

    const fermerFormulaireActiviteApresConflit = () => {
        setModalOpen(false);
        setConflitActiviteModalOpen(false);
        setConflitsActiviteEnCours([]);
        setChoixConflitsActivite(new Map());
        setPendingActiviteSave(null);
        setEditingActiviteId(null);
        setErrorMessage(null);
    };

    const executerEnregistrementActivite = async (
        payload: CreateActiviteRequest | UpdateActiviteRequest,
        membreTokenIds: string[],
        conflits: ConflitActiviteAvecSortie[],
        choixParCle: Map<string, ChoixResolutionConflitPrestataire>,
    ) => {
        const tokensFinaux = new Set(membreTokenIds.map((t) => t.trim()).filter(Boolean));

        for (const c of conflits) {
            const choix = choixParCle.get(cleNonParticipation(c.tokenId, c.momentId));
            if (choix === "sortie") {
                tokensFinaux.delete(c.tokenId.trim());
            }
        }

        if (tokensFinaux.size === 0) {
            fermerFormulaireActiviteApresConflit();
            showSuccessModal(
                editingActiviteId == null
                    ? "Aucune activité créée : la sortie reste affichée sur le calendrier pour le ou les animateurs concernés."
                    : "Aucune modification enregistrée : la sortie reste affichée sur le calendrier pour le ou les animateurs concernés.",
            );
            return;
        }

        const nonPartsParSortie = new Map<number, NonParticipationPrestataireDto[]>();
        for (const c of conflits) {
            const choix = choixParCle.get(cleNonParticipation(c.tokenId, c.momentId));
            if (choix !== "activite") continue;
            const sortie = prestataires.find((p) => p.id === c.sortieId);
            if (!sortie) continue;
            const base = nonPartsParSortie.get(c.sortieId) ?? sortie.nonParticipations ?? [];
            nonPartsParSortie.set(
                c.sortieId,
                fusionnerNonParticipationsApresChoix(
                    base,
                    [{ tokenId: c.tokenId, momentId: c.momentId }],
                    [],
                ),
            );
        }

        let prestatairesLocaux = prestataires;
        for (const [sortieId, nonParts] of nonPartsParSortie) {
            const sortie = prestatairesLocaux.find((p) => p.id === sortieId);
            if (!sortie) continue;
            const updated = await sejourActivitePrestataireService.modifierActivitePrestataire(
                sejour.id,
                sortieId,
                sortieVersSaveRequest(sortie, nonParts),
            );
            prestatairesLocaux = prestatairesLocaux.map((p) =>
                p.id === updated.id ? normaliserPrestataireDto(updated) : p,
            );
        }
        if (nonPartsParSortie.size > 0) {
            setPrestataires(prestatairesLocaux);
        }

        const payloadFinal: CreateActiviteRequest | UpdateActiviteRequest = {
            ...payload,
            membreTokenIds: [...tokensFinaux],
        };

        let sauvegardee: ActiviteDto;
        if (editingActiviteId == null) {
            sauvegardee = await sejourActiviteService.creerActivite(
                sejour.id,
                payloadFinal as CreateActiviteRequest,
            );
        } else {
            sauvegardee = await sejourActiviteService.modifierActivite(
                sejour.id,
                editingActiviteId,
                payloadFinal as UpdateActiviteRequest,
            );
        }

        let messageSuccès =
            editingActiviteId == null ? "Activité créée avec succès." : "Activité modifiée avec succès.";

        const exclusSortie = conflits.filter(
            (c) => choixParCle.get(cleNonParticipation(c.tokenId, c.momentId)) === "activite",
        );
        if (exclusSortie.length > 0) {
            const details = exclusSortie
                .map((c) => {
                    const personne =
                        `${c.animateurPrenom} ${c.animateurNom}`.trim() || "Animateur";
                    return `${personne} (${c.momentNom}, sortie « ${c.sortieNom} »)`;
                })
                .join(", ");
            const intro =
                exclusSortie.length > 1
                    ? "Ne participent plus à la sortie"
                    : "Ne participe plus à la sortie";
            messageSuccès += `\n\n${intro} : ${details}.`;
        }

        const avertissement = sauvegardee.avertissementLieu?.trim();
        if (avertissement) {
            messageSuccès += `\n\n${avertissement}`;
        }
        showSuccessModal(messageSuccès);
        fermerFormulaireActiviteApresConflit();
        revalidator.revalidate();
    };

    const appliquerChoixConflitActivite = (cle: string, choix: ChoixResolutionConflitPrestataire) => {
        setChoixConflitsActivite((prev) => {
            const next = new Map(prev);
            next.set(cle, choix);
            return next;
        });
        setErrorMessage(null);
    };

    const tousChoixConflitsActiviteFaits = useMemo(
        () =>
            conflitsActiviteEnCours.length > 0 &&
            conflitsSansChoixResolution(conflitsActiviteEnCours, choixConflitsActivite).length === 0,
        [conflitsActiviteEnCours, choixConflitsActivite],
    );

    const handleSubmit = async () => {
        if (conflitActiviteModalOpen) return;

        setErrorMessage(null);
        if (!formDate.trim()) {
            setErrorMessage("La date est obligatoire.");
            return;
        }
        if (!formNom.trim()) {
            setErrorMessage("Le nom est obligatoire.");
            return;
        }
        if (selectedGroupeIds.size === 0) {
            setErrorMessage("Au moins un groupe est requis.");
            return;
        }
        if (selectedTokens.size === 0) {
            setErrorMessage("Au moins un membre d'équipe est requis.");
            return;
        }
        if (moments.length > 0) {
            if (formMomentId === "") {
                setErrorMessage("Le moment (créneau) est obligatoire.");
                return;
            }
        }
        if (formTypeActiviteId === "") {
            setErrorMessage("Le type d'activité est obligatoire.");
            return;
        }

        const idsMembres = new Set(selectedTokens);
        if (estAnimateurRestreintActivites && tokenSelf && tokenConnecteDansEquipe) {
            idsMembres.add(tokenSelf);
        }

        const payload: CreateActiviteRequest | UpdateActiviteRequest = {
            date: formDate,
            nom: formNom.trim(),
            membreTokenIds: [...idsMembres],
            groupeIds: [...selectedGroupeIds].sort((x, y) => x - y),
            typeActiviteId: formTypeActiviteId,
        };
        const desc = formDescription.trim();
        if (desc) payload.description = desc;

        if (formLieuId !== "") {
            payload.lieuId = formLieuId;
        } else if (editingActiviteId != null) {
            payload.lieuId = null;
        }

        const momentId =
            moments.length > 0 && formMomentId !== "" ? (formMomentId as number) : 0;
        if (momentId > 0) {
            payload.momentId = momentId;
        }

        const membreTokenIds = [...idsMembres];
        const conflits =
            momentId > 0
                ? listerConflitsActiviteInterneAvecSortie(
                      formDate.trim(),
                      momentId,
                      membreTokenIds,
                      prestataires,
                      groupes,
                      momentsTriés,
                      activites,
                      { exclureActiviteId: editingActiviteId },
                  )
                : [];

        if (conflits.length > 0) {
            if (!peutGererActivitesComplet) {
                setErrorMessage(
                    "Une sortie est déjà planifiée sur ce créneau.",
                );
                return;
            }
            setPendingActiviteSave({ payload, membreTokenIds });
            setConflitsActiviteEnCours(conflits);
            setChoixConflitsActivite(new Map());
            setErrorMessage(null);
            setConflitActiviteModalOpen(true);
            return;
        }

        setSubmitting(true);
        try {
            await executerEnregistrementActivite(payload, membreTokenIds, [], new Map());
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingActiviteId == null
                      ? "Impossible de créer l'activité"
                      : "Impossible de modifier l'activité";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmerResolutionConflitsActivite = async () => {
        if (!pendingActiviteSave) return;
        const manquants = conflitsSansChoixResolution(
            conflitsActiviteEnCours,
            choixConflitsActivite,
        );
        if (manquants.length > 0) {
            setErrorMessage(
                manquants.length === 1
                    ? "Choisissez « Afficher la sortie » ou « Créer l’activité » pour l’animateur restant."
                    : `Choisissez une option pour chaque conflit (${manquants.length} sans réponse).`,
            );
            return;
        }
        setErrorMessage(null);
        setSubmitting(true);
        try {
            await executerEnregistrementActivite(
                pendingActiviteSave.payload,
                pendingActiviteSave.membreTokenIds,
                conflitsActiviteEnCours,
                choixConflitsActivite,
            );
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingActiviteId == null
                      ? "Impossible de créer l'activité"
                      : "Impossible de modifier l'activité";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const requestDeleteActivite = (activiteId: number) => {
        if (estAnimateurRestreintActivites && tokenSelf) {
            const cible = activites.find((a) => a.id === activiteId);
            if (
                cible &&
                !cible.membres?.some((m) => (m.tokenId ?? "").trim() === tokenSelf)
            ) {
                return;
            }
        }
        setPendingDeleteActiviteId(activiteId);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteActiviteId == null) return;
        setErrorMessage(null);
        setDeletingActiviteId(pendingDeleteActiviteId);
        try {
            await sejourActiviteService.supprimerActivite(sejour.id, pendingDeleteActiviteId);
            setDeleteModalOpen(false);
            setPendingDeleteActiviteId(null);
            showSuccessModal("Activité supprimée avec succès.");
            revalidator.revalidate();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer l'activité";
            setErrorMessage(msg);
        } finally {
            setDeletingActiviteId(null);
        }
    };

    const listeActivitesRootRef = useRef<HTMLDivElement>(null);
    const topPinnedStackRef = useRef<HTMLDivElement>(null);
    const uneModaleOuverte =
        modalOpen ||
        conflitActiviteModalOpen ||
        retirerSortieModalOpen ||
        deleteModalOpen ||
        successModalOpen ||
        printChoiceModalOpen ||
        historiqueActiviteModalOpen;
    /** Garde les en-têtes en flux normal jusqu’à stabilisation du layout après fermeture de modale. */
    const [attenteReactivationStickyEnTetes, setAttenteReactivationStickyEnTetes] = useState(false);
    const enTetesCalendrierEnFlux = uneModaleOuverte || attenteReactivationStickyEnTetes;
    const enTetesCalendrierEnFluxRef = useRef(enTetesCalendrierEnFlux);
    enTetesCalendrierEnFluxRef.current = enTetesCalendrierEnFlux;
    const uneModaleOuverteRef = useRef(uneModaleOuverte);
    uneModaleOuverteRef.current = uneModaleOuverte;

    useLayoutEffect(() => {
        if (uneModaleOuverte) {
            setAttenteReactivationStickyEnTetes(true);
            return;
        }
        if (!attenteReactivationStickyEnTetes) return;

        return planifierReactivationEnTetesCalendrierSticky(() => {
            const root = listeActivitesRootRef.current;
            const stack = topPinnedStackRef.current;
            if (root && stack) {
                applyListeActivitesPinnedGeometry(root, stack, { mettreAJourHauteurBarre: true });
            }
            if (!uneModaleOuverteRef.current) {
                setAttenteReactivationStickyEnTetes(false);
            }
        });
    }, [uneModaleOuverte, attenteReactivationStickyEnTetes]);

    /**
     * Hauteur du header du site + géométrie du bloc épinglé (boutons ± filtres) :
     * aligne la barre fixe et l’en-tête du tableau calendrier au scroll.
     */
    useLayoutEffect(() => {
        const root = listeActivitesRootRef.current;
        const stack = topPinnedStackRef.current;
        if (!root || !stack) return;

        let rafId: number | null = null;

        const apply = () => {
            applyListeActivitesPinnedGeometry(root, stack, {
                mettreAJourHauteurBarre: !enTetesCalendrierEnFluxRef.current,
            });
        };

        const scheduleApply = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                apply();
            });
        };

        apply();
        const roStack = new ResizeObserver(scheduleApply);
        roStack.observe(stack);
        const roRoot = new ResizeObserver(scheduleApply);
        roRoot.observe(root);
        const hdr = document.querySelector("header");
        const roHdr = hdr ? new ResizeObserver(scheduleApply) : null;
        if (hdr && roHdr) roHdr.observe(hdr);
        window.addEventListener("resize", scheduleApply);
        window.addEventListener("scroll", scheduleApply, true);
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            roStack.disconnect();
            roRoot.disconnect();
            roHdr?.disconnect();
            window.removeEventListener("resize", scheduleApply);
            window.removeEventListener("scroll", scheduleApply, true);
        };
    }, [
        vueActivites,
        equipe.length,
        joursDuSejourPourFiltre.length,
        joursFenetreCalendrier,
        calendrierNombreJoursVue,
        equipePourCalendrier.length,
        activites.length,
    ]);

    const peutImprimerPlanningCalendrier =
        vueActivites === "calendrier" &&
        equipe.length > 0 &&
        joursDuSejourPourFiltre.length > 0 &&
        joursFenetreCalendrier.length > 0;

    const imprimerPlanningCalendrier = (mode: ModeImpressionPlanningActivites) => {
        setModeImpressionPlanning(mode);
        setPrintChoiceModalOpen(false);
        window.setTimeout(() => print(), 0);
    };

    const libelleGroupesActivite = (groupeIds: number[] | undefined): string => {
        const noms = (groupeIds ?? [])
            .map((id) => groupes.find((g) => g.id === id)?.nom)
            .filter((nom): nom is string => Boolean(nom));
        return noms.join(", ");
    };

    const renderPrintCalendrierItem = (item: CalendrierCelluleItem, membre: MembreEquipeSejour) => {
        const c = PRINT_GLOBAL_CLASS;
        const carteCouleur = modeImpressionPlanning === "couleurs";

        if (item.kind === "activite") {
            const a = item.activite;
            const autresAnimateurs = (a.membres ?? []).filter((m) => m.tokenId !== membre.tokenId);
            const groupesActivite = libelleGroupesActivite(a.groupeIds);
            const cardStyle = carteCouleur
                ? ({
                      "--enjoy-activites-print-card-bg": couleurFondCalendrierPourTypeActivite(
                          a.typeActivite?.id,
                      ),
                  } as React.CSSProperties)
                : undefined;
            return (
                <div
                    key={`act-${a.id}`}
                    className={`${c.activitesPrintCard} ${carteCouleur ? c.activitesPrintCardColor : ""}`}
                    style={cardStyle}
                >
                    {a.moment ? <span className={c.activitesPrintCardMoment}>{a.moment.nom}</span> : null}
                    <span className={c.activitesPrintCardTitle}>{a.nom}</span>
                    {a.lieu ? <span className={c.activitesPrintCardMeta}>Lieu : {a.lieu.nom}</span> : null}
                    {autresAnimateurs.length > 0 ? (
                        <span className={c.activitesPrintCardMeta}>
                            Avec : {autresAnimateurs.map((m) => `${m.prenom} ${m.nom}`.trim()).join(", ")}
                        </span>
                    ) : null}
                    {groupesActivite ? (
                        <span className={c.activitesPrintCardMeta}>Groupes : {groupesActivite}</span>
                    ) : null}
                </div>
            );
        }

        if (item.kind === "prestataire") {
            const plage = libellePlageHorairePrestataire(item.sortie.heureDepart, item.sortie.heureRetour);
            const groupesSortie = libelleGroupesActivite(item.sortie.groupeIds);
            const cardStyle = carteCouleur
                ? ({ "--enjoy-activites-print-card-bg": "rgba(13, 110, 92, 0.14)" } as React.CSSProperties)
                : undefined;
            return (
                <div
                    key={`presta-${item.sortie.id}-${item.moment.id}`}
                    className={`${c.activitesPrintCard} ${carteCouleur ? c.activitesPrintCardColor : ""}`}
                    style={cardStyle}
                >
                    <span className={c.activitesPrintCardMoment}>{item.moment.nom}</span>
                    <span className={c.activitesPrintCardTitle}>{item.sortie.nom}</span>
                    {plage ? <span className={c.activitesPrintCardMeta}>{plage}</span> : null}
                    {groupesSortie ? (
                        <span className={c.activitesPrintCardMeta}>Groupes : {groupesSortie}</span>
                    ) : null}
                </div>
            );
        }

        const plage = libellePlageHorairePrestataire(item.sortie.heureDepart, item.sortie.heureRetour);
        return (
            <div
                key={`conflit-${item.sortie.id}-${item.moment.id}-${membre.tokenId}`}
                className={`${c.activitesPrintCard} ${c.activitesPrintConflict}`}
            >
                <span className={c.activitesPrintCardTitle}>Conflit — {item.moment.nom}</span>
                <span className={c.activitesPrintCardMeta}>
                    Sortie : {item.sortie.nom}
                    {plage ? ` (${plage})` : ""}
                </span>
                <span className={c.activitesPrintCardMeta}>Activité : {item.activite.nom}</span>
            </div>
        );
    };

    const renderPlanningPrintCalendrier = () => {
        const c = PRINT_GLOBAL_CLASS;
        if (equipePourCalendrier.length === 0) {
            return <p>Aucun animateur ne correspond aux filtres sélectionnés.</p>;
        }
        if (calendrierFiltreExclutTousLesGroupes) {
            return <p>Aucun groupe ne fait partie du filtre.</p>;
        }
        return (
            <table className={c.activitesPrintTable}>
                <thead>
                    <tr>
                        <th scope="col" className={c.activitesPrintThAnimateur}>
                            Animateur
                        </th>
                        {joursFenetreCalendrier.map((jour) => (
                            <th key={jour.ymd} scope="col" className={c.activitesPrintThJour}>
                                {jour.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {equipePourCalendrier.map((membre) => (
                        <tr key={membre.tokenId}>
                            <th scope="row" className={c.activitesPrintThAnimateur}>
                                <span className={c.activitesPrintAnimateurName}>
                                    {membre.prenom} {membre.nom}
                                </span>
                                {libellesGroupesReferentParToken.get(membre.tokenId) ? (
                                    <span className={c.activitesPrintAnimateurGroupes}>
                                        {libellesGroupesReferentParToken.get(membre.tokenId)}
                                    </span>
                                ) : null}
                            </th>
                            {joursFenetreCalendrier.map(({ ymd, dansSejour }) => {
                                const items = (
                                    cellulesParAnimateurEtDate.get(membre.tokenId)?.get(ymd) ?? []
                                ).filter((item) =>
                                    itemPasseFiltreGroupeCalendrierPrint(item, filtreCalendrierGroupeIds),
                                );
                                return (
                                    <td
                                        key={ymd}
                                        className={`${c.activitesPrintCell} ${
                                            !dansSejour ? c.activitesPrintCellHorsSejour : ""
                                        }`}
                                    >
                                        {items.length > 0
                                            ? items.map((item) => renderPrintCalendrierItem(item, membre))
                                            : "—"}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div
            ref={listeActivitesRootRef}
            className={styles.listeActivitesRoot}
            {...(enTetesCalendrierEnFlux ? { "data-modal-open": "" } : {})}
        >
            {peutImprimerPlanningCalendrier ? (
                <div className={PRINT_GLOBAL_CLASS.only}>
                    <PrintContentRoot
                        contentRef={contentRef}
                        fixedRunningHeaderLabel={fixedRunningHeaderLabel}
                    >
                        <PrintDocumentHeader context={printHeaderContext} />
                        <div className={PRINT_GLOBAL_CLASS.activitesPrintGrid}>
                            {renderPlanningPrintCalendrier()}
                        </div>
                    </PrintContentRoot>
                </div>
            ) : null}
            <div ref={topPinnedStackRef} className={styles.topPinnedStack}>
            <div className={styles.addActiviteRow}>
                <div className={styles.addActiviteRowInner}>
                    <div className={styles.addActiviteRowStart}>
                        {equipe.length > 0 && joursDuSejourPourFiltre.length > 0 ? (
                            <div
                                className={styles.vueToggle}
                                role="tablist"
                                aria-label="Mode d'affichage des activités"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    className={`${styles.vueToggleBtn} ${
                                        vueActivites === "calendrier" ? styles.vueToggleBtnActive : ""
                                    }`}
                                    aria-selected={vueActivites === "calendrier"}
                                    onClick={() => setVueActivites("calendrier")}
                                >
                                    Calendrier
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    className={`${styles.vueToggleBtn} ${
                                        vueActivites === "liste" ? styles.vueToggleBtnActive : ""
                                    }`}
                                    aria-selected={vueActivites === "liste"}
                                    onClick={() => setVueActivites("liste")}
                                >
                                    Liste
                                </button>
                            </div>
                        ) : null}
                        {vueActivites === "liste" ? (
                            <Button color="success" onClick={openModal} disabled={!peutAjouterActivite}>
                                Ajouter une activité
                            </Button>
                        ) : null}
                        <Link
                            to={`/mes-sejours/${sejour.id}/activites/sorties-prestas`}
                            className={styles.sortiesPrestasLinkBtn}
                        >
                            Sorties / prestas
                        </Link>
                        {vueActivites === "calendrier" && joursFenetreCalendrier.length > 0 ? (
                            <CalendrierNavigationPeriode
                                libellePlage={libellePlageCalendrier}
                                peutReculer={peutDefilerCalendrierVersPasse}
                                peutAvancer={peutDefilerCalendrierVersFutur}
                                onReculer={() => decalageFenetreCalendrier(-1)}
                                onAvancer={() => decalageFenetreCalendrier(1)}
                                nombreJoursVue={calendrierNombreJoursVue}
                                onNombreJoursVueChange={setCalendrierNombreJoursVue}
                                debutFenetreYmd={calDebutFenetreYmd}
                                minDebutFenetreYmd={calMinDebutFenetreYmd}
                                maxDebutFenetreYmd={calMaxDebutFenetreYmd}
                                onChangerDebutFenetre={definirDebutFenetreCalendrier}
                            />
                        ) : null}
                        {peutImprimerPlanningCalendrier ? (
                            <PrintTrigger
                                variant="button"
                                onPrint={() => setPrintChoiceModalOpen(true)}
                                label="Imprimer le planning d'activités"
                                buttonText="Imprimer"
                            />
                        ) : null}
                    </div>
                </div>
            </div>
            {vueActivites === "calendrier" && equipe.length > 0 && joursDuSejourPourFiltre.length > 0 ? (
                <CalendrierFiltresPlanning
                    equipeTriéeFiltre={equipeTriéeFiltre}
                    groupesTriésFiltre={groupesTriésFiltre}
                    groupes={groupes}
                    filtreCalendrierTokens={filtreCalendrierTokens}
                    filtreCalendrierGroupeIds={filtreCalendrierGroupeIds}
                    filtresCalendrierActifs={filtresCalendrierActifs}
                    libelleResumeFiltreCalendrierAnim={libelleResumeFiltreCalendrierAnim}
                    libelleResumeFiltreCalendrierGroupes={libelleResumeFiltreCalendrierGroupes}
                    onToggleFiltreCalendrierToken={toggleFiltreCalendrierToken}
                    onToggleFiltreCalendrierGroupe={toggleFiltreCalendrierGroupe}
                    onToutSelectionnerFiltreCalendrierAnim={toutSelectionnerFiltreCalendrierAnim}
                    onRienSelectionnerFiltreCalendrierAnim={rienSelectionnerFiltreCalendrierAnim}
                    onToutSelectionnerFiltreCalendrierGroupes={toutSelectionnerFiltreCalendrierGroupes}
                    onRienSelectionnerFiltreCalendrierGroupes={rienSelectionnerFiltreCalendrierGroupes}
                    onReinitialiserFiltresCalendrier={reinitialiserFiltresCalendrier}
                />
            ) : null}
            {activites.length > 0 && vueActivites === "liste" ? (
                <ListeActivitesListeFiltres
                    joursDuSejourPourFiltre={joursDuSejourPourFiltre}
                    filtreListeDate={filtreListeDate}
                    setFiltreListeDate={setFiltreListeDate}
                    filtreListeLieu={filtreListeLieu}
                    setFiltreListeLieu={setFiltreListeLieu}
                    filtreListeGroupe={filtreListeGroupe}
                    setFiltreListeGroupe={setFiltreListeGroupe}
                    filtreListeAnimateur={filtreListeAnimateur}
                    setFiltreListeAnimateur={setFiltreListeAnimateur}
                    filtreListeType={filtreListeType}
                    setFiltreListeType={setFiltreListeType}
                    lieuxTriésListe={lieuxTriésListe}
                    groupesTriésFiltre={groupesTriésFiltre}
                    equipeTriéeFiltre={equipeTriéeFiltre}
                    typesTriésFiltre={typesTriésFiltre}
                    lieux={lieux}
                    groupes={groupes}
                    equipe={equipe}
                    typesActivite={typesActivite}
                    filtresListeActifs={filtresListeActifs}
                    voirToutesLesActivites={voirToutesLesActivites}
                    activitesFiltreesCount={activitesFiltrees.length}
                    activitesTotal={activites.length}
                />
            ) : null}
            </div>
            <div className={styles.topPinnedStackSpacer} aria-hidden />
            {typesActivite.length === 0 && (
                <p className={styles.warningText}>
                    Aucun type d&apos;activité n&apos;est disponible pour ce séjour. Ils sont normalement créés
                    automatiquement ; contactez l&apos;administrateur si cette liste reste vide.
                </p>
            )}
            {moments.length === 0 && (
                <p className={styles.warningText}>
                    Aucun moment (matin, après-midi, etc.) n&apos;est défini, il faut en créer au moins un avant
                    d&apos;ajouter une activité. Demandez à la <strong>direction</strong> d&apos;en configurer pour ce
                    séjour.
                </p>
            )}
            {equipe.length === 0 && (
                <p className={styles.warningText}>
                    Aucun membre d&apos;équipe n&apos;est défini pour ce séjour. Ajoutez d&apos;abord un directeur et des membres
                    d&apos;équipe pour pouvoir planifier des activités.
                </p>
            )}
            {equipe.length > 0 && groupes.length === 0 && (
                <p className={styles.warningText}>
                    Aucun groupe n&apos;est défini pour ce séjour. Créez au moins un groupe pour pouvoir planifier des activités.
                </p>
            )}
            {errorMessage && !modalOpen && !conflitActiviteModalOpen ? (
                <div className={styles.errorMessage}>{errorMessage}</div>
            ) : null}

            {vueActivites === "calendrier" && equipe.length > 0 && joursDuSejourPourFiltre.length > 0 ? (
                <CalendrierPlanning
                    nombreJoursFenetre={calendrierNombreJoursVue}
                    joursFenetreCalendrier={joursFenetreCalendrier}
                    equipePourCalendrier={equipePourCalendrier}
                    cellulesParAnimateurEtDate={cellulesParAnimateurEtDate}
                    libellesGroupesReferentParToken={libellesGroupesReferentParToken}
                    filtreCalendrierGroupeIds={filtreCalendrierGroupeIds}
                    calendrierFiltreExclutTousLesGroupes={calendrierFiltreExclutTousLesGroupes}
                    momentsTriés={momentsTriés}
                    groupes={groupes}
                    peutAjouterActivite={peutAjouterActivite}
                    activitesCount={activites.length}
                    onOpenNouvelleActivite={openModalNouvelleActivite}
                    onOpenEdit={openEditModal}
                    onDelete={requestDeleteActivite}
                    deletingActiviteId={deletingActiviteId}
                    tokenEditionCalendrierReserve={
                        estAnimateurRestreintActivites && tokenSelf ? tokenSelf : null
                    }
                    onOpenHistoriqueActivite={ouvrirHistoriqueActivite}
                    peutResoudreConflitsPrestataires={peutGererActivitesComplet}
                    onResoudreConflitPrestataire={resoudreConflitPrestataireCalendrier}
                    conflitResolutionEnCours={conflitResolutionEnCours}
                    onRetirerSortieCalendrier={
                        peutGererActivitesComplet ? requestRetirerSortieCalendrier : undefined
                    }
                    retirerSortieCalendrierEnCours={
                        peutGererActivitesComplet ? retirerSortieCalendrierEnCours : null
                    }
                />
            ) : (
                <ListeActivitesListeResultat
                    activites={activites}
                    activitesFiltrees={activitesFiltrees}
                    groupes={groupes}
                    deletingActiviteId={deletingActiviteId}
                    onEdit={openEditModal}
                    onDelete={requestDeleteActivite}
                    peutGererToutesActivites={peutGererActivitesComplet}
                    tokenUtilisateurConnecte={tokenSelf || null}
                    onOpenHistoriqueActivite={ouvrirHistoriqueActivite}
                />
            )}

            <Modal isOpen={printChoiceModalOpen} toggle={() => setPrintChoiceModalOpen(false)}>
                <ModalHeader toggle={() => setPrintChoiceModalOpen(false)}>
                    Imprimer le planning d&apos;activités
                </ModalHeader>
                <ModalBody>
                    <p className={styles.printChoiceIntro}>Choisissez le rendu de l&apos;impression.</p>
                    <div className={styles.printChoiceOptions}>
                        <Button
                            color="outline-secondary"
                            type="button"
                            className={styles.printChoiceOption}
                            onClick={() => imprimerPlanningCalendrier("noir-blanc")}
                        >
                            <span className={styles.printChoiceOptionTitle}>Noir et blanc</span>
                            <span className={styles.printChoiceOptionDesc}>
                                Imprimer le planning avec des cases blanches.
                            </span>
                        </Button>
                        <Button
                            color="outline-secondary"
                            type="button"
                            className={styles.printChoiceOption}
                            onClick={() => imprimerPlanningCalendrier("couleurs")}
                        >
                            <span className={styles.printChoiceOptionTitle}>Couleurs</span>
                            <span className={styles.printChoiceOptionDesc}>
                                Reprendre les couleurs des cartes du tableau d&apos;activités.
                            </span>
                        </Button>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" type="button" onClick={() => setPrintChoiceModalOpen(false)}>
                        Annuler
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={modalOpen} toggle={fermerModalActivite} size="lg">
                <ModalHeader toggle={fermerModalActivite}>
                    {editingActiviteId == null ? "Nouvelle activité" : "Modifier l'activité"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-date">
                            Date{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <Input
                            id="act-date"
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-moment">
                            Moment (créneau)
                            {momentsTriés.length > 0 ? (
                                <span className={styles.requiredAsterisk} aria-hidden="true">
                                    {" "}
                                    *
                                </span>
                            ) : null}
                        </Label>
                        <Input
                            id="act-moment"
                            type="select"
                            value={formMomentId === "" ? "" : String(formMomentId)}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                    setFormMomentId("");
                                    return;
                                }
                                const n = Number.parseInt(v, 10);
                                setFormMomentId(Number.isNaN(n) ? "" : n);
                            }}
                            disabled={submitting || momentsTriés.length === 0}
                            required={momentsTriés.length > 0}
                        >
                            <option value="">— Choisir un moment —</option>
                            {momentsAplat.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {libelleMomentIndenté(m)}
                                </option>
                            ))}
                        </Input>
                        {momentsTriés.length === 0 ? (
                            <p className={styles.lieuHint}>
                                Aucun moment n&apos;existe pour ce séjour. Demandez à la direction d&apos;en créer au
                                moins un dans la section « Moments » avant de planifier une activité.
                            </p>
                        ) : null}
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-type">
                            Type d&apos;activité{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <Input
                            id="act-type"
                            type="select"
                            value={formTypeActiviteId === "" ? "" : String(formTypeActiviteId)}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                    setFormTypeActiviteId("");
                                    return;
                                }
                                const n = Number.parseInt(v, 10);
                                setFormTypeActiviteId(Number.isNaN(n) ? "" : n);
                            }}
                            disabled={submitting || typesActivite.length === 0}
                            required
                        >
                            <option value="">— Choisir un type —</option>
                            {typesPredefinisSelect.length > 0 ? (
                                <optgroup label="Types par défaut">
                                    {typesPredefinisSelect.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.libelle}
                                        </option>
                                    ))}
                                </optgroup>
                            ) : null}
                            {typesPersoSelect.length > 0 ? (
                                <optgroup label="Types du séjour">
                                    {typesPersoSelect.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.libelle}
                                        </option>
                                    ))}
                                </optgroup>
                            ) : null}
                        </Input>
                        {typesActivite.length === 0 ? (
                            <p className={styles.lieuHint}>
                                Aucun type chargé. Utilisez la section « Types d&apos;activité » du détail séjour.
                            </p>
                        ) : null}
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-nom">
                            Nom{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <Input
                            id="act-nom"
                            type="text"
                            value={formNom}
                            onChange={(e) => setFormNom(e.target.value)}
                            disabled={submitting}
                            maxLength={200}
                            required
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-desc">Description (optionnel)</Label>
                        <Input
                            id="act-desc"
                            type="textarea"
                            rows={1}
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            disabled={submitting}
                            maxLength={5000}
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <div className={styles.lieuHeaderRow}>
                            <Label for="act-lieu">Lieu (optionnel)</Label>
                            <div className={styles.lieuFilterInline}>
                                <Label for="act-lieu-emplacement" className={styles.lieuFilterLabel}>
                                    Filtrer les lieux
                                </Label>
                                <Input
                                    id="act-lieu-emplacement"
                                    type="select"
                                    bsSize="sm"
                                    value={filtreEmplacementLieu}
                                    onChange={(e) =>
                                        setFiltreEmplacementLieu(
                                            e.target.value === EMPLACEMENT_FILTRE_TOUS_ACTIVITE
                                                ? EMPLACEMENT_FILTRE_TOUS_ACTIVITE
                                                : (e.target.value as EmplacementLieu)
                                        )
                                    }
                                    disabled={submitting || lieux.length === 0}
                                    className={styles.lieuFilterSelect}
                                >
                                    <option value={EMPLACEMENT_FILTRE_TOUS_ACTIVITE}>Tous</option>
                                    {EmplacementLieuValues.map((v) => (
                                        <option key={v} value={v}>
                                            {EmplacementLieuLabels[v]}
                                        </option>
                                    ))}
                                </Input>
                            </div>
                        </div>
                        <Input
                            id="act-lieu"
                            type="select"
                            value={formLieuId === "" ? "" : String(formLieuId)}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                    setFormLieuId("");
                                    return;
                                }
                                const n = Number.parseInt(v, 10);
                                setFormLieuId(Number.isNaN(n) ? "" : n);
                            }}
                            disabled={submitting || lieux.length === 0 || lieuxTriés.length === 0}
                        >
                            <option value="">— Aucun lieu —</option>
                            {lieuxTriés.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.nom}
                                </option>
                            ))}
                        </Input>
                        {lieux.length === 0 ? (
                            <p className={styles.lieuHint}>
                                Aucun lieu n&apos;est défini pour ce séjour. Vous pouvez en ajouter dans la section
                                « Lieux ».
                            </p>
                        ) : lieuxTriés.length === 0 ? (
                            <p className={styles.lieuHint}>
                                Aucun lieu ne correspond à ce filtre d&apos;emplacement. Choisissez « Tous les
                                emplacements » ou un autre type.
                            </p>
                        ) : lieuSélectionnéForm ? (
                            <p className={styles.lieuHint}>{resumePartageLieu(lieuSélectionnéForm)}</p>
                        ) : null}
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label>
                            Groupes concernés{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <div className={styles.checkboxGroup}>
                            {groupes.length === 0 ? (
                                <p className={styles.noGroupes}>Aucun groupe sur ce séjour.</p>
                            ) : (
                                <SelectionGroupesParType
                                    groupes={groupes}
                                    isSelected={(id) => selectedGroupeIds.has(id)}
                                    onToggle={toggleGroupeId}
                                    disabled={submitting}
                                    idPrefix="grp"
                                    appearance="inline"
                                />
                            )}
                        </div>
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label>
                            Animateurs (membres de l&apos;équipe du séjour){" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <div className={styles.checkboxGroup}>
                            {equipeTriéeFiltre.map((m) => (
                                <div key={m.tokenId} className={styles.checkboxRow}>
                                    <Input
                                        type="checkbox"
                                        id={`anim-${m.tokenId}`}
                                        checked={selectedTokens.has(m.tokenId)}
                                        onChange={() => toggleToken(m.tokenId)}
                                        disabled={
                                            submitting ||
                                            (estAnimateurRestreintActivites &&
                                                tokenSelf !== "" &&
                                                (m.tokenId ?? "").trim() === tokenSelf)
                                        }
                                    />
                                    <Label for={`anim-${m.tokenId}`} className="mb-0">
                                        {m.prenom} {m.nom}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </FormGroup>
                </ModalBody>
                <PlanningModalFooterFormulaire
                    messageErreur={errorMessage ?? undefined}
                    actions={
                        <>
                            <Button color="secondary" onClick={fermerModalActivite} disabled={submitting}>
                                Annuler
                            </Button>
                            <Button
                                color={editingActiviteId == null ? "success" : "primary"}
                            onClick={handleSubmit}
                            disabled={submitting || conflitActiviteModalOpen}
                        >
                            {submitting ? "Enregistrement…" : editingActiviteId == null ? "Créer" : "Enregistrer"}
                            </Button>
                        </>
                    }
                />
            </Modal>

            <Modal isOpen={conflitActiviteModalOpen} toggle={fermerModalConflitActivite} size="lg">
                <ModalHeader toggle={fermerModalConflitActivite}>
                    Conflit activité / sortie
                </ModalHeader>
                <ModalBody>
                    <p className={styles.conflitIntro}>
                        Pour chaque animateur concerné, une sortie est déjà planifiée sur le même créneau.
                        Choisissez ce qui doit apparaître sur le calendrier.
                    </p>
                    <ul className={styles.conflitListe}>
                        {conflitsActiviteEnCours.map((c) => {
                            const cle = cleNonParticipation(c.tokenId, c.momentId);
                            const choix = choixConflitsActivite.get(cle);
                            const animateur =
                                `${c.animateurPrenom} ${c.animateurNom}`.trim() || "Animateur";
                            const libelleActivite =
                                editingActiviteId == null ? "Créer l'activité" : "Garder l'activité";
                            return (
                                <li key={cle} className={styles.conflitItem}>
                                    <p className={styles.conflitItemTitre}>
                                        {animateur} — {c.momentNom}
                                    </p>
                                    <p className={styles.conflitItemDetail}>
                                        Sortie : <strong>{c.sortieNom}</strong>
                                    </p>
                                    <div className={styles.conflitItemActions}>
                                        <Button
                                            color={choix === "sortie" ? "primary" : "outline-primary"}
                                            size="sm"
                                            disabled={submitting}
                                            onClick={() =>
                                                appliquerChoixConflitActivite(cle, "sortie")
                                            }
                                        >
                                            Afficher la sortie
                                        </Button>{" "}
                                        <Button
                                            color={choix === "activite" ? "secondary" : "outline-secondary"}
                                            size="sm"
                                            disabled={submitting}
                                            onClick={() =>
                                                appliquerChoixConflitActivite(cle, "activite")
                                            }
                                        >
                                            {libelleActivite}
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </ModalBody>
                <ModalFooter className={styles.modalFooterConflit}>
                    {errorMessage ? <p className={styles.modalFooterConflitMessage}>{errorMessage}</p> : <span />}
                    <div>
                        <Button color="secondary" onClick={fermerModalConflitActivite} disabled={submitting}>
                            Annuler
                        </Button>{" "}
                        <Button
                            color="primary"
                            onClick={confirmerResolutionConflitsActivite}
                            disabled={submitting || !tousChoixConflitsActiviteFaits}
                        >
                            {submitting ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal
                isOpen={retirerSortieModalOpen}
                toggle={() => !retirerSortieCalendrierEnCours && setRetirerSortieModalOpen(false)}
            >
                <ModalHeader
                    toggle={() => !retirerSortieCalendrierEnCours && setRetirerSortieModalOpen(false)}
                >
                    Retirer du calendrier
                </ModalHeader>
                <ModalBody>
                    {pendingRetraitSortie ? (
                        <p>
                            {tokenSelf &&
                            pendingRetraitSortie.tokenId.trim() === tokenSelf ? (
                                <>
                                    Vous ne participerez plus à la sortie{" "}
                                    <strong>« {pendingRetraitSortie.sortie.nom} »</strong> pour le créneau{" "}
                                    <strong>{pendingRetraitSortie.moment.nom}</strong>. Elle n&apos;apparaîtra
                                    plus sur votre calendrier.
                                </>
                            ) : (
                                <>
                                    Retirer <strong>{pendingRetraitSortie.animateurLabel}</strong> de la sortie{" "}
                                    <strong>« {pendingRetraitSortie.sortie.nom} »</strong> pour le créneau{" "}
                                    <strong>{pendingRetraitSortie.moment.nom}</strong> ? La sortie restera
                                    planifiée ; l&apos;animateur ne la verra plus sur son calendrier.
                                </>
                            )}
                        </p>
                    ) : null}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => {
                            setRetirerSortieModalOpen(false);
                            setPendingRetraitSortie(null);
                        }}
                        disabled={retirerSortieCalendrierEnCours != null}
                    >
                        Annuler
                    </Button>
                    <Button
                        color="danger"
                        onClick={confirmerRetirerSortieCalendrier}
                        disabled={retirerSortieCalendrierEnCours != null}
                    >
                        {retirerSortieCalendrierEnCours != null ? "Enregistrement…" : "Confirmer"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModalOpen} toggle={() => !deletingActiviteId && setDeleteModalOpen(false)}>
                <ModalHeader toggle={() => !deletingActiviteId && setDeleteModalOpen(false)}>
                    Confirmation de suppression
                </ModalHeader>
                <ModalBody>
                    <p>Voulez-vous vraiment supprimer cette activité ?</p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setPendingDeleteActiviteId(null);
                        }}
                        disabled={deletingActiviteId != null}
                    >
                        Annuler
                    </Button>
                    <Button color="danger" onClick={handleSupprimer} disabled={deletingActiviteId != null}>
                        {deletingActiviteId != null ? "Suppression…" : "Confirmer la suppression"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={successModalOpen} toggle={() => setSuccessModalOpen(false)}>
                <ModalHeader toggle={() => setSuccessModalOpen(false)}>Confirmation</ModalHeader>
                <ModalBody>
                    <p className={styles.successBody}>{successMessage}</p>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setSuccessModalOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <HistoriqueModificationListeModal
                isOpen={historiqueActiviteModalOpen}
                onFermer={fermerHistoriqueActiviteModal}
                titre="Historique de l'activité"
                sousTitre={
                    historiqueActiviteNom.trim() !== "" ? `« ${historiqueActiviteNom} »` : undefined
                }
                chargement={historiqueActiviteChargement}
                erreur={historiqueActiviteErreur}
                lignes={historiqueActiviteLignes}
                formatSnapshots="activite"
            />
        </div>
    );
};

export default ListeActivites;
