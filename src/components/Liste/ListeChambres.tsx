import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserMinus, faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import ReferentsSelector from "../Forms/ReferentsSelector";
import type { MembreEquipePourChambre } from "../../helpers/chambreOccupantsUtils";
import {
    ChambreDto,
    ChambreOccupantDto,
    EnfantDto,
    GroupeDto,
    SaveChambreRequest,
    TypeChambre,
    GenreChambre,
} from "../../types/api";
import { sejourChambreService } from "../../services/sejour-chambre.service";
import { getUserFacingErrorMessage } from "../../helpers/axiosError";
import {
    formatDateHeureHistorique,
    formatNomModificateurHistorique,
    libelleActionHistorique,
} from "../../helpers/libelleHistoriqueModification";
import {
    HistoriqueModificationListeModal,
    type HistoriqueModificationListeModalLigne,
} from "../common/HistoriqueModificationListeModal";
import { TypeChambreLabels, TypeChambreValues } from "../../enums/TypeChambre";
import { GenreChambreBadgeLabels, GenreChambreLabels, GenreChambreValues } from "../../enums/GenreChambre";
import {
    libelleChambre,
    resumeLocalisation,
    chambreALocalisationRenseignee,
    chambreCorrespondFiltreBatiment,
    chambreCorrespondFiltreCouloir,
    chambreCorrespondFiltreOccupant,
    chambreCorrespondFiltreEtage,
    chambreCorrespondFiltreIdentifiant,
} from "../../helpers/libelleChambre";
import {
    analyserModificationChambreIncompatible,
    enfantsEligiblesPourChambre,
    fusionnerChambreRetourneeDansListe,
    indexerAffectationsOccupants,
    libelleChambreAffectation,
    libelleOccupant,
    libelleRechercheOccupantsChambre,
    membresEligiblesPourChambre,
    modificationChambreBloquee,
    partiesLibelleRechercheOccupantsChambre,
} from "../../helpers/chambreOccupantsUtils";
import { trierEnfantsParNom } from "../../helpers/trierUtilisateurs";
import { trierGroupesParNom } from "../../helpers/groupesParType";
import { GroupesFilterDropdownItems, GroupesSelectOptions } from "./SelectionGroupesParType";
import styles from "./ListeChambres.module.scss";

export interface ListeChambresProps {
    chambres: ChambreDto[];
    sejourId: number;
    enfants?: EnfantDto[];
    groupes?: GroupeDto[];
    equipe?: MembreEquipePourChambre[];
}

const FILTRE_TOUS = "" as const;

type FiltreGroupesSelection = {
    sansGroupe: boolean;
    groupeIds: Set<number>;
};

type FiltresRechercheChambre = {
    identifiant: string;
    batiment: string;
    etage: string;
    couloir: string;
    occupant: string;
};

function filtresRechercheActifs(filtres: FiltresRechercheChambre): boolean {
    return (
        filtres.identifiant.trim() !== "" ||
        filtres.batiment.trim() !== "" ||
        filtres.etage.trim() !== "" ||
        filtres.couloir.trim() !== "" ||
        filtres.occupant.trim() !== ""
    );
}

function filtresGroupesActifs(selection: FiltreGroupesSelection): boolean {
    return selection.sansGroupe || selection.groupeIds.size > 0;
}

function chambreCorrespondFiltreGroupes(chambre: ChambreDto, selection: FiltreGroupesSelection): boolean {
    if (!filtresGroupesActifs(selection)) return true;
    if (chambre.typeChambre !== "ENFANT") return false;

    if (selection.sansGroupe && chambre.groupe?.id == null) return true;
    const gid = chambre.groupe?.id;
    if (gid != null && selection.groupeIds.has(gid)) return true;
    return false;
}

function LabelRechercheOccupantsChambre({ chambre }: { chambre: ChambreDto }) {
    const parties = partiesLibelleRechercheOccupantsChambre(chambre);
    if (parties.kind === "equipe") {
        return (
            <>
                Rechercher <strong>{parties.cible}</strong>
            </>
        );
    }
    if (parties.groupe) {
        return (
            <>
                Rechercher <strong>{parties.cible}</strong> du groupe <strong>{parties.groupe}</strong>
            </>
        );
    }
    return (
        <>
            Rechercher <strong>{parties.cible}</strong>
        </>
    );
}

function parseSelectedReferents(value: string): string[] {
    if (!value.trim()) return [];
    try {
        const arr = JSON.parse(value) as string[];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function filtrerChambres(
    chambres: ChambreDto[],
    typeFiltre: typeof FILTRE_TOUS | TypeChambre,
    genreFiltre: typeof FILTRE_TOUS | GenreChambre,
    recherche: FiltresRechercheChambre,
    groupesFiltre: FiltreGroupesSelection
): { résultat: ChambreDto[]; filtresActifs: boolean } {
    const filtresActifs =
        typeFiltre !== FILTRE_TOUS ||
        genreFiltre !== FILTRE_TOUS ||
        filtresRechercheActifs(recherche) ||
        filtresGroupesActifs(groupesFiltre);

    const résultat = chambres
        .filter((c) => {
            if (typeFiltre !== FILTRE_TOUS && c.typeChambre !== typeFiltre) return false;
            if (genreFiltre !== FILTRE_TOUS && c.genreAutorise !== genreFiltre) return false;
            if (!chambreCorrespondFiltreIdentifiant(c, recherche.identifiant)) return false;
            if (!chambreCorrespondFiltreBatiment(c, recherche.batiment)) return false;
            if (!chambreCorrespondFiltreEtage(c, recherche.etage)) return false;
            if (!chambreCorrespondFiltreCouloir(c, recherche.couloir)) return false;
            if (!chambreCorrespondFiltreOccupant(c, recherche.occupant)) return false;
            if (!chambreCorrespondFiltreGroupes(c, groupesFiltre)) return false;
            return true;
        })
        .sort((a, b) =>
            a.identifiant.trim().localeCompare(b.identifiant.trim(), "fr", { sensitivity: "base" })
        );

    return { résultat, filtresActifs };
}

async function synchroniserReferents(
    sejourId: number,
    chambreId: number,
    referentsActuels: ChambreDto["referents"],
    selectedIds: string[]
) {
    const currentIds = new Set((referentsActuels ?? []).map((r) => r.tokenId));
    const selectedSet = new Set(selectedIds);
    for (const tokenId of selectedSet) {
        if (!currentIds.has(tokenId)) {
            await sejourChambreService.ajouterReferent(sejourId, chambreId, { referentTokenId: tokenId });
        }
    }
    for (const tokenId of currentIds) {
        if (!selectedSet.has(tokenId)) {
            await sejourChambreService.retirerReferent(sejourId, chambreId, tokenId);
        }
    }
}

function ListeChambres({ chambres: chambresLoader, sejourId, enfants = [], groupes = [], equipe = [] }: ListeChambresProps) {
    const [chambres, setChambres] = useState(chambresLoader);

    useEffect(() => {
        setChambres(chambresLoader);
    }, [chambresLoader]);

    const appliquerChambreRetournee = useCallback((chambreMiseAJour: ChambreDto) => {
        setChambres((prev) => fusionnerChambreRetourneeDansListe(prev, chambreMiseAJour));
    }, []);

    const retirerOccupantLocal = useCallback((chambreId: number, occupantId: number) => {
        setChambres((prev) =>
            prev.map((c) =>
                c.id !== chambreId
                    ? c
                    : { ...c, occupants: (c.occupants ?? []).filter((o) => o.id !== occupantId) }
            )
        );
    }, []);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteChambreId, setPendingDeleteChambreId] = useState<number | null>(null);
    const [typeChangeConfirmOpen, setTypeChangeConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingChambre, setEditingChambre] = useState<ChambreDto | null>(null);
    const [deletingChambreId, setDeletingChambreId] = useState<number | null>(null);

    const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
    const [historiqueChambreId, setHistoriqueChambreId] = useState<number | null>(null);
    const [historiqueChambreLibelle, setHistoriqueChambreLibelle] = useState("");
    const [historiqueChargement, setHistoriqueChargement] = useState(false);
    const [historiqueErreur, setHistoriqueErreur] = useState<string | null>(null);
    const [historiqueLignes, setHistoriqueLignes] = useState<HistoriqueModificationListeModalLigne[] | null>(
        null
    );

    const [addOccupantModal, setAddOccupantModal] = useState<ChambreDto | null>(null);
    const [retirerOccupantModal, setRetirerOccupantModal] = useState<{
        chambreId: number;
        occupant: ChambreOccupantDto;
    } | null>(null);
    const [occupantModalError, setOccupantModalError] = useState<string | null>(null);
    const [occupantSubmitting, setOccupantSubmitting] = useState(false);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerSelectedEnfantIds, setPickerSelectedEnfantIds] = useState<Set<number>>(() => new Set());
    const [pickerSelectedMembreIds, setPickerSelectedMembreIds] = useState<Set<string>>(() => new Set());

    const [formTypeChambre, setFormTypeChambre] = useState<TypeChambre>("ENFANT");
    const [formIdentifiant, setFormIdentifiant] = useState("");
    const [formNom, setFormNom] = useState("");
    const [formCapaciteMax, setFormCapaciteMax] = useState("");
    const [formGenreAutorise, setFormGenreAutorise] = useState<GenreChambre>("MIXTE");
    const [formDescription, setFormDescription] = useState("");
    const [formBatiment, setFormBatiment] = useState("");
    const [formCouloir, setFormCouloir] = useState("");
    const [formEtage, setFormEtage] = useState("");
    const [formGroupeId, setFormGroupeId] = useState("");
    const [formReferents, setFormReferents] = useState("[]");

    const [filterType, setFilterType] = useState<typeof FILTRE_TOUS | TypeChambre>(FILTRE_TOUS);
    const [filterGenre, setFilterGenre] = useState<typeof FILTRE_TOUS | GenreChambre>(FILTRE_TOUS);
    const [filterRechercheIdentifiant, setFilterRechercheIdentifiant] = useState("");
    const [filterRechercheBatiment, setFilterRechercheBatiment] = useState("");
    const [filterRechercheEtage, setFilterRechercheEtage] = useState("");
    const [filterRechercheCouloir, setFilterRechercheCouloir] = useState("");
    const [filterRechercheOccupant, setFilterRechercheOccupant] = useState("");
    const [chambresDeplies, setChambresDeplies] = useState<Set<number>>(() => new Set());
    const [filterSansGroupe, setFilterSansGroupe] = useState(false);
    const [filterGroupeIds, setFilterGroupeIds] = useState<Set<number>>(() => new Set());

    const afficherFiltreGroupe = filterType === FILTRE_TOUS || filterType === "ENFANT";

    const selectionFiltreGroupes = useMemo(
        (): FiltreGroupesSelection => ({
            sansGroupe: afficherFiltreGroupe && filterSansGroupe,
            groupeIds: afficherFiltreGroupe ? filterGroupeIds : new Set(),
        }),
        [afficherFiltreGroupe, filterSansGroupe, filterGroupeIds]
    );

    const toggleFilterGroupe = (groupeId: number) => {
        setFilterGroupeIds((prev) => {
            const next = new Set(prev);
            if (next.has(groupeId)) next.delete(groupeId);
            else next.add(groupeId);
            return next;
        });
    };

    const estChambreDeployee = (chambreId: number) => chambresDeplies.has(chambreId);

    const toggleChambreDeployee = (chambreId: number) => {
        setChambresDeplies((prev) => {
            const next = new Set(prev);
            if (next.has(chambreId)) next.delete(chambreId);
            else next.add(chambreId);
            return next;
        });
    };

    const reinitialiserFiltreGroupes = () => {
        setFilterSansGroupe(false);
        setFilterGroupeIds(new Set());
    };

    const groupesPourFiltre = useMemo(() => trierGroupesParNom(groupes), [groupes]);

    const afficherFiltreBatiment = useMemo(
        () => chambres.some((c) => !!c.batiment?.trim()),
        [chambres]
    );
    const afficherFiltreEtage = useMemo(() => chambres.some((c) => c.etage != null), [chambres]);
    const afficherFiltreCouloir = useMemo(
        () => chambres.some((c) => !!c.couloir?.trim()),
        [chambres]
    );

    const filtresRecherche = useMemo(
        (): FiltresRechercheChambre => ({
            identifiant: filterRechercheIdentifiant,
            batiment: filterRechercheBatiment,
            etage: filterRechercheEtage,
            couloir: filterRechercheCouloir,
            occupant: filterRechercheOccupant,
        }),
        [
            filterRechercheIdentifiant,
            filterRechercheBatiment,
            filterRechercheEtage,
            filterRechercheCouloir,
            filterRechercheOccupant,
        ]
    );

    const [filtreGroupePanelOuvert, setFiltreGroupePanelOuvert] = useState(false);
    const filtreGroupeDropdownRef = useRef<HTMLDivElement>(null);

    const libelleResumeFiltreGroupes = useMemo(() => {
        if (!filterSansGroupe && filterGroupeIds.size === 0) return "Tous les groupes";
        const labels: string[] = [];
        if (filterSansGroupe) labels.push("Sans groupe");
        for (const g of groupesPourFiltre) {
            if (filterGroupeIds.has(g.id)) labels.push(g.nom);
        }
        if (labels.length <= 2) return labels.join(", ");
        return `${labels.length} groupes`;
    }, [filterSansGroupe, filterGroupeIds, groupesPourFiltre]);

    useEffect(() => {
        if (!filtreGroupePanelOuvert) return;
        const fermerSiExterieur = (e: MouseEvent) => {
            const cible = e.target as Node;
            if (
                filtreGroupeDropdownRef.current &&
                !filtreGroupeDropdownRef.current.contains(cible)
            ) {
                setFiltreGroupePanelOuvert(false);
            }
        };
        document.addEventListener("mousedown", fermerSiExterieur);
        return () => document.removeEventListener("mousedown", fermerSiExterieur);
    }, [filtreGroupePanelOuvert]);

    const affectationIndex = useMemo(() => indexerAffectationsOccupants(chambres), [chambres]);

    const chargerHistoriqueChambre = useCallback(
        async (chambreId: number) => {
            setHistoriqueChargement(true);
            setHistoriqueErreur(null);
            try {
                const rows = await sejourChambreService.getHistoriqueChambre(sejourId, chambreId);
                setHistoriqueLignes(
                    rows.map((r) => ({
                        id: r.id,
                        quand: formatDateHeureHistorique(r.dateModification),
                        qui: formatNomModificateurHistorique(r.modificateurPrenom, r.modificateurNom),
                        action: libelleActionHistorique(r.action),
                        ancienneValeur: r.ancienneValeur,
                        nouvelleValeur: r.nouvelleValeur,
                    }))
                );
            } catch (err: unknown) {
                setHistoriqueErreur(getUserFacingErrorMessage(err, "Impossible de charger l'historique."));
                setHistoriqueLignes([]);
            } finally {
                setHistoriqueChargement(false);
            }
        },
        [sejourId]
    );

    const fermerHistoriqueChambre = useCallback(() => {
        setHistoriqueOuvert(false);
        setHistoriqueChambreId(null);
        setHistoriqueChambreLibelle("");
        setHistoriqueErreur(null);
        setHistoriqueLignes(null);
        setHistoriqueChargement(false);
    }, []);

    const ouvrirHistoriqueChambre = useCallback(
        (chambre: ChambreDto) => {
            setHistoriqueChambreId(chambre.id);
            setHistoriqueChambreLibelle(libelleChambre(chambre));
            setHistoriqueOuvert(true);
            setHistoriqueLignes(null);
            void chargerHistoriqueChambre(chambre.id);
        },
        [chargerHistoriqueChambre]
    );

    const rafraichirHistoriqueSiOuvert = useCallback(
        (chambreId: number) => {
            if (historiqueOuvert && historiqueChambreId === chambreId) {
                void chargerHistoriqueChambre(chambreId);
            }
        },
        [historiqueOuvert, historiqueChambreId, chargerHistoriqueChambre]
    );

    const openAddOccupantModal = (chambre: ChambreDto) => {
        setOccupantModalError(null);
        setPickerSearch("");
        setPickerSelectedEnfantIds(new Set());
        setPickerSelectedMembreIds(new Set());
        setAddOccupantModal(chambre);
    };

    const dismissAddOccupantModal = () => {
        if (occupantSubmitting) return;
        setAddOccupantModal(null);
        setOccupantModalError(null);
        setPickerSearch("");
        setPickerSelectedEnfantIds(new Set());
        setPickerSelectedMembreIds(new Set());
    };

    const placesRestantesChambre = (chambre: ChambreDto) =>
        Math.max(0, chambre.capaciteMax - (chambre.occupants?.length ?? 0));

    const togglePickerEnfant = (chambre: ChambreDto, enfantId: number) => {
        const max = placesRestantesChambre(chambre);
        setPickerSelectedEnfantIds((prev) => {
            const next = new Set(prev);
            if (next.has(enfantId)) {
                next.delete(enfantId);
                setOccupantModalError(null);
                return next;
            }
            if (next.size >= max) return prev;
            next.add(enfantId);
            setOccupantModalError(null);
            return next;
        });
    };

    const togglePickerMembre = (chambre: ChambreDto, membreTokenId: string) => {
        const tid = membreTokenId.trim();
        const max = placesRestantesChambre(chambre);
        setPickerSelectedMembreIds((prev) => {
            const next = new Set(prev);
            if (next.has(tid)) {
                next.delete(tid);
                setOccupantModalError(null);
                return next;
            }
            if (next.size >= max) return prev;
            next.add(tid);
            setOccupantModalError(null);
            return next;
        });
    };

    const handleAffecterSelection = async () => {
        if (!addOccupantModal) return;
        const chambre = addOccupantModal;
        const placesRestantes = placesRestantesChambre(chambre);
        setOccupantModalError(null);

        if (chambre.typeChambre === "ENFANT") {
            const ids = Array.from(pickerSelectedEnfantIds);
            if (ids.length === 0) {
                setOccupantModalError("Sélectionnez au moins un enfant.");
                return;
            }
            if (ids.length > placesRestantes) {
                setOccupantModalError(
                    `Impossible d'affecter ${ids.length} enfant(s) : il reste ${placesRestantes} place(s) dans cette chambre.`
                );
                return;
            }
            setOccupantSubmitting(true);
            try {
                let chambreMiseAJour: ChambreDto;
                if (ids.length === 1) {
                    chambreMiseAJour = await sejourChambreService.affecterEnfant(sejourId, chambre.id, ids[0]);
                } else {
                    chambreMiseAJour = await sejourChambreService.affecterEnfants(sejourId, chambre.id, {
                        occupants: ids.map((enfantId) => ({ enfantId })),
                    });
                }
                dismissAddOccupantModal();
                appliquerChambreRetournee(chambreMiseAJour);
                rafraichirHistoriqueSiOuvert(chambre.id);
            } catch (e: unknown) {
                setOccupantModalError(
                    e instanceof Error ? e.message : "Impossible d'affecter les enfants sélectionnés"
                );
            } finally {
                setOccupantSubmitting(false);
            }
            return;
        }

        const tokenIds = Array.from(pickerSelectedMembreIds);
        if (tokenIds.length === 0) {
            setOccupantModalError("Sélectionnez au moins un membre d'équipe.");
            return;
        }
        if (tokenIds.length > placesRestantes) {
            setOccupantModalError(
                `Impossible d'affecter ${tokenIds.length} membre(s) : il reste ${placesRestantes} place(s) dans cette chambre.`
            );
            return;
        }
        setOccupantSubmitting(true);
        try {
            let chambreMiseAJour: ChambreDto;
            if (tokenIds.length === 1) {
                chambreMiseAJour = await sejourChambreService.affecterMembreEquipe(sejourId, chambre.id, tokenIds[0]);
            } else {
                chambreMiseAJour = await sejourChambreService.affecterMembresEquipe(sejourId, chambre.id, {
                    occupants: tokenIds.map((membreTokenId) => ({ membreTokenId })),
                });
            }
            dismissAddOccupantModal();
            appliquerChambreRetournee(chambreMiseAJour);
            rafraichirHistoriqueSiOuvert(chambre.id);
        } catch (e: unknown) {
            setOccupantModalError(
                e instanceof Error ? e.message : "Impossible d'affecter les membres sélectionnés"
            );
        } finally {
            setOccupantSubmitting(false);
        }
    };

    const confirmRetirerOccupant = async () => {
        if (!retirerOccupantModal) return;
        const { chambreId, occupant } = retirerOccupantModal;
        setOccupantSubmitting(true);
        setErrorMessage(null);
        try {
            if (occupant.enfantId != null) {
                await sejourChambreService.retirerEnfant(sejourId, chambreId, occupant.enfantId);
            } else if (occupant.membreTokenId?.trim()) {
                await sejourChambreService.retirerMembreEquipe(sejourId, chambreId, occupant.membreTokenId.trim());
            }
            setRetirerOccupantModal(null);
            retirerOccupantLocal(chambreId, occupant.id);
            rafraichirHistoriqueSiOuvert(chambreId);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Impossible de retirer l'occupant");
        } finally {
            setOccupantSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormTypeChambre("ENFANT");
        setFormIdentifiant("");
        setFormNom("");
        setFormCapaciteMax("");
        setFormGenreAutorise("MIXTE");
        setFormDescription("");
        setFormBatiment("");
        setFormCouloir("");
        setFormEtage("");
        setFormGroupeId("");
        setFormReferents("[]");
    };

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const openModal = () => {
        setErrorMessage(null);
        setEditingChambre(null);
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (chambre: ChambreDto) => {
        setErrorMessage(null);
        setEditingChambre(chambre);
        setFormTypeChambre(chambre.typeChambre);
        setFormIdentifiant(chambre.identifiant);
        setFormNom(chambre.nom ?? "");
        setFormCapaciteMax(String(chambre.capaciteMax));
        setFormGenreAutorise(chambre.genreAutorise);
        setFormDescription(chambre.description ?? "");
        setFormBatiment(chambre.batiment ?? "");
        setFormCouloir(chambre.couloir ?? "");
        setFormEtage(chambre.etage != null ? String(chambre.etage) : "");
        setFormGroupeId(chambre.groupe?.id != null ? String(chambre.groupe.id) : "");
        setFormReferents(JSON.stringify((chambre.referents ?? []).map((r) => r.tokenId)));
        setModalOpen(true);
    };

    const buildPayload = (): SaveChambreRequest | null => {
        const identifiant = formIdentifiant.trim();
        if (!identifiant) {
            setErrorMessage("L'identifiant de la chambre est obligatoire.");
            return null;
        }
        if (identifiant.length > 50) {
            setErrorMessage("L'identifiant ne doit pas dépasser 50 caractères.");
            return null;
        }
        const rawCap = formCapaciteMax.trim();
        const capaciteMax = Number.parseInt(rawCap, 10);
        if (!rawCap || Number.isNaN(capaciteMax) || capaciteMax < 1) {
            setErrorMessage("La capacité maximale doit être un entier supérieur à 0.");
            return null;
        }
        const nomTrim = formNom.trim();
        if (nomTrim.length > 150) {
            setErrorMessage("Le nom ne doit pas dépasser 150 caractères.");
            return null;
        }
        const descTrim = formDescription.trim();
        if (descTrim.length > 2000) {
            setErrorMessage("Les remarques ne doivent pas dépasser 2000 caractères.");
            return null;
        }
        const batTrim = formBatiment.trim();
        if (batTrim.length > 100) {
            setErrorMessage("Le bâtiment ne doit pas dépasser 100 caractères.");
            return null;
        }
        const couloirTrim = formCouloir.trim();
        if (couloirTrim.length > 100) {
            setErrorMessage("Le couloir ne doit pas dépasser 100 caractères.");
            return null;
        }
        let etage: number | null = null;
        const rawEtage = formEtage.trim();
        if (rawEtage !== "") {
            const e = Number.parseInt(rawEtage, 10);
            if (Number.isNaN(e)) {
                setErrorMessage("L'étage doit être un entier (0 = RDC).");
                return null;
            }
            etage = e;
        }
        const payload: SaveChambreRequest = {
            typeChambre: formTypeChambre,
            identifiant,
            nom: nomTrim || null,
            capaciteMax,
            genreAutorise: formGenreAutorise,
            description: descTrim || null,
            batiment: batTrim || null,
            couloir: couloirTrim || null,
            etage,
        };
        if (formTypeChambre === "ENFANT") {
            const rawGroupe = formGroupeId.trim();
            if (rawGroupe === "") {
                payload.groupeId = null;
            } else {
                const gid = Number.parseInt(rawGroupe, 10);
                if (Number.isNaN(gid)) {
                    setErrorMessage("Le groupe sélectionné est invalide.");
                    return null;
                }
                payload.groupeId = gid;
            }
        }
        return payload;
    };

    const doitConfirmerChangementType = (): boolean => {
        if (!editingChambre) return false;
        return (
            editingChambre.typeChambre === "ENFANT" &&
            formTypeChambre === "EQUIPE" &&
            (editingChambre.referents?.length ?? 0) > 0
        );
    };

    const executerEnregistrement = async (payload: SaveChambreRequest) => {
        const selectedReferentIds =
            formTypeChambre === "ENFANT" ? parseSelectedReferents(formReferents) : [];

        if (editingChambre == null) {
            const created = await sejourChambreService.creerChambre(sejourId, payload);
            if (formTypeChambre === "ENFANT" && selectedReferentIds.length > 0) {
                await synchroniserReferents(sejourId, created.id, [], selectedReferentIds);
            }
            const fresh =
                formTypeChambre === "ENFANT" && selectedReferentIds.length > 0
                    ? await sejourChambreService.getChambreById(sejourId, created.id)
                    : created;
            appliquerChambreRetournee(fresh);
            showSuccessModal("Chambre créée avec succès.");
        } else {
            const updated = await sejourChambreService.modifierChambre(sejourId, editingChambre.id, payload);
            if (formTypeChambre === "ENFANT") {
                await synchroniserReferents(
                    sejourId,
                    editingChambre.id,
                    editingChambre.referents ?? [],
                    selectedReferentIds
                );
            }
            const fresh =
                formTypeChambre === "ENFANT"
                    ? await sejourChambreService.getChambreById(sejourId, editingChambre.id)
                    : updated;
            appliquerChambreRetournee(fresh);
            showSuccessModal("Chambre modifiée avec succès.");
            rafraichirHistoriqueSiOuvert(editingChambre.id);
        }
        setModalOpen(false);
        setEditingChambre(null);
        setTypeChangeConfirmOpen(false);
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const payload = buildPayload();
        if (!payload) return;

        if (doitConfirmerChangementType()) {
            setTypeChangeConfirmOpen(true);
            return;
        }

        if (editingChambre) {
            const erreursOccupants = analyserModificationChambreIncompatible(
                editingChambre,
                payload,
                groupes,
                enfants,
                equipe
            );
            if (modificationChambreBloquee(erreursOccupants)) {
                return;
            }
        }

        setSubmitting(true);
        try {
            await executerEnregistrement(payload);
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingChambre == null
                      ? "Impossible de créer la chambre"
                      : "Impossible de modifier la chambre";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmerChangementTypeEtEnregistrer = async () => {
        const payload = buildPayload();
        if (!payload) {
            setTypeChangeConfirmOpen(false);
            return;
        }
        setSubmitting(true);
        setErrorMessage(null);
        try {
            await executerEnregistrement(payload);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de modifier la chambre";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const requestDeleteChambre = (chambreId: number) => {
        setPendingDeleteChambreId(chambreId);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteChambreId == null) return;
        const chambreId = pendingDeleteChambreId;
        setErrorMessage(null);
        setDeletingChambreId(chambreId);
        try {
            await sejourChambreService.supprimerChambre(sejourId, chambreId);
            setDeleteModalOpen(false);
            setPendingDeleteChambreId(null);
            showSuccessModal("Chambre supprimée avec succès.");
            setChambres((prev) => prev.filter((c) => c.id !== chambreId));
            if (historiqueChambreId === chambreId) {
                fermerHistoriqueChambre();
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer la chambre";
            setErrorMessage(msg);
        } finally {
            setDeletingChambreId(null);
        }
    };

    const { résultat: chambresFiltrées, filtresActifs } = filtrerChambres(
        chambres,
        filterType,
        filterGenre,
        filtresRecherche,
        selectionFiltreGroupes
    );

    const réinitialiserFiltres = () => {
        setFilterType(FILTRE_TOUS);
        setFilterGenre(FILTRE_TOUS);
        setFilterRechercheIdentifiant("");
        setFilterRechercheBatiment("");
        setFilterRechercheEtage("");
        setFilterRechercheCouloir("");
        setFilterRechercheOccupant("");
        reinitialiserFiltreGroupes();
    };

    const erreursModificationChambre = useMemo(() => {
        if (!editingChambre || !modalOpen) return {};
        const rawCap = formCapaciteMax.trim();
        const capaciteMax = Number.parseInt(rawCap, 10);
        if (!rawCap || Number.isNaN(capaciteMax) || capaciteMax < 1) return {};

        let groupeId: number | null = null;
        if (formTypeChambre === "ENFANT") {
            const rawGroupe = formGroupeId.trim();
            if (rawGroupe !== "") {
                const gid = Number.parseInt(rawGroupe, 10);
                if (!Number.isNaN(gid)) groupeId = gid;
            }
        }

        return analyserModificationChambreIncompatible(
            editingChambre,
            {
                typeChambre: formTypeChambre,
                capaciteMax,
                genreAutorise: formGenreAutorise,
                groupeId: formTypeChambre === "ENFANT" ? groupeId : undefined,
            },
            groupes,
            enfants,
            equipe
        );
    }, [
        editingChambre,
        modalOpen,
        formCapaciteMax,
        formGenreAutorise,
        formGroupeId,
        formTypeChambre,
        groupes,
        enfants,
        equipe,
    ]);

    const modificationChambreInvalide = modificationChambreBloquee(erreursModificationChambre);

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openModal}>
                    Ajouter une chambre
                </Button>
            </div>

            {chambres.length > 0 ? (
                <div className={styles.filtersBar}>
                    <div className={styles.filterField}>
                        <Label for="filtre-type-chambre" className={styles.filterLabel}>
                            Type
                        </Label>
                        <Input
                            id="filtre-type-chambre"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            value={filterType}
                            onChange={(e) => {
                                const next = e.target.value as typeof FILTRE_TOUS | TypeChambre;
                                setFilterType(next);
                                if (next === "EQUIPE") {
                                    reinitialiserFiltreGroupes();
                                    setFiltreGroupePanelOuvert(false);
                                }
                            }}
                        >
                            <option value={FILTRE_TOUS}>Tous les types</option>
                            {TypeChambreValues.map((v) => (
                                <option key={v} value={v}>
                                    {TypeChambreLabels[v]}
                                </option>
                            ))}
                        </Input>
                    </div>
                    <div className={styles.filterField}>
                        <Label for="filtre-genre-chambre" className={styles.filterLabel}>
                            Genre
                        </Label>
                        <Input
                            id="filtre-genre-chambre"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            value={filterGenre}
                            onChange={(e) => setFilterGenre(e.target.value as typeof FILTRE_TOUS | GenreChambre)}
                        >
                            <option value={FILTRE_TOUS}>Tous</option>
                            {GenreChambreValues.map((v) => (
                                <option key={v} value={v}>
                                    {GenreChambreLabels[v]}
                                </option>
                            ))}
                        </Input>
                    </div>
                    {afficherFiltreGroupe ? (
                        <div className={styles.filterField}>
                            <Label for="filtre-groupe-chambre-btn" className={styles.filterLabel}>
                                Groupe
                            </Label>
                            <div ref={filtreGroupeDropdownRef} className={styles.filterDropdown}>
                                <button
                                    type="button"
                                    id="filtre-groupe-chambre-btn"
                                    className={styles.filterDropdownBtn}
                                    aria-haspopup="listbox"
                                    aria-expanded={filtreGroupePanelOuvert}
                                    aria-label={`Groupes : ${libelleResumeFiltreGroupes}`}
                                    onClick={() => setFiltreGroupePanelOuvert((v) => !v)}
                                >
                                    <span className={styles.filterDropdownBtnText}>
                                        {libelleResumeFiltreGroupes}
                                    </span>
                                    <span className={styles.filterDropdownChevron} aria-hidden>
                                        &#9660;
                                    </span>
                                </button>
                                {filtreGroupePanelOuvert ? (
                                    <div
                                        className={styles.filterDropdownPanel}
                                        role="listbox"
                                        aria-multiselectable="true"
                                        aria-label="Filtrer par groupes"
                                    >
                                        <div className={styles.filterDropdownBulk}>
                                            <Button
                                                type="button"
                                                color="link"
                                                size="sm"
                                                className={styles.filterDropdownBulkBtn}
                                                onClick={reinitialiserFiltreGroupes}
                                            >
                                                Tout désélectionner
                                            </Button>
                                        </div>
                                        <label className={styles.filterDropdownItem}>
                                            <Input
                                                type="checkbox"
                                                className={styles.filterDropdownCheckbox}
                                                checked={filterSansGroupe}
                                                onChange={() => setFilterSansGroupe((v) => !v)}
                                            />
                                            <span className={styles.filterDropdownItemLabel}>Sans groupe</span>
                                        </label>
                                        <GroupesFilterDropdownItems
                                            groupes={groupesPourFiltre}
                                            isSelected={(id) => filterGroupeIds.has(id)}
                                            onToggle={toggleFilterGroupe}
                                            itemClassName={styles.filterDropdownItem}
                                            checkboxClassName={styles.filterDropdownCheckbox}
                                            labelClassName={styles.filterDropdownItemLabel}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                    <div className={styles.filterField}>
                        <Label for="filtre-recherche-identifiant-chambre" className={styles.filterLabel}>
                            Chambre
                        </Label>
                        <Input
                            id="filtre-recherche-identifiant-chambre"
                            type="search"
                            bsSize="sm"
                            className={styles.filterInput}
                            value={filterRechercheIdentifiant}
                            onChange={(e) => setFilterRechercheIdentifiant(e.target.value)}
                            placeholder="Identifiant ou nom…"
                        />
                    </div>
                    {afficherFiltreBatiment ? (
                        <div className={styles.filterField}>
                            <Label for="filtre-recherche-batiment-chambre" className={styles.filterLabel}>
                                Bâtiment
                            </Label>
                            <Input
                                id="filtre-recherche-batiment-chambre"
                                type="search"
                                bsSize="sm"
                                className={styles.filterInput}
                                value={filterRechercheBatiment}
                                onChange={(e) => setFilterRechercheBatiment(e.target.value)}
                                placeholder="Bâtiment…"
                            />
                        </div>
                    ) : null}
                    {afficherFiltreEtage ? (
                        <div className={styles.filterField}>
                            <Label for="filtre-recherche-etage-chambre" className={styles.filterLabel}>
                                Étage
                            </Label>
                            <Input
                                id="filtre-recherche-etage-chambre"
                                type="search"
                                bsSize="sm"
                                className={styles.filterInput}
                                value={filterRechercheEtage}
                                onChange={(e) => setFilterRechercheEtage(e.target.value)}
                                placeholder="Étage ou RDC…"
                            />
                        </div>
                    ) : null}
                    {afficherFiltreCouloir ? (
                        <div className={styles.filterField}>
                            <Label for="filtre-recherche-couloir-chambre" className={styles.filterLabel}>
                                Couloir
                            </Label>
                            <Input
                                id="filtre-recherche-couloir-chambre"
                                type="search"
                                bsSize="sm"
                                className={styles.filterInput}
                                value={filterRechercheCouloir}
                                onChange={(e) => setFilterRechercheCouloir(e.target.value)}
                                placeholder="Couloir…"
                            />
                        </div>
                    ) : null}
                    <div className={styles.filterField}>
                        <Label for="filtre-recherche-occupant-chambre" className={styles.filterLabel}>
                            Occupant
                        </Label>
                        <Input
                            id="filtre-recherche-occupant-chambre"
                            type="search"
                            bsSize="sm"
                            className={styles.filterInput}
                            value={filterRechercheOccupant}
                            onChange={(e) => setFilterRechercheOccupant(e.target.value)}
                            placeholder="Enfant ou adulte…"
                        />
                    </div>
                    {filtresActifs ? (
                        <p className={styles.filterMeta}>
                            {chambresFiltrées.length} chambre{chambresFiltrées.length !== 1 ? "s" : ""} sur{" "}
                            {chambres.length}
                        </p>
                    ) : null}
                    {filtresActifs ? (
                        <Button
                            type="button"
                            color="link"
                            size="sm"
                            className={styles.filterReset}
                            onClick={réinitialiserFiltres}
                        >
                            Réinitialiser les filtres
                        </Button>
                    ) : null}
                </div>
            ) : null}

            {errorMessage && !modalOpen && !typeChangeConfirmOpen ? (
                <div className={styles.errorMessage}>{errorMessage}</div>
            ) : null}

            {chambres.length === 0 ? (
                <p className={styles.empty}>
                    Aucune chambre enregistrée pour ce séjour. Cliquez sur « Ajouter une chambre » pour commencer.
                </p>
            ) : chambresFiltrées.length === 0 ? (
                <p className={styles.empty}>Aucune chambre ne correspond aux filtres sélectionnés.</p>
            ) : (
                <div className={styles.list}>
                    {chambresFiltrées.map((chambre) => {
                        const nbOccupants = chambre.occupants?.length ?? 0;
                        const chambrePleine = nbOccupants >= chambre.capaciteMax;
                        const ratioOccupation =
                            chambre.capaciteMax > 0
                                ? Math.min(100, (nbOccupants / chambre.capaciteMax) * 100)
                                : 0;

                        return (
                        <article key={chambre.id} className={styles.card}>
                            <button
                                type="button"
                                className={styles.cardSummary}
                                onClick={() => toggleChambreDeployee(chambre.id)}
                                aria-expanded={estChambreDeployee(chambre.id)}
                                aria-controls={`chambre-details-${chambre.id}`}
                                aria-label={
                                    estChambreDeployee(chambre.id)
                                        ? `Masquer les détails de la chambre ${chambre.identifiant.trim()}`
                                        : `Afficher les détails de la chambre ${chambre.identifiant.trim()}`
                                }
                            >
                                <div className={styles.cardSummaryContent}>
                                    <div className={styles.cardTitleRow}>
                                        <span className={styles.identifiant}>{chambre.identifiant.trim()}</span>
                                        {chambre.nom?.trim() ? (
                                            <span className={styles.nomChambre}>{chambre.nom.trim()}</span>
                                        ) : null}
                                    </div>
                                    <div className={styles.cardBadgesRow}>
                                        <span className={styles.typeBadge}>{TypeChambreLabels[chambre.typeChambre]}</span>
                                        {chambre.typeChambre === "ENFANT" && chambre.groupe?.libelle?.trim() ? (
                                            <span className={styles.groupeBadge}>{chambre.groupe.libelle.trim()}</span>
                                        ) : null}
                                        <span className={styles.genreBadge}>
                                            {GenreChambreBadgeLabels[chambre.genreAutorise]}
                                        </span>
                                        <div
                                            className={`${styles.capacityGauge} ${styles.capacityGaugeHeader}`}
                                            role="meter"
                                            aria-valuenow={nbOccupants}
                                            aria-valuemin={0}
                                            aria-valuemax={chambre.capaciteMax}
                                            aria-label={`${nbOccupants} occupant(s) sur ${chambre.capaciteMax}`}
                                        >
                                            <div className={styles.capacityGaugeTrack}>
                                                <div
                                                    className={`${styles.capacityGaugeFill} ${chambrePleine ? styles.capacityGaugeFillFull : ""}`}
                                                    style={{ width: `${ratioOccupation}%` }}
                                                />
                                            </div>
                                            <span className={styles.capacityGaugeLabel}>
                                                {nbOccupants} / {chambre.capaciteMax}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className={styles.cardExpandControl} aria-hidden>
                                    <FontAwesomeIcon
                                        icon={estChambreDeployee(chambre.id) ? faChevronDown : faChevronRight}
                                        className={styles.cardExpandIcon}
                                    />
                                </span>
                            </button>
                            {estChambreDeployee(chambre.id) ? (
                            <div id={`chambre-details-${chambre.id}`} className={styles.cardBody}>
                            {chambreALocalisationRenseignee(chambre) ? (
                                <div className={styles.meta}>
                                    <strong>Localisation :</strong> {resumeLocalisation(chambre)}
                                </div>
                            ) : null}
                            {chambre.description?.trim() ? (
                                <div className={styles.meta}>
                                    <strong>Remarques :</strong> {chambre.description.trim()}
                                </div>
                            ) : null}
                            {chambre.typeChambre === "ENFANT" && (chambre.referents?.length ?? 0) > 0 ? (
                                <div className={styles.referentsRow}>
                                    <span className={styles.referentsLabel}>Référents : </span>
                                    {chambre.referents!.map((r) => `${r.prenom} ${r.nom}`).join(", ")}
                                </div>
                            ) : null}
                            <div className={styles.occupantsSection}>
                                <div className={styles.occupantsHeader}>
                                    <span className={styles.occupantsTitle}>Occupants</span>
                                    {!chambrePleine ? (
                                        <Button
                                            color="success"
                                            size="sm"
                                            onClick={() => openAddOccupantModal(chambre)}
                                            disabled={deletingChambreId === chambre.id}
                                        >
                                            Affecter
                                        </Button>
                                    ) : null}
                                </div>
                                {(chambre.occupants?.length ?? 0) === 0 ? (
                                    <p className={styles.occupantsEmpty}>Aucun occupant affecté.</p>
                                ) : (
                                    <ul className={styles.occupantsList}>
                                        {(chambre.occupants ?? []).map((occupant) => (
                                            <li key={occupant.id} className={styles.occupantItem}>
                                                <Button
                                                    color="danger"
                                                    size="sm"
                                                    outline
                                                    className={styles.retirerOccupantBtn}
                                                    title="Retirer"
                                                    aria-label={`Retirer ${libelleOccupant(occupant)}`}
                                                    onClick={() =>
                                                        setRetirerOccupantModal({
                                                            chambreId: chambre.id,
                                                            occupant,
                                                        })
                                                    }
                                                    disabled={occupantSubmitting}
                                                >
                                                    <FontAwesomeIcon icon={faUserMinus} aria-hidden />
                                                </Button>
                                                <span>{libelleOccupant(occupant)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className={styles.cardActions}>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    onClick={() => ouvrirHistoriqueChambre(chambre)}
                                    disabled={deletingChambreId === chambre.id}
                                >
                                    Historique
                                </Button>
                                <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => openEditModal(chambre)}
                                    disabled={deletingChambreId === chambre.id}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => requestDeleteChambre(chambre.id)}
                                    disabled={deletingChambreId === chambre.id}
                                >
                                    {deletingChambreId === chambre.id ? "Suppression…" : "Supprimer"}
                                </Button>
                            </div>
                            </div>
                            ) : null}
                        </article>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)} size="lg">
                        <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                            {editingChambre == null ? "Nouvelle chambre" : "Modifier la chambre"}
                        </ModalHeader>
                        <ModalBody>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-type">Type de chambre</Label>
                                <Input
                                    id="chambre-type"
                                    type="select"
                                    value={formTypeChambre}
                                    onChange={(e) => {
                                        const next = e.target.value as TypeChambre;
                                        setFormTypeChambre(next);
                                        if (next === "EQUIPE") {
                                            setFormReferents("[]");
                                            setFormGroupeId("");
                                        }
                                    }}
                                    disabled={submitting}
                                >
                                    {TypeChambreValues.map((v) => (
                                        <option key={v} value={v}>
                                            {TypeChambreLabels[v]}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-identifiant">
                                    Identifiant <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    id="chambre-identifiant"
                                    type="text"
                                    value={formIdentifiant}
                                    onChange={(e) => setFormIdentifiant(e.target.value)}
                                    disabled={submitting}
                                    maxLength={50}
                                    required
                                    placeholder='Ex. "12", "101", "Foyer"'
                                />
                                <p className={styles.hint}>
                                    Numéro ou nom officiel dans le centre — unique pour ce séjour.
                                </p>
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-nom">Nom (optionnel)</Label>
                                <Input
                                    id="chambre-nom"
                                    type="text"
                                    value={formNom}
                                    onChange={(e) => setFormNom(e.target.value)}
                                    disabled={submitting}
                                    maxLength={150}
                                    placeholder='Ex. "Les copains"'
                                />
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-capacite">
                                    Capacité maximale (lits) <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    id="chambre-capacite"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={formCapaciteMax}
                                    onChange={(e) => setFormCapaciteMax(e.target.value)}
                                    disabled={submitting}
                                    required
                                    invalid={!!erreursModificationChambre.capaciteMax}
                                />
                                {erreursModificationChambre.capaciteMax ? (
                                    <p className={styles.fieldError} role="alert">
                                        {erreursModificationChambre.capaciteMax}
                                    </p>
                                ) : null}
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-genre">Genre autorisé</Label>
                                <Input
                                    id="chambre-genre"
                                    type="select"
                                    value={formGenreAutorise}
                                    onChange={(e) => setFormGenreAutorise(e.target.value as GenreChambre)}
                                    disabled={submitting}
                                    invalid={!!erreursModificationChambre.genreAutorise}
                                >
                                    {GenreChambreValues.map((v) => (
                                        <option key={v} value={v}>
                                            {GenreChambreLabels[v]}
                                        </option>
                                    ))}
                                </Input>
                                {erreursModificationChambre.genreAutorise ? (
                                    <p className={styles.fieldError} role="alert">
                                        {erreursModificationChambre.genreAutorise}
                                    </p>
                                ) : null}
                            </FormGroup>
                            {formTypeChambre === "ENFANT" ? (
                                <FormGroup className={styles.modalField}>
                                    <Label for="chambre-groupe">Groupe (optionnel)</Label>
                                    <Input
                                        id="chambre-groupe"
                                        type="select"
                                        value={formGroupeId}
                                        onChange={(e) => setFormGroupeId(e.target.value)}
                                        disabled={submitting || groupes.length === 0}
                                        invalid={!!erreursModificationChambre.groupeId}
                                    >
                                        <option value="">Aucun — tous les enfants du séjour</option>
                                        <GroupesSelectOptions groupes={groupes} />
                                    </Input>
                                    {erreursModificationChambre.groupeId ? (
                                        <p className={styles.fieldError} role="alert">
                                            {erreursModificationChambre.groupeId}
                                        </p>
                                    ) : (
                                        <p className={styles.hint}>
                                            {groupes.length === 0
                                                ? "Créez d'abord un groupe dans l'onglet Groupes pour restreindre cette chambre."
                                                : "Si un groupe est choisi, seuls ses membres pourront y être affectés."}
                                        </p>
                                    )}
                                </FormGroup>
                            ) : null}
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-batiment">Bâtiment (optionnel)</Label>
                                <Input
                                    id="chambre-batiment"
                                    type="text"
                                    value={formBatiment}
                                    onChange={(e) => setFormBatiment(e.target.value)}
                                    disabled={submitting}
                                    maxLength={100}
                                    placeholder='Ex. "A", "Foyer"'
                                />
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-etage">Étage (optionnel)</Label>
                                <Input
                                    id="chambre-etage"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formEtage}
                                    onChange={(e) => setFormEtage(e.target.value.replace(/\D/g, ""))}
                                    disabled={submitting}
                                    placeholder="0 = RDC"
                                />
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-couloir">Couloir (optionnel)</Label>
                                <Input
                                    id="chambre-couloir"
                                    type="text"
                                    value={formCouloir}
                                    onChange={(e) => setFormCouloir(e.target.value)}
                                    disabled={submitting}
                                    maxLength={100}
                                    placeholder='Ex. "Nord", "Est"'
                                />
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-description">Remarques (optionnel)</Label>
                                <Input
                                    id="chambre-description"
                                    type="textarea"
                                    rows={3}
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    disabled={submitting}
                                    maxLength={2000}
                                />
                            </FormGroup>
                            {formTypeChambre === "ENFANT" ? (
                                <ReferentsSelector
                                    value={formReferents}
                                    onChange={setFormReferents}
                                    equipe={equipe.map(({ tokenId, nom, prenom }) => ({ tokenId, nom, prenom }))}
                                    disabled={submitting}
                                    label="Référents animateurs"
                                    layout="stacked"
                                    hint="Sélectionnez les animateurs référents de cette chambre."
                                />
                            ) : null}
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
                                    color={editingChambre == null ? "success" : "primary"}
                                    onClick={handleSubmit}
                                    disabled={submitting || modificationChambreInvalide}
                                >
                                    {submitting ? "Enregistrement…" : editingChambre == null ? "Créer" : "Enregistrer"}
                                </Button>
                            </div>
                        </ModalFooter>
                    </Modal>

                    <Modal
                        isOpen={typeChangeConfirmOpen}
                        toggle={() => !submitting && setTypeChangeConfirmOpen(false)}
                    >
                        <ModalHeader toggle={() => !submitting && setTypeChangeConfirmOpen(false)}>
                            Confirmer le changement de type
                        </ModalHeader>
                        <ModalBody>
                            <p>
                                Vous passez cette chambre au type <strong>Équipe</strong>. Les référents animateurs
                                et l&apos;association éventuelle à un groupe seront supprimés.
                            </p>
                            <p className="mb-0">Souhaitez-vous continuer ?</p>
                            {errorMessage ? (
                                <div className={`${styles.errorMessage} mt-3 mb-0`}>{errorMessage}</div>
                            ) : null}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                color="secondary"
                                onClick={() => setTypeChangeConfirmOpen(false)}
                                disabled={submitting}
                            >
                                Annuler
                            </Button>
                            <Button color="primary" onClick={confirmerChangementTypeEtEnregistrer} disabled={submitting}>
                                {submitting ? "Enregistrement…" : "Confirmer"}
                            </Button>
                        </ModalFooter>
                    </Modal>

                    <Modal isOpen={deleteModalOpen} toggle={() => !deletingChambreId && setDeleteModalOpen(false)}>
                        <ModalHeader toggle={() => !deletingChambreId && setDeleteModalOpen(false)}>
                            Confirmation de suppression
                        </ModalHeader>
                        <ModalBody>
                            <p>Voulez-vous vraiment supprimer cette chambre ?</p>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                color="secondary"
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setPendingDeleteChambreId(null);
                                }}
                                disabled={deletingChambreId != null}
                            >
                                Annuler
                            </Button>
                            <Button color="danger" onClick={handleSupprimer} disabled={deletingChambreId != null}>
                                {deletingChambreId != null ? "Suppression…" : "Confirmer la suppression"}
                            </Button>
                        </ModalFooter>
                    </Modal>

            {addOccupantModal ? (
                <Modal isOpen toggle={() => !occupantSubmitting && dismissAddOccupantModal()} size="lg">
                    <ModalHeader toggle={() => !occupantSubmitting && dismissAddOccupantModal()}>
                        Affecter à {libelleChambre(addOccupantModal)}
                    </ModalHeader>
                    <ModalBody>
                        <p className={styles.pickerMeta}>
                            {placesRestantesChambre(addOccupantModal)} place
                            {placesRestantesChambre(addOccupantModal) !== 1 ? "s" : ""} restante
                            {placesRestantesChambre(addOccupantModal) !== 1 ? "s" : ""}
                            {" — "}
                            {addOccupantModal.typeChambre === "ENFANT"
                                ? `${pickerSelectedEnfantIds.size} enfant(s) sélectionné(s)`
                                : `${pickerSelectedMembreIds.size} membre(s) sélectionné(s)`}
                        </p>
                        <FormGroup className={styles.modalField}>
                            <Label for="occupant-picker-search">
                                <LabelRechercheOccupantsChambre chambre={addOccupantModal} />
                            </Label>
                            <Input
                                id="occupant-picker-search"
                                type="search"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                                disabled={occupantSubmitting}
                                placeholder="Nom ou prénom…"
                                aria-label={libelleRechercheOccupantsChambre(addOccupantModal)}
                            />
                        </FormGroup>
                        {(() => {
                            const chambre = addOccupantModal;
                            const search = pickerSearch.trim().toLowerCase();
                            const placesRestantes = placesRestantesChambre(chambre);
                            const idsEnfantsDansChambre = new Set(
                                (chambre.occupants ?? [])
                                    .filter((o) => o.enfantId != null)
                                    .map((o) => o.enfantId as number)
                            );
                            const idsMembresDansChambre = new Set(
                                (chambre.occupants ?? [])
                                    .filter((o) => o.membreTokenId?.trim())
                                    .map((o) => o.membreTokenId!.trim())
                            );

                            if (chambre.typeChambre === "ENFANT") {
                                const candidats = trierEnfantsParNom(
                                    enfantsEligiblesPourChambre(chambre, enfants, idsEnfantsDansChambre, groupes)
                                ).filter((e) => {
                                    if (!search) return true;
                                    const hay = `${e.nom} ${e.prenom}`.toLowerCase();
                                    return hay.includes(search);
                                });
                                if (candidats.length === 0) {
                                    return (
                                        <p className={styles.occupantsEmpty}>
                                            {chambre.groupe
                                                ? `Aucun enfant éligible du groupe « ${chambre.groupe.libelle} » (genre compatible, non déjà dans cette chambre).`
                                                : "Aucun enfant éligible (genre compatible, non déjà dans cette chambre)."}
                                        </p>
                                    );
                                }
                                return (
                                    <ul className={styles.pickerList}>
                                        {candidats.map((enfant) => {
                                            const autreChambre =
                                                affectationIndex.enfantIdVersChambre.get(enfant.id);
                                            const deplace =
                                                autreChambre != null && autreChambre.id !== chambre.id;
                                            const selected = pickerSelectedEnfantIds.has(enfant.id);
                                            const selectionPleine =
                                                !selected &&
                                                pickerSelectedEnfantIds.size >= placesRestantes;
                                            return (
                                                <li key={enfant.id} className={styles.pickerItem}>
                                                    <label
                                                        className={`${styles.pickerCheckbox} ${selectionPleine ? styles.pickerCheckboxDisabled : ""}`}
                                                    >
                                                        <Input
                                                            type="checkbox"
                                                            checked={selected}
                                                            disabled={occupantSubmitting || selectionPleine}
                                                            onChange={() => togglePickerEnfant(chambre, enfant.id)}
                                                        />
                                                        <span className={styles.pickerItemMain}>
                                                            <span>
                                                                {enfant.nom} {enfant.prenom}
                                                            </span>
                                                            {deplace ? (
                                                                <span className={styles.pickerHint}>
                                                                    Actuellement :{" "}
                                                                    {libelleChambreAffectation(autreChambre)} —
                                                                    sera déplacé
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                );
                            }

                            const candidats = membresEligiblesPourChambre(chambre, equipe, idsMembresDansChambre).filter(
                                (m) => {
                                    if (!search) return true;
                                    const hay = `${m.nom} ${m.prenom}`.toLowerCase();
                                    return hay.includes(search);
                                }
                            );
                            if (candidats.length === 0) {
                                return (
                                    <p className={styles.occupantsEmpty}>
                                        {chambre.genreAutorise === "MIXTE"
                                            ? "Aucun membre d'équipe disponible (non déjà dans cette chambre)."
                                            : "Aucun membre d'équipe compatible avec le genre autorisé (non déjà dans cette chambre)."}
                                    </p>
                                );
                            }
                            return (
                                <ul className={styles.pickerList}>
                                    {candidats.map((membre) => {
                                        const tid = membre.tokenId.trim();
                                        const autreChambre =
                                            affectationIndex.membreTokenIdVersChambre.get(tid);
                                        const deplace =
                                            autreChambre != null && autreChambre.id !== chambre.id;
                                        const selected = pickerSelectedMembreIds.has(tid);
                                        const selectionPleine =
                                            !selected && pickerSelectedMembreIds.size >= placesRestantes;
                                        return (
                                            <li key={membre.tokenId} className={styles.pickerItem}>
                                                <label
                                                    className={`${styles.pickerCheckbox} ${selectionPleine ? styles.pickerCheckboxDisabled : ""}`}
                                                >
                                                    <Input
                                                        type="checkbox"
                                                        checked={selected}
                                                        disabled={occupantSubmitting || selectionPleine}
                                                        onChange={() => togglePickerMembre(chambre, tid)}
                                                    />
                                                    <span className={styles.pickerItemMain}>
                                                        <span>
                                                            {membre.prenom} {membre.nom}
                                                        </span>
                                                        {deplace ? (
                                                            <span className={styles.pickerHint}>
                                                                Actuellement :{" "}
                                                                {libelleChambreAffectation(autreChambre)} — sera
                                                                déplacé
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            );
                        })()}
                        {occupantModalError ? (
                            <div className={`${styles.errorMessage} mt-3 mb-0`}>{occupantModalError}</div>
                        ) : null}
                    </ModalBody>
                    <ModalFooter className={styles.modalFooter}>
                        <div className={styles.modalFooterMessage} aria-live="polite" />
                        <div className={styles.modalFooterActions}>
                            <Button
                                color="secondary"
                                onClick={dismissAddOccupantModal}
                                disabled={occupantSubmitting}
                            >
                                Annuler
                            </Button>
                            <Button
                                color="primary"
                                onClick={handleAffecterSelection}
                                disabled={
                                    occupantSubmitting ||
                                    (addOccupantModal.typeChambre === "ENFANT"
                                        ? pickerSelectedEnfantIds.size === 0
                                        : pickerSelectedMembreIds.size === 0)
                                }
                            >
                                {occupantSubmitting
                                    ? "Affectation…"
                                    : addOccupantModal.typeChambre === "ENFANT"
                                      ? `Affecter (${pickerSelectedEnfantIds.size})`
                                      : `Affecter (${pickerSelectedMembreIds.size})`}
                            </Button>
                        </div>
                    </ModalFooter>
                </Modal>
            ) : null}

            {retirerOccupantModal ? (
                <Modal isOpen toggle={() => !occupantSubmitting && setRetirerOccupantModal(null)}>
                    <ModalHeader toggle={() => !occupantSubmitting && setRetirerOccupantModal(null)}>
                        Retirer un occupant
                    </ModalHeader>
                    <ModalBody>
                        <p>
                            Retirer{" "}
                            <strong>{libelleOccupant(retirerOccupantModal.occupant)}</strong> de cette chambre ?
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            color="secondary"
                            onClick={() => setRetirerOccupantModal(null)}
                            disabled={occupantSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button color="danger" onClick={confirmRetirerOccupant} disabled={occupantSubmitting}>
                            {occupantSubmitting ? "Retrait…" : "Confirmer"}
                        </Button>
                    </ModalFooter>
                </Modal>
            ) : null}

            <HistoriqueModificationListeModal
                isOpen={historiqueOuvert}
                onFermer={fermerHistoriqueChambre}
                titre="Historique de la chambre"
                sousTitre={
                    historiqueChambreLibelle.trim() !== "" ? `« ${historiqueChambreLibelle} »` : undefined
                }
                chargement={historiqueChargement}
                erreur={historiqueErreur}
                lignes={historiqueLignes}
                messageListeVide="Aucune modification enregistrée"
                formatSnapshots="chambre"
            />

            <Modal isOpen={successModalOpen} toggle={() => setSuccessModalOpen(false)}>
                <ModalHeader toggle={() => setSuccessModalOpen(false)}>Confirmation</ModalHeader>
                <ModalBody>
                    <p>{successMessage}</p>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setSuccessModalOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default ListeChambres;
