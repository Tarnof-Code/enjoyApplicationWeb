import { useCallback, useEffect, useMemo, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import type {
    ActiviteDto,
    ActivitePrestataireDto,
    GroupeDto,
    MomentDto,
    NonParticipationPrestataireDto,
    SaveActivitePrestataireRequest,
    SejourDTO,
} from "../../types/api";
import { sejourActiviteService } from "../../services/sejour-activite.service";
import { sejourActivitePrestataireService } from "../../services/sejour-activite-prestataire.service";
import type { ChoixResolutionConflitPrestataire } from "./listeActivitesTypes";
import {
    cleNonParticipation,
    conflitsSansChoixResolution,
    datePrestataireVersYmd,
    estNonParticipation,
    fusionnerNonParticipationsApresChoix,
    lignesParticipationSortieFormulaire,
    idsActivitesInternesASupprimerPourNonParticipations,
    grouperLignesParticipationParAnimateur,
    grouperNonParticipationsParAnimateur,
    libellesNonParticipationsSortie,
    listerConflitsCalendrierPrestataire,
    messageDoublonSortiePrestataire,
    nonParticipationsAjoutees,
    tokensReferentsConcernesParGroupeIds,
    type ConflitCalendrierPrestataire,
} from "./listeActivitesPrestatairesCalendrier";
import { getUserFacingErrorMessage, type AdaptedError } from "../../helpers/axiosError";
import {
    formatDateHeureHistorique,
    formatNomModificateurHistorique,
    libelleActionHistorique,
} from "../../helpers/libelleHistoriqueModification";
import {
    HistoriqueModificationListeModal,
    type HistoriqueModificationListeModalLigne,
} from "../common/HistoriqueModificationListeModal";
import { trierMomentsChronologiquement } from "../../helpers/trierMomentsChronologiquement";
import {
    enumererJoursDuSejour,
    formatActiviteDateForDisplay,
    sejourDebutToInputDate,
} from "./listeActivitesUtils";
import { SelectionGroupesParType } from "./SelectionGroupesParType";
import styles from "./ListeActivitesPrestataires.module.scss";

const HEURE_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

function normaliserHeureChamp(value: string): string | null {
    const t = value.trim();
    if (!t) return null;
    return HEURE_HH_MM.test(t) ? t : null;
}

function formatHeureAffichage(heure: string | null): string | null {
    const t = (heure ?? "").trim();
    return t || null;
}

function normaliserPrestataireDto(p: ActivitePrestataireDto): ActivitePrestataireDto {
    return {
        ...p,
        groupeIds: p.groupeIds ?? [],
        moments: p.moments ?? [],
        nonParticipations: p.nonParticipations ?? [],
    };
}

function elaguerNonParticipations(
    nonParticipations: NonParticipationPrestataireDto[],
    momentIds: Iterable<number>,
    groupes: GroupeDto[],
    groupeIds: number[],
): NonParticipationPrestataireDto[] {
    const idsMoments = new Set(momentIds);
    const referents = tokensReferentsConcernesParGroupeIds(groupes, groupeIds);
    return nonParticipations.filter(
        (np) => idsMoments.has(np.momentId) && referents.has(np.tokenId.trim()),
    );
}

function libelleMoments(moments: MomentDto[]): string {
    const triés = trierMomentsChronologiquement(moments);
    const noms = triés.map((m) => m.nom.trim()).filter(Boolean);
    return noms.length ? noms.join(", ") : "—";
}

function libellePlageHoraire(depart: string | null, retour: string | null): string | null {
    const d = formatHeureAffichage(depart);
    const r = formatHeureAffichage(retour);
    if (d && r) return `${d} – ${r}`;
    if (d) return `Départ ${d}`;
    if (r) return `Retour ${r}`;
    return null;
}

export type ListeActivitesPrestatairesProps = {
    sejour: SejourDTO;
    groupes: GroupeDto[];
    moments: MomentDto[];
    activitesInternes: ActiviteDto[];
    activitesPrestataires: ActivitePrestataireDto[];
    peutGererEcritures: boolean;
};

function ListeActivitesPrestataires({
    sejour,
    groupes,
    moments,
    activitesInternes: activitesInternesProp,
    activitesPrestataires: activitesPrestatairesProp,
    peutGererEcritures,
}: ListeActivitesPrestatairesProps) {
    const revalidator = useRevalidator();
    const [activites, setActivites] = useState<ActivitePrestataireDto[]>(() =>
        activitesPrestatairesProp.map(normaliserPrestataireDto),
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [formNom, setFormNom] = useState("");
    const [formDate, setFormDate] = useState("");
    const [selectedMomentIds, setSelectedMomentIds] = useState<Set<number>>(() => new Set());
    const [formHeureDepart, setFormHeureDepart] = useState("");
    const [formHeureRetour, setFormHeureRetour] = useState("");
    const [formInformations, setFormInformations] = useState("");
    const [formTelephone, setFormTelephone] = useState("");
    const [selectedGroupeIds, setSelectedGroupeIds] = useState<Set<number>>(() => new Set());
    const [formNonParticipations, setFormNonParticipations] = useState<NonParticipationPrestataireDto[]>(
        [],
    );

    const [activitesInternes, setActivitesInternes] = useState<ActiviteDto[]>(activitesInternesProp);
    const [conflitModalOpen, setConflitModalOpen] = useState(false);
    const [conflitsEnCours, setConflitsEnCours] = useState<ConflitCalendrierPrestataire[]>([]);
    const [choixConflits, setChoixConflits] = useState<Map<string, ChoixResolutionConflitPrestataire>>(
        () => new Map(),
    );
    const [pendingPayload, setPendingPayload] = useState<SaveActivitePrestataireRequest | null>(null);
    const [pendingNonParticipations, setPendingNonParticipations] = useState<
        NonParticipationPrestataireDto[]
    >([]);
    /** Non-participations au chargement du formulaire d’édition (référence pour détecter les ajouts). */
    const [nonParticipationsInitiales, setNonParticipationsInitiales] = useState<
        NonParticipationPrestataireDto[]
    >([]);
    const [panelExclureAnimateur, setPanelExclureAnimateur] = useState(false);

    const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
    const [historiqueActivitePrestataireId, setHistoriqueActivitePrestataireId] = useState<number | null>(
        null,
    );
    const [historiqueActivitePrestataireNom, setHistoriqueActivitePrestataireNom] = useState("");
    const [historiqueChargement, setHistoriqueChargement] = useState(false);
    const [historiqueErreur, setHistoriqueErreur] = useState<string | null>(null);
    const [historiqueLignes, setHistoriqueLignes] = useState<HistoriqueModificationListeModalLigne[] | null>(
        null,
    );

    const [filtreDate, setFiltreDate] = useState("");
    const [filtreTexte, setFiltreTexte] = useState("");

    const momentsTriés = useMemo(() => trierMomentsChronologiquement(moments), [moments]);
    const joursDuSejour = useMemo(() => enumererJoursDuSejour(sejour), [sejour.dateDebut, sejour.dateFin]);
    const ymdSet = useMemo(() => new Set(joursDuSejour.map((j) => j.ymd)), [joursDuSejour]);

    useEffect(() => {
        setActivites(activitesPrestatairesProp.map(normaliserPrestataireDto));
    }, [activitesPrestatairesProp]);

    useEffect(() => {
        setActivitesInternes(activitesInternesProp);
    }, [activitesInternesProp]);

    useEffect(() => {
        setFormNonParticipations((prev) =>
            elaguerNonParticipations(prev, selectedMomentIds, groupes, [...selectedGroupeIds]),
        );
    }, [selectedMomentIds, selectedGroupeIds, groupes]);

    const formNonParticipationsElaguees = useMemo(
        () =>
            elaguerNonParticipations(
                formNonParticipations,
                selectedMomentIds,
                groupes,
                [...selectedGroupeIds],
            ),
        [formNonParticipations, selectedMomentIds, selectedGroupeIds, groupes],
    );

    const lignesParticipationSortie = useMemo(
        () =>
            lignesParticipationSortieFormulaire(
                groupes,
                [...selectedGroupeIds],
                selectedMomentIds,
                momentsTriés,
            ),
        [groupes, selectedGroupeIds, selectedMomentIds, momentsTriés],
    );

    const groupesNonParticipantsFormulaire = useMemo(
        () =>
            grouperNonParticipationsParAnimateur(
                formNonParticipationsElaguees,
                groupes,
                momentsTriés,
            ),
        [formNonParticipationsElaguees, groupes, momentsTriés],
    );

    const lignesParticipationEncoreActives = useMemo(
        () =>
            lignesParticipationSortie.filter(
                (l) =>
                    !estNonParticipation(
                        formNonParticipationsElaguees,
                        l.tokenId,
                        l.momentId,
                    ),
            ),
        [lignesParticipationSortie, formNonParticipationsElaguees],
    );

    const groupesParticipationEncoreActives = useMemo(
        () => grouperLignesParticipationParAnimateur(lignesParticipationEncoreActives),
        [lignesParticipationEncoreActives],
    );

    const activitesAffichees = useMemo(() => {
        const iso = filtreDate.trim();
        let filtrées =
            iso !== "" && ymdSet.has(iso)
                ? activites.filter((a) => datePrestataireVersYmd(a.date) === iso)
                : activites;
        const q = filtreTexte.trim().toLowerCase();
        if (q) {
            filtrées = filtrées.filter((a) => {
                const nomsGroupes = (a.groupeIds ?? [])
                    .map((id) => groupes.find((g) => g.id === id)?.nom)
                    .filter(Boolean)
                    .join(" ");
                const haystack = [
                    a.nom,
                    formatActiviteDateForDisplay(a.date as ActiviteDto["date"]),
                    libelleMoments(a.moments ?? []),
                    nomsGroupes,
                    a.telephone,
                    a.informations,
                    libellePlageHoraire(a.heureDepart, a.heureRetour),
                    ...libellesNonParticipationsSortie(a.nonParticipations, groupes, momentsTriés),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(q);
            });
        }
        return [...filtrées].sort((a, b) => {
            const cmp = datePrestataireVersYmd(a.date).localeCompare(datePrestataireVersYmd(b.date));
            if (cmp !== 0) return cmp;
            return a.id - b.id;
        });
    }, [activites, filtreDate, filtreTexte, ymdSet, groupes, momentsTriés]);

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const resetFormulaire = (opts?: { dateYmd?: string }) => {
        setFormNom("");
        setFormDate(opts?.dateYmd ?? sejourDebutToInputDate(sejour.dateDebut));
        setSelectedMomentIds(
            momentsTriés.length === 1 ? new Set([momentsTriés[0].id]) : new Set(),
        );
        setFormHeureDepart("");
        setFormHeureRetour("");
        setFormInformations("");
        setFormTelephone("");
        setSelectedGroupeIds(new Set());
        setFormNonParticipations([]);
        setNonParticipationsInitiales([]);
        setPanelExclureAnimateur(false);
    };

    const openModalNouvelle = () => {
        setErrorMessage(null);
        setEditingId(null);
        resetFormulaire();
        setPanelExclureAnimateur(false);
        setModalOpen(true);
    };

    const openEditModal = (a: ActivitePrestataireDto) => {
        setErrorMessage(null);
        setPanelExclureAnimateur(false);
        setEditingId(a.id);
        setFormNom(a.nom);
        setFormDate(datePrestataireVersYmd(a.date));
        setSelectedMomentIds(new Set((a.moments ?? []).map((m) => m.id)));
        setFormHeureDepart(a.heureDepart ?? "");
        setFormHeureRetour(a.heureRetour ?? "");
        setFormInformations(a.informations ?? "");
        setFormTelephone(a.telephone ?? "");
        setSelectedGroupeIds(new Set(a.groupeIds ?? []));
        const nonPartsInit = a.nonParticipations ?? [];
        setFormNonParticipations(nonPartsInit);
        setNonParticipationsInitiales(nonPartsInit);
        setModalOpen(true);
    };

    const toggleMomentId = (id: number) => {
        setSelectedMomentIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleGroupeId = (id: number) => {
        setSelectedGroupeIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const retirerNonParticipationFormulaire = (tokenId: string, momentId: number) => {
        setFormNonParticipations((prev) =>
            fusionnerNonParticipationsApresChoix(prev, [], [{ tokenId, momentId }]),
        );
    };

    const exclureAnimateurFormulaire = (tokenId: string, momentId: number) => {
        setFormNonParticipations((prev) =>
            fusionnerNonParticipationsApresChoix(prev, [{ tokenId, momentId }], []),
        );
    };

    const buildPayload = (): SaveActivitePrestataireRequest | null => {
        const nom = formNom.trim();
        if (!nom) {
            setErrorMessage("Le nom est obligatoire.");
            return null;
        }
        const date = formDate.trim();
        if (!date || !ymdSet.has(date)) {
            setErrorMessage("Choisissez une date comprise dans la période du séjour.");
            return null;
        }
        if (selectedMomentIds.size === 0) {
            setErrorMessage("Sélectionnez au moins un moment.");
            return null;
        }
        const heureDepartRaw = formHeureDepart.trim();
        const heureRetourRaw = formHeureRetour.trim();
        let heureDepart: string | null = null;
        let heureRetour: string | null = null;
        if (heureDepartRaw) {
            const n = normaliserHeureChamp(heureDepartRaw);
            if (!n) {
                setErrorMessage("Heure de départ invalide (format HH:mm).");
                return null;
            }
            heureDepart = n;
        }
        if (heureRetourRaw) {
            const n = normaliserHeureChamp(heureRetourRaw);
            if (!n) {
                setErrorMessage("Heure de retour invalide (format HH:mm).");
                return null;
            }
            heureRetour = n;
        }
        if (heureDepart && heureRetour && heureDepart >= heureRetour) {
            setErrorMessage("L'heure de retour doit être postérieure à l'heure de départ.");
            return null;
        }
        const informations = formInformations.trim();
        const telephone = formTelephone.trim();
        return {
            nom,
            date,
            momentIds: [...selectedMomentIds].sort((x, y) => x - y),
            heureDepart,
            heureRetour,
            informations: informations || null,
            telephone: telephone || null,
            groupeIds: [...selectedGroupeIds].sort((x, y) => x - y),
        };
    };

    const trierActivites = (liste: ActivitePrestataireDto[]) =>
        [...liste].sort((a, b) => {
            const cmp = datePrestataireVersYmd(a.date).localeCompare(datePrestataireVersYmd(b.date));
            return cmp !== 0 ? cmp : a.id - b.id;
        });

    const executerEnregistrement = async (
        payload: SaveActivitePrestataireRequest,
        nonParticipationsBase: NonParticipationPrestataireDto[],
        resolutions: { conflit: ConflitCalendrierPrestataire; choix: ChoixResolutionConflitPrestataire }[],
        baselineNonParticipations: NonParticipationPrestataireDto[],
    ) => {
        let nonParts = [...nonParticipationsBase];
        const activitesASupprimer = new Set<number>();

        for (const { conflit, choix } of resolutions) {
            if (choix === "sortie") {
                activitesASupprimer.add(conflit.activiteId);
                nonParts = fusionnerNonParticipationsApresChoix(nonParts, [], [
                    { tokenId: conflit.tokenId, momentId: conflit.momentId },
                ]);
            } else {
                nonParts = fusionnerNonParticipationsApresChoix(
                    nonParts,
                    [{ tokenId: conflit.tokenId, momentId: conflit.momentId }],
                    [],
                );
            }
        }

        nonParts = elaguerNonParticipations(
            nonParts,
            payload.momentIds,
            groupes,
            payload.groupeIds ?? [],
        );
        const body: SaveActivitePrestataireRequest = {
            ...payload,
            nonParticipations: nonParts,
        };

        const conserverActiviteInterne = new Set(
            resolutions
                .filter((r) => r.choix === "activite")
                .map((r) => cleNonParticipation(r.conflit.tokenId, r.conflit.momentId)),
        );
        const ajoutees = nonParticipationsAjoutees(baselineNonParticipations, nonParts);
        for (const activiteId of idsActivitesInternesASupprimerPourNonParticipations(
            payload.date,
            ajoutees,
            activitesInternes,
            conserverActiviteInterne,
        )) {
            activitesASupprimer.add(activiteId);
        }

        for (const activiteId of activitesASupprimer) {
            await sejourActiviteService.supprimerActivite(sejour.id, activiteId);
        }
        if (activitesASupprimer.size > 0) {
            setActivitesInternes((prev) => prev.filter((a) => !activitesASupprimer.has(a.id)));
        }

        if (editingId == null) {
            const created = await sejourActivitePrestataireService.creerActivitePrestataire(sejour.id, body);
            setActivites((prev) => trierActivites([...prev, normaliserPrestataireDto(created)]));
            setFormNonParticipations(nonParts);
            showSuccessModal("Sortie / prestataire créée avec succès.");
        } else {
            const updated = await sejourActivitePrestataireService.modifierActivitePrestataire(
                sejour.id,
                editingId,
                body,
            );
            setActivites((prev) =>
                trierActivites(
                    prev.map((x) => (x.id === updated.id ? normaliserPrestataireDto(updated) : x)),
                ),
            );
            setFormNonParticipations(nonParts);
            showSuccessModal("Sortie / prestataire modifiée avec succès.");
            rafraichirHistoriqueSiOuvert(editingId);
        }
        setModalOpen(false);
        setPanelExclureAnimateur(false);
        setConflitModalOpen(false);
        setConflitsEnCours([]);
        setChoixConflits(new Map());
        setPendingPayload(null);
        setEditingId(null);
        revalidator.revalidate();
    };

    const appliquerChoixConflit = (cle: string, choix: ChoixResolutionConflitPrestataire) => {
        setChoixConflits((prev) => {
            const next = new Map(prev);
            next.set(cle, choix);
            return next;
        });
        setErrorMessage(null);
    };

    const tousChoixConflitsFaits = useMemo(
        () =>
            conflitsEnCours.length > 0 &&
            conflitsSansChoixResolution(conflitsEnCours, choixConflits).length === 0,
        [conflitsEnCours, choixConflits],
    );

    const handleSubmit = async () => {
        if (conflitModalOpen) return;

        setErrorMessage(null);
        const payload = buildPayload();
        if (!payload) return;

        const msgDoublon = messageDoublonSortiePrestataire(
            payload,
            activites,
            groupes,
            moments,
            { exclureSortieId: editingId },
        );
        if (msgDoublon) {
            setErrorMessage(msgDoublon);
            return;
        }

        const nonPartsElaguees = elaguerNonParticipations(
            formNonParticipations,
            payload.momentIds,
            groupes,
            payload.groupeIds ?? [],
        );
        const conflits = listerConflitsCalendrierPrestataire(
            {
                date: payload.date,
                momentIds: payload.momentIds,
                groupeIds: payload.groupeIds ?? [],
                nonParticipations: nonPartsElaguees,
            },
            activitesInternes,
            groupes,
            moments,
        );

        if (conflits.length > 0) {
            if (!peutGererEcritures) {
                setErrorMessage(
                    "Conflit avec une activité interne sur le même créneau. La direction doit trancher depuis le calendrier activités ou modifier la sortie.",
                );
                return;
            }
            setPendingPayload(payload);
            setPendingNonParticipations(nonPartsElaguees);
            setConflitsEnCours(conflits);
            setChoixConflits(new Map());
            setErrorMessage(null);
            setConflitModalOpen(true);
            return;
        }

        setSubmitting(true);
        try {
            await executerEnregistrement(
                payload,
                nonPartsElaguees,
                [],
                editingId != null ? nonParticipationsInitiales : [],
            );
        } catch (e: unknown) {
            setErrorMessage(
                getUserFacingErrorMessage(
                    e,
                    editingId == null
                        ? "Impossible de créer la sortie / prestataire"
                        : "Impossible de modifier la sortie / prestataire",
                ),
            );
        } finally {
            setSubmitting(false);
        }
    };

    const confirmerResolutionConflits = async () => {
        if (!pendingPayload) return;
        const manquants = conflitsSansChoixResolution(conflitsEnCours, choixConflits);
        if (manquants.length > 0) {
            setErrorMessage(
                manquants.length === 1
                    ? "Choisissez « Afficher la sortie » ou « Garder l’activité » pour l’animateur restant."
                    : `Choisissez une option pour chaque conflit (${manquants.length} sans réponse).`,
            );
            return;
        }
        setErrorMessage(null);

        const msgDoublon = messageDoublonSortiePrestataire(
            pendingPayload,
            activites,
            groupes,
            moments,
            { exclureSortieId: editingId },
        );
        if (msgDoublon) {
            setErrorMessage(msgDoublon);
            return;
        }

        setSubmitting(true);
        try {
            const resolutions = conflitsEnCours.map((conflit) => ({
                conflit,
                choix: choixConflits.get(cleNonParticipation(conflit.tokenId, conflit.momentId))!,
            }));
            await executerEnregistrement(
                pendingPayload,
                pendingNonParticipations,
                resolutions,
                editingId != null ? nonParticipationsInitiales : [],
            );
        } catch (e: unknown) {
            setErrorMessage(
                getUserFacingErrorMessage(e, "Impossible d’enregistrer après résolution des conflits"),
            );
        } finally {
            setSubmitting(false);
        }
    };

    const requestDelete = (id: number) => {
        setPendingDeleteId(id);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteId == null) return;
        setErrorMessage(null);
        setDeletingId(pendingDeleteId);
        try {
            await sejourActivitePrestataireService.supprimerActivitePrestataire(sejour.id, pendingDeleteId);
            setActivites((prev) => prev.filter((x) => x.id !== pendingDeleteId));
            setDeleteModalOpen(false);
            if (historiqueActivitePrestataireId === pendingDeleteId) {
                fermerHistoriqueActivitePrestataire();
            }
            setPendingDeleteId(null);
            showSuccessModal("Sortie / prestataire supprimée avec succès.");
            revalidator.revalidate();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer la sortie / prestataire";
            setErrorMessage(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const libelleGroupes = (ids: number[]) => {
        if (!ids.length) return "Aucun groupe précisé";
        const noms = ids
            .map((id) => groupes.find((g) => g.id === id)?.nom)
            .filter(Boolean);
        return noms.length ? noms.join(", ") : "—";
    };

    const chargerHistoriqueActivitePrestataire = useCallback(
        async (activitePrestataireId: number) => {
            setHistoriqueChargement(true);
            setHistoriqueErreur(null);
            try {
                const rows = await sejourActivitePrestataireService.getHistoriqueActivitePrestataire(
                    sejour.id,
                    activitePrestataireId,
                );
                setHistoriqueLignes(
                    rows.map((r) => ({
                        id: r.id,
                        quand: formatDateHeureHistorique(r.dateModification),
                        qui: formatNomModificateurHistorique(r.modificateurPrenom, r.modificateurNom),
                        action: libelleActionHistorique(r.action),
                        ancienneValeur: r.ancienneValeur,
                        nouvelleValeur: r.nouvelleValeur,
                    })),
                );
            } catch (err: unknown) {
                const status = (err as AdaptedError).response?.status;
                setHistoriqueErreur(
                    status === 404
                        ? "Sortie introuvable."
                        : getUserFacingErrorMessage(err, "Impossible de charger l'historique."),
                );
                setHistoriqueLignes([]);
            } finally {
                setHistoriqueChargement(false);
            }
        },
        [sejour.id],
    );

    const fermerHistoriqueActivitePrestataire = useCallback(() => {
        setHistoriqueOuvert(false);
        setHistoriqueActivitePrestataireId(null);
        setHistoriqueActivitePrestataireNom("");
        setHistoriqueErreur(null);
        setHistoriqueLignes(null);
        setHistoriqueChargement(false);
    }, []);

    const ouvrirHistoriqueActivitePrestataire = useCallback(
        (a: ActivitePrestataireDto) => {
            setHistoriqueActivitePrestataireId(a.id);
            setHistoriqueActivitePrestataireNom(a.nom);
            setHistoriqueOuvert(true);
            setHistoriqueLignes(null);
            void chargerHistoriqueActivitePrestataire(a.id);
        },
        [chargerHistoriqueActivitePrestataire],
    );

    const rafraichirHistoriqueSiOuvert = useCallback(
        (activitePrestataireId: number) => {
            if (historiqueOuvert && historiqueActivitePrestataireId === activitePrestataireId) {
                void chargerHistoriqueActivitePrestataire(activitePrestataireId);
            }
        },
        [historiqueOuvert, historiqueActivitePrestataireId, chargerHistoriqueActivitePrestataire],
    );

    return (
        <div>
            <div className={styles.actionsRow}>
                {peutGererEcritures ? (
                    <Button color="success" onClick={openModalNouvelle} disabled={momentsTriés.length === 0}>
                        Ajouter une sortie / un prestataire
                    </Button>
                ) : null}
            </div>

            {momentsTriés.length === 0 ? (
                <p className={styles.warningText}>
                    Aucun moment n&apos;existe pour ce séjour. La direction doit en créer au moins un dans le
                    paramétrage avant de planifier des sorties / prestataires.
                </p>
            ) : null}

            {activites.length > 0 ? (
                <div className={styles.filtresRow}>
                    <FormGroup className={`${styles.filtreField} ${styles.filtreFieldRecherche}`}>
                        <Label for="presta-filtre-texte">Filtrer</Label>
                        <Input
                            id="presta-filtre-texte"
                            type="search"
                            value={filtreTexte}
                            onChange={(e) => setFiltreTexte(e.target.value)}
                            placeholder="Nom, groupe, moment…"
                            aria-label="Filtrer les sorties et prestataires"
                        />
                    </FormGroup>
                    <FormGroup className={styles.filtreField}>
                        <Label for="presta-filtre-date">Filtrer par date</Label>
                        <Input
                            id="presta-filtre-date"
                            type="select"
                            value={filtreDate}
                            onChange={(e) => setFiltreDate(e.target.value)}
                        >
                            <option value="">Toutes les dates</option>
                            {joursDuSejour.map((j) => (
                                <option key={j.ymd} value={j.ymd}>
                                    {j.label}
                                </option>
                            ))}
                        </Input>
                    </FormGroup>
                </div>
            ) : null}

            {activites.length === 0 ? (
                <p className={styles.empty}>Rien de planifié pour ce séjour.</p>
            ) : activitesAffichees.length === 0 ? (
                <p className={styles.empty}>Aucune entrée ne correspond aux filtres.</p>
            ) : (
                <div className={styles.list}>
                    {activitesAffichees.map((a) => {
                        const plage = libellePlageHoraire(a.heureDepart, a.heureRetour);
                        const groupesNonParticipants = grouperNonParticipationsParAnimateur(
                            a.nonParticipations ?? [],
                            groupes,
                            momentsTriés,
                        );
                        return (
                            <article key={a.id} className={styles.card}>
                                <div className={styles.cardBody}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.dateBadge}>
                                            {formatActiviteDateForDisplay(a.date as ActiviteDto["date"])}
                                        </span>
                                        <span className={styles.nom}>{a.nom}</span>
                                    </div>
                                    <p className={styles.meta}>
                                        <strong>Moments :</strong> {libelleMoments(a.moments ?? [])}
                                    </p>
                                    {plage ? (
                                        <p className={styles.meta}>
                                            <strong>Horaires :</strong> {plage}
                                        </p>
                                    ) : null}
                                    <p className={styles.meta}>
                                        <strong>Groupes :</strong> {libelleGroupes(a.groupeIds ?? [])}
                                    </p>
                                    {groupesNonParticipants.length > 0 ? (
                                        <div className={styles.metaNonParticipation}>
                                            <strong>Ne participent pas :</strong>
                                            <ul className={styles.cardNonParticipationListe}>
                                                {groupesNonParticipants.map((groupe) => {
                                                    const personne =
                                                        `${groupe.prenom} ${groupe.nom}`.trim() ||
                                                        "Animateur";
                                                    return (
                                                        <li
                                                            key={groupe.tokenId}
                                                            className={styles.cardNonParticipationLigne}
                                                        >
                                                            <span
                                                                className={
                                                                    styles.cardNonParticipationNom
                                                                }
                                                            >
                                                                {personne}
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.cardNonParticipationMoments
                                                                }
                                                            >
                                                                {groupe.moments
                                                                    .map((m) => m.momentNom)
                                                                    .join(", ")}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ) : null}
                                    {a.telephone ? (
                                        <p className={styles.meta}>
                                            <strong>Téléphone :</strong> {a.telephone}
                                        </p>
                                    ) : null}
                                    {a.informations ? (
                                        <p className={styles.informations}>{a.informations}</p>
                                    ) : null}
                                </div>
                                <div className={styles.cardActions}>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        outline
                                        onClick={() => ouvrirHistoriqueActivitePrestataire(a)}
                                        disabled={deletingId === a.id}
                                    >
                                        Historique
                                    </Button>
                                    {peutGererEcritures ? (
                                        <>
                                            <Button
                                                color="primary"
                                                size="sm"
                                                onClick={() => openEditModal(a)}
                                                disabled={deletingId === a.id}
                                            >
                                                Modifier
                                            </Button>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() => requestDelete(a.id)}
                                                disabled={deletingId === a.id}
                                            >
                                                Supprimer
                                            </Button>
                                        </>
                                    ) : null}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                toggle={() => {
                    if (submitting) return;
                    setModalOpen(false);
                    setPanelExclureAnimateur(false);
                }}
                size="lg"
            >
                <ModalHeader
                    toggle={() => {
                        if (submitting) return;
                        setModalOpen(false);
                        setPanelExclureAnimateur(false);
                    }}
                >
                    {editingId == null ? "Nouvelle sortie / un prestataire" : "Modifier la sortie / un prestataire"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="presta-nom">
                            Nom{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <Input
                            id="presta-nom"
                            type="text"
                            value={formNom}
                            onChange={(e) => setFormNom(e.target.value)}
                            disabled={submitting}
                            maxLength={200}
                            required
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="presta-date">
                            Date{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <Input
                            id="presta-date"
                            type="select"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            disabled={submitting || joursDuSejour.length === 0}
                            required
                        >
                            {joursDuSejour.length === 0 ? (
                                <option value="">— Dates indisponibles —</option>
                            ) : (
                                joursDuSejour.map((j) => (
                                    <option key={j.ymd} value={j.ymd}>
                                        {j.label}
                                    </option>
                                ))
                            )}
                        </Input>
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label>
                            Moments{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <div className={styles.checkboxGroup}>
                            {momentsTriés.length === 0 ? (
                                <p className={styles.noGroupes}>Aucun moment sur ce séjour.</p>
                            ) : (
                                momentsTriés.map((m) => (
                                    <div key={m.id} className={styles.checkboxRow}>
                                        <Input
                                            type="checkbox"
                                            id={`presta-moment-${m.id}`}
                                            checked={selectedMomentIds.has(m.id)}
                                            onChange={() => toggleMomentId(m.id)}
                                            disabled={submitting}
                                        />
                                        <Label for={`presta-moment-${m.id}`} className="mb-0">
                                            {m.nom}
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </FormGroup>
                    <div className={styles.modalField}>
                        <FormGroup>
                            <Label for="presta-depart">Heure de départ (optionnel)</Label>
                            <Input
                                id="presta-depart"
                                type="time"
                                value={formHeureDepart}
                                onChange={(e) => setFormHeureDepart(e.target.value)}
                                disabled={submitting}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label for="presta-retour">Heure de retour (optionnel)</Label>
                            <Input
                                id="presta-retour"
                                type="time"
                                value={formHeureRetour}
                                onChange={(e) => setFormHeureRetour(e.target.value)}
                                disabled={submitting}
                            />
                        </FormGroup>
                    </div>
                    <FormGroup className={styles.modalField}>
                        <Label for="presta-tel">Téléphone (optionnel)</Label>
                        <Input
                            id="presta-tel"
                            type="tel"
                            value={formTelephone}
                            onChange={(e) => setFormTelephone(e.target.value)}
                            disabled={submitting}
                            maxLength={30}
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="presta-infos">Informations (optionnel)</Label>
                        <Input
                            id="presta-infos"
                            type="textarea"
                            rows={3}
                            value={formInformations}
                            onChange={(e) => setFormInformations(e.target.value)}
                            disabled={submitting}
                            maxLength={5000}
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label>Groupes concernés (optionnel)</Label>
                        <div className={styles.checkboxGroup}>
                            {groupes.length === 0 ? (
                                <p className={styles.noGroupes}>Aucun groupe sur ce séjour.</p>
                            ) : (
                                <SelectionGroupesParType
                                    groupes={groupes}
                                    isSelected={(id) => selectedGroupeIds.has(id)}
                                    onToggle={toggleGroupeId}
                                    disabled={submitting}
                                    idPrefix="presta-grp"
                                    appearance="inline"
                                />
                            )}
                        </div>
                    </FormGroup>
                    {peutGererEcritures &&
                    (editingId != null || groupesNonParticipantsFormulaire.length > 0) ? (
                        <FormGroup className={styles.modalField}>
                            <Label>Ne participent pas</Label>
                            {groupesNonParticipantsFormulaire.length > 0 ? (
                                <p className={styles.participationHint}>
                                    Décochez un moment pour réintégrer l&apos;animateur sur ce créneau.
                                    Si une activité existe sur le même créneau, elle sera supprimée.
                                </p>
                            ) : null}
                            {groupesNonParticipantsFormulaire.length === 0 ? (
                                <p className={styles.noGroupes}>
                                    Aucun animateur exclu de cette sortie.
                                </p>
                            ) : (
                                <div className={styles.participationListe}>
                                    {groupesNonParticipantsFormulaire.map((groupe) => {
                                        const personne =
                                            `${groupe.prenom} ${groupe.nom}`.trim() || "Animateur";
                                        return (
                                            <div
                                                key={groupe.tokenId}
                                                className={styles.participationAnimateurGroupe}
                                            >
                                                <div className={styles.participationAnimateurNom}>
                                                    {personne}
                                                </div>
                                                <div className={styles.participationMomentsRow}>
                                                    {groupe.moments.map((moment) => {
                                                        const cle = cleNonParticipation(
                                                            groupe.tokenId,
                                                            moment.momentId,
                                                        );
                                                        return (
                                                            <div
                                                                key={cle}
                                                                className={styles.participationMomentCheckbox}
                                                            >
                                                                <Input
                                                                    type="checkbox"
                                                                    id={`presta-np-${cle}`}
                                                                    checked
                                                                    onChange={(e) => {
                                                                        if (!e.target.checked) {
                                                                            retirerNonParticipationFormulaire(
                                                                                groupe.tokenId,
                                                                                moment.momentId,
                                                                            );
                                                                        }
                                                                    }}
                                                                    disabled={submitting}
                                                                />
                                                                <Label
                                                                    for={`presta-np-${cle}`}
                                                                    className="mb-0"
                                                                >
                                                                    {moment.momentNom}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </FormGroup>
                    ) : null}
                    {peutGererEcritures ? (
                        <FormGroup className={styles.modalField}>
                            {selectedGroupeIds.size === 0 || selectedMomentIds.size === 0 ? (
                                <p className={styles.noGroupes}>
                                    Sélectionnez au moins un groupe et un moment pour exclure un
                                    animateur.
                                </p>
                            ) : (
                                <>
                                    <Button
                                        color="outline-primary"
                                        size="sm"
                                        className={styles.exclureAnimateurBtn}
                                        disabled={submitting || lignesParticipationSortie.length === 0}
                                        onClick={() => setPanelExclureAnimateur((v) => !v)}
                                    >
                                        Exclure un animateur
                                    </Button>
                                    {panelExclureAnimateur ? (
                                        lignesParticipationEncoreActives.length === 0 ? (
                                            <p className={styles.noGroupes}>
                                                Tous les animateurs concernés sont déjà exclus.
                                            </p>
                                        ) : (
                                            <div
                                                className={`${styles.checkboxGroup} ${styles.participationCheckboxGroup}`}
                                            >
                                                {groupesParticipationEncoreActives.map((groupe) => {
                                                    const personne =
                                                        `${groupe.prenom} ${groupe.nom}`.trim() ||
                                                        "Animateur";
                                                    return (
                                                        <div
                                                            key={groupe.tokenId}
                                                            className={styles.participationAnimateurGroupe}
                                                        >
                                                            <div className={styles.participationAnimateurNom}>
                                                                {personne}
                                                            </div>
                                                            <div className={styles.participationMomentsRow}>
                                                                {groupe.moments.map((moment) => {
                                                                    const cle = cleNonParticipation(
                                                                        groupe.tokenId,
                                                                        moment.momentId,
                                                                    );
                                                                    return (
                                                                        <div
                                                                            key={cle}
                                                                            className={
                                                                                styles.participationMomentCheckbox
                                                                            }
                                                                        >
                                                                            <Input
                                                                                type="checkbox"
                                                                                id={`presta-excl-${cle}`}
                                                                                checked={false}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        exclureAnimateurFormulaire(
                                                                                            groupe.tokenId,
                                                                                            moment.momentId,
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                disabled={submitting}
                                                                            />
                                                                            <Label
                                                                                for={`presta-excl-${cle}`}
                                                                                className="mb-0"
                                                                            >
                                                                                {moment.momentNom}
                                                                            </Label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : null}
                                </>
                            )}
                        </FormGroup>
                    ) : null}
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    {errorMessage ? <p className={styles.modalFooterMessage}>{errorMessage}</p> : <span />}
                    <div>
                        <Button
                            color="secondary"
                            onClick={() => {
                                setModalOpen(false);
                                setPanelExclureAnimateur(false);
                            }}
                            disabled={submitting}
                        >
                            Annuler
                        </Button>{" "}
                        <Button
                            color={editingId == null ? "success" : "primary"}
                            onClick={handleSubmit}
                            disabled={submitting || conflitModalOpen}
                        >
                            {submitting ? "Enregistrement…" : editingId == null ? "Créer" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal
                isOpen={conflitModalOpen}
                toggle={() => !submitting && setConflitModalOpen(false)}
                size="lg"
            >
                <ModalHeader toggle={() => !submitting && setConflitModalOpen(false)}>
                    Conflits sortie / activité interne
                </ModalHeader>
                <ModalBody>
                    <p className={styles.conflitIntro}>
                        Pour chaque animateur concerné, une activité interne existe déjà sur le même créneau.
                        Choisissez ce qui doit apparaître sur le calendrier.
                    </p>
                    <ul className={styles.conflitListe}>
                        {conflitsEnCours.map((c) => {
                            const cle = cleNonParticipation(c.tokenId, c.momentId);
                            const choix = choixConflits.get(cle);
                            const animateur = `${c.animateurPrenom} ${c.animateurNom}`.trim() || "Animateur";
                            return (
                                <li key={cle} className={styles.conflitItem}>
                                    <p className={styles.conflitItemTitre}>
                                        {animateur} — {c.momentNom}
                                    </p>
                                    <p className={styles.conflitItemDetail}>
                                        Activité interne : <strong>{c.activiteNom}</strong>
                                    </p>
                                    <div className={styles.conflitItemActions}>
                                        <Button
                                            color={choix === "sortie" ? "primary" : "outline-primary"}
                                            size="sm"
                                            disabled={submitting}
                                            onClick={() => appliquerChoixConflit(cle, "sortie")}
                                        >
                                            Afficher la sortie
                                        </Button>{" "}
                                        <Button
                                            color={choix === "activite" ? "secondary" : "outline-secondary"}
                                            size="sm"
                                            disabled={submitting}
                                            onClick={() => appliquerChoixConflit(cle, "activite")}
                                        >
                                            Garder l&apos;activité
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    {errorMessage ? <p className={styles.modalFooterMessage}>{errorMessage}</p> : <span />}
                    <div>
                        <Button
                            color="secondary"
                            onClick={() => setConflitModalOpen(false)}
                            disabled={submitting}
                        >
                            Annuler
                        </Button>{" "}
                        <Button
                            color="primary"
                            onClick={confirmerResolutionConflits}
                            disabled={submitting || !tousChoixConflitsFaits}
                        >
                            {submitting ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModalOpen} toggle={() => deletingId == null && setDeleteModalOpen(false)}>
                <ModalHeader toggle={() => deletingId == null && setDeleteModalOpen(false)}>
                    Confirmer la suppression
                </ModalHeader>
                <ModalBody>Supprimer définitivement cette sortie / prestataire ?</ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={deletingId != null}
                    >
                        Annuler
                    </Button>{" "}
                    <Button color="danger" onClick={handleSupprimer} disabled={deletingId != null}>
                        {deletingId != null ? "Suppression…" : "Supprimer"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={successModalOpen} toggle={() => setSuccessModalOpen(false)}>
                <ModalHeader toggle={() => setSuccessModalOpen(false)}>Succès</ModalHeader>
                <ModalBody>{successMessage}</ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => setSuccessModalOpen(false)}>
                        OK
                    </Button>
                </ModalFooter>
            </Modal>

            <HistoriqueModificationListeModal
                isOpen={historiqueOuvert}
                onFermer={fermerHistoriqueActivitePrestataire}
                titre="Historique de la sortie"
                sousTitre={
                    historiqueActivitePrestataireNom.trim() !== ""
                        ? `« ${historiqueActivitePrestataireNom} »`
                        : undefined
                }
                chargement={historiqueChargement}
                erreur={historiqueErreur}
                lignes={historiqueLignes}
                messageListeVide="Aucune modification enregistrée"
                formatSnapshots="activite_prestataire"
            />
        </div>
    );
}

export default ListeActivitesPrestataires;
