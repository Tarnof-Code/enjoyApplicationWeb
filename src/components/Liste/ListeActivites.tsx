import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { ActiviteDto, CreateActiviteRequest, EmplacementLieu, UpdateActiviteRequest } from "../../types/api";
import { EmplacementLieuLabels, EmplacementLieuValues } from "../../enums/EmplacementLieu";
import { sejourActiviteService } from "../../services/sejour-activite.service";
import formaterDate from "../../helpers/formaterDate";
import { trierMomentsChronologiquement } from "../../helpers/trierMomentsChronologiquement";
import styles from "./ListeActivites.module.scss";
import {
    CalendrierFiltresPlanning,
    CalendrierNavigationPeriode,
    CalendrierPlanning,
} from "./ListeActivitesCalendrier";
import { ListeActivitesListeFiltres, ListeActivitesListeResultat } from "./ListeActivitesListe";
import {
    CALENDRIER_FILTRE_AUCUN_ANIMATEUR_TOKEN,
    CALENDRIER_FILTRE_AUCUN_GROUPE_ID,
    type ListeActivitesProps,
} from "./listeActivitesTypes";
import {
    EMPLACEMENT_FILTRE_TOUS_ACTIVITE,
    FILTRE_LISTE_LIEU_SANS,
    NB_JOURS_VUE_CALENDRIER,
    activiteDateToFilterKey,
    activiteDateToInputDate,
    addDaysToYmd,
    bornesDebutFenetreCalendrier,
    groupeIdsReferentsPourToken,
    clampYmdEntre,
    enumererJoursDuSejour,
    libelleJourCourtPourBouton,
    parseYmdVersDateLocale,
    resumePartageLieu,
    sejourChampDateVersInput,
    sejourDebutToInputDate,
    tokensEquipePourFiltreGroupesCalendrier,
    trierLieuxParNom,
    trierTypesParLibelle,
} from "./listeActivitesUtils";

export type { ListeActivitesProps, MembreEquipeSejour } from "./listeActivitesTypes";

type VueActivites = "liste" | "calendrier";

const ListeActivites: React.FC<ListeActivitesProps> = ({
    activites,
    sejour,
    groupes,
    equipe,
    lieux,
    moments,
    typesActivite,
}) => {
    const revalidator = useRevalidator();
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
    const [filtreListeDate, setFiltreListeDate] = useState(() => sejourChampDateVersInput(sejour.dateDebut));
    const [filtreListeLieu, setFiltreListeLieu] = useState("");
    const [filtreListeGroupe, setFiltreListeGroupe] = useState("");
    const [filtreListeAnimateur, setFiltreListeAnimateur] = useState("");
    const [filtreListeType, setFiltreListeType] = useState("");
    const [vueActivites, setVueActivites] = useState<VueActivites>("calendrier");
    const [calendrierDebutYmd, setCalendrierDebutYmd] = useState("");
    /** Filtres vue calendrier : ensemble vide = tout afficher (animateurs / groupes d’activité). */
    const [filtreCalendrierTokens, setFiltreCalendrierTokens] = useState<Set<string>>(() => new Set());
    const [filtreCalendrierGroupeIds, setFiltreCalendrierGroupeIds] = useState<Set<number>>(() => new Set());

    const momentsTriés = trierMomentsChronologiquement(moments);
    const typesPredefinisSelect = useMemo(
        () => typesActivite.filter((t) => t.predefini).sort(trierTypesParLibelle),
        [typesActivite]
    );
    const typesPersoSelect = useMemo(
        () => typesActivite.filter((t) => !t.predefini).sort(trierTypesParLibelle),
        [typesActivite]
    );

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
        } else if (equipe.length === 1) {
            initial.add(equipe[0].tokenId);
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
        setErrorMessage(null);
        setEditingActiviteId(activite.id);
        setFormDate(activiteDateToInputDate(activite.date));
        setFormNom(activite.nom);
        setFormDescription(activite.description ?? "");
        setSelectedGroupeIds(new Set(activite.groupeIds ?? []));
        setSelectedTokens(new Set((activite.membres ?? []).map((m) => m.tokenId)));
        setFormLieuId(activite.lieu?.id ?? "");
        setFormMomentId(activite.moment?.id ?? "");
        setFormTypeActiviteId(activite.typeActivite?.id ?? "");
        setFiltreEmplacementLieu(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);
        setModalOpen(true);
    };

    const toggleToken = (tokenId: string) => {
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
        if (filtreEmplacementLieu === EMPLACEMENT_FILTRE_TOUS_ACTIVITE) return lieux;
        return lieux.filter((l) => l.emplacement === filtreEmplacementLieu);
    }, [lieux, filtreEmplacementLieu]);

    const lieuxTriés = trierLieuxParNom(lieuxFiltrésParEmplacement);
    const lieuSélectionnéForm = formLieuId !== "" ? lieux.find((l) => l.id === formLieuId) : undefined;

    useEffect(() => {
        if (formLieuId === "") return;
        if (!lieuxFiltrésParEmplacement.some((l) => l.id === formLieuId)) {
            setFormLieuId("");
        }
    }, [lieuxFiltrésParEmplacement, formLieuId]);

    const groupesTriésFiltre = useMemo(
        () => [...groupes].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" })),
        [groupes]
    );
    const equipeTriéeFiltre = useMemo(
        () =>
            [...equipe].sort((a, b) => {
                const pa = `${a.prenom} ${a.nom}`.trim();
                const pb = `${b.prenom} ${b.nom}`.trim();
                return pa.localeCompare(pb, undefined, { sensitivity: "base" });
            }),
        [equipe]
    );

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
        return lignes.filter((m) => tokensDuFiltreGroupe.has(m.tokenId));
    }, [
        activites,
        equipeTriéeFiltre,
        filtreCalendrierGroupeIds,
        filtreCalendrierTokens,
        groupes,
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

    useEffect(() => {
        const bornes = bornesDebutFenetreCalendrier(joursDuSejourPourFiltre);
        if (!bornes) {
            setCalendrierDebutYmd("");
            return;
        }
        setCalendrierDebutYmd((prev) => {
            if (!prev) return bornes.minStartYmd;
            return clampYmdEntre(prev, bornes.minStartYmd, bornes.maxStartYmd);
        });
    }, [joursDuSejourPourFiltre]);

    useEffect(() => {
        const jours = enumererJoursDuSejour(sejour);
        setFiltreListeDate(jours[0]?.ymd ?? sejourChampDateVersInput(sejour.dateDebut));
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
        return activites.filter((a) => {
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
    }, [
        activites,
        filtreListeDate,
        filtreListeLieu,
        filtreListeGroupe,
        filtreListeAnimateur,
        filtreListeType,
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

    const bornesFenetreCalendrier = useMemo(
        () => bornesDebutFenetreCalendrier(joursDuSejourPourFiltre),
        [joursDuSejourPourFiltre]
    );

    const debutCalendrierEffectif = useMemo(() => {
        const b = bornesFenetreCalendrier;
        if (!b) return "";
        if (!calendrierDebutYmd) return b.minStartYmd;
        return clampYmdEntre(calendrierDebutYmd, b.minStartYmd, b.maxStartYmd);
    }, [bornesFenetreCalendrier, calendrierDebutYmd]);

    const joursFenetreCalendrier = useMemo(() => {
        if (!debutCalendrierEffectif) return [];
        const sejourSet = new Set(joursDuSejourPourFiltre.map((j) => j.ymd));
        const out: { ymd: string; label: string; dansSejour: boolean }[] = [];
        let ymd: string | null = debutCalendrierEffectif;
        for (let i = 0; i < NB_JOURS_VUE_CALENDRIER; i++) {
            if (!ymd) break;
            const d = parseYmdVersDateLocale(ymd);
            if (!d) break;
            out.push({
                ymd,
                label: libelleJourCourtPourBouton(d),
                dansSejour: sejourSet.has(ymd),
            });
            ymd = addDaysToYmd(ymd, 1);
        }
        return out;
    }, [debutCalendrierEffectif, joursDuSejourPourFiltre]);

    const peutDefilerCalendrierVersPasse =
        bornesFenetreCalendrier != null && debutCalendrierEffectif > bornesFenetreCalendrier.minStartYmd;
    const peutDefilerCalendrierVersFutur =
        bornesFenetreCalendrier != null && debutCalendrierEffectif < bornesFenetreCalendrier.maxStartYmd;

    const libellePlageCalendrier = useMemo(() => {
        if (joursFenetreCalendrier.length === 0) return "";
        const debut = parseYmdVersDateLocale(joursFenetreCalendrier[0].ymd);
        const fin = parseYmdVersDateLocale(
            joursFenetreCalendrier[joursFenetreCalendrier.length - 1].ymd
        );
        if (!debut || !fin) return "";
        return `${formaterDate(debut)} — ${formaterDate(fin)}`;
    }, [joursFenetreCalendrier]);

    const decalageFenetreCalendrier = (delta: number) => {
        if (!bornesFenetreCalendrier) return;
        const b = bornesFenetreCalendrier;
        setCalendrierDebutYmd((prev) => {
            const base = prev ? clampYmdEntre(prev, b.minStartYmd, b.maxStartYmd) : b.minStartYmd;
            const next = addDaysToYmd(base, delta);
            if (!next) return base;
            return clampYmdEntre(next, b.minStartYmd, b.maxStartYmd);
        });
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

    const handleSubmit = async () => {
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

        const payload: CreateActiviteRequest | UpdateActiviteRequest = {
            date: formDate,
            nom: formNom.trim(),
            membreTokenIds: [...selectedTokens],
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

        if (moments.length > 0 && formMomentId !== "") {
            payload.momentId = formMomentId;
        }

        setSubmitting(true);
        try {
            let sauvegardee: ActiviteDto;
            if (editingActiviteId == null) {
                sauvegardee = await sejourActiviteService.creerActivite(
                    sejour.id,
                    payload as CreateActiviteRequest
                );
            } else {
                sauvegardee = await sejourActiviteService.modifierActivite(
                    sejour.id,
                    editingActiviteId,
                    payload as UpdateActiviteRequest
                );
            }
            let messageSuccès =
                editingActiviteId == null ? "Activité créée avec succès." : "Activité modifiée avec succès.";
            const avertissement = sauvegardee.avertissementLieu?.trim();
            if (avertissement) {
                messageSuccès += `\n\n${avertissement}`;
            }
            showSuccessModal(messageSuccès);
            setModalOpen(false);
            setEditingActiviteId(null);
            revalidator.revalidate();
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
            const hdr = document.querySelector("header");
            const headerH = hdr?.getBoundingClientRect().height ?? 0;
            /** floor : évite une fente d’un pixel où le contenu défile entre le header fixe et la barre (ceil créait un écart). */
            if (headerH > 0) {
                root.style.setProperty("--liste-act-site-header", `${Math.floor(headerH)}px`);
            }
            const rootRect = root.getBoundingClientRect();
            root.style.setProperty("--liste-act-pinned-left", `${Math.round(rootRect.left)}px`);
            root.style.setProperty("--liste-act-pinned-width", `${Math.round(rootRect.width)}px`);
            const stackH = stack.getBoundingClientRect().height;
            root.style.setProperty("--liste-act-top-pinned-height", `${Math.ceil(stackH)}px`);
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
        equipePourCalendrier.length,
        activites.length,
    ]);

    return (
        <div ref={listeActivitesRootRef} className={styles.listeActivitesRoot}>
            <div ref={topPinnedStackRef} className={styles.topPinnedStack}>
            <div className={styles.addActiviteRow}>
                <div className={styles.addActiviteRowInner}>
                    {vueActivites !== "calendrier" ? (
                        <Button color="success" onClick={openModal} disabled={!peutAjouterActivite}>
                            Ajouter une activité
                        </Button>
                    ) : null}
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
                    {vueActivites === "calendrier" && joursFenetreCalendrier.length > 0 ? (
                        <CalendrierNavigationPeriode
                            libellePlage={libellePlageCalendrier}
                            peutReculer={peutDefilerCalendrierVersPasse}
                            peutAvancer={peutDefilerCalendrierVersFutur}
                            onReculer={() => decalageFenetreCalendrier(-1)}
                            onAvancer={() => decalageFenetreCalendrier(1)}
                        />
                    ) : null}
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
            {errorMessage && !modalOpen && <div className={styles.errorMessage}>{errorMessage}</div>}

            {vueActivites === "calendrier" && equipe.length > 0 && joursDuSejourPourFiltre.length > 0 ? (
                <CalendrierPlanning
                    joursFenetreCalendrier={joursFenetreCalendrier}
                    equipePourCalendrier={equipePourCalendrier}
                    activitesParAnimateurEtDate={activitesParAnimateurEtDate}
                    libellesGroupesReferentParToken={libellesGroupesReferentParToken}
                    filtreCalendrierGroupeIds={filtreCalendrierGroupeIds}
                    calendrierFiltreExclutTousLesGroupes={calendrierFiltreExclutTousLesGroupes}
                    momentsTriés={momentsTriés}
                    groupes={groupes}
                    peutAjouterActivite={peutAjouterActivite}
                    activitesCount={activites.length}
                    onOpenNouvelleActivite={openModalNouvelleActivite}
                    onOpenEdit={openEditModal}
                    deletingActiviteId={deletingActiviteId}
                />
            ) : (
                <ListeActivitesListeResultat
                    activites={activites}
                    activitesFiltrees={activitesFiltrees}
                    groupes={groupes}
                    deletingActiviteId={deletingActiviteId}
                    onEdit={openEditModal}
                    onDelete={requestDeleteActivite}
                />
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)} size="lg">
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
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
                            {momentsTriés.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.nom}
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
                            rows={3}
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            disabled={submitting}
                            maxLength={5000}
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-lieu-emplacement">Filtrer les lieux par emplacement</Label>
                        <Input
                            id="act-lieu-emplacement"
                            type="select"
                            value={filtreEmplacementLieu}
                            onChange={(e) =>
                                setFiltreEmplacementLieu(
                                    e.target.value === EMPLACEMENT_FILTRE_TOUS_ACTIVITE
                                        ? EMPLACEMENT_FILTRE_TOUS_ACTIVITE
                                        : (e.target.value as EmplacementLieu)
                                )
                            }
                            disabled={submitting || lieux.length === 0}
                        >
                            <option value={EMPLACEMENT_FILTRE_TOUS_ACTIVITE}>Tous les emplacements</option>
                            {EmplacementLieuValues.map((v) => (
                                <option key={v} value={v}>
                                    {EmplacementLieuLabels[v]}
                                </option>
                            ))}
                        </Input>
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-lieu">Lieu (optionnel)</Label>
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
                                groupes.map((g) => (
                                    <div key={g.id} className={styles.checkboxRow}>
                                        <Input
                                            type="checkbox"
                                            id={`grp-${g.id}`}
                                            checked={selectedGroupeIds.has(g.id)}
                                            onChange={() => toggleGroupeId(g.id)}
                                            disabled={submitting}
                                        />
                                        <Label for={`grp-${g.id}`} className="mb-0">
                                            {g.nom}
                                        </Label>
                                    </div>
                                ))
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
                            {equipe.map((m) => (
                                <div key={m.tokenId} className={styles.checkboxRow}>
                                    <Input
                                        type="checkbox"
                                        id={`anim-${m.tokenId}`}
                                        checked={selectedTokens.has(m.tokenId)}
                                        onChange={() => toggleToken(m.tokenId)}
                                        disabled={submitting}
                                    />
                                    <Label for={`anim-${m.tokenId}`} className="mb-0">
                                        {m.prenom} {m.nom}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </FormGroup>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <div className={styles.modalFooterMessage} aria-live="polite">
                        {errorMessage ? <span className={styles.modalFooterError}>{errorMessage}</span> : null}
                    </div>
                    <div className={styles.modalFooterActions}>
                        <Button color="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                            Annuler
                        </Button>
                        <Button
                            color={editingActiviteId == null ? "success" : "primary"}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Enregistrement…" : editingActiviteId == null ? "Créer" : "Enregistrer"}
                        </Button>
                    </div>
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
        </div>
    );
};

export default ListeActivites;
