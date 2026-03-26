import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRevalidator, useNavigate } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChevronDown, faChevronRight, faTrash, faUserMinus, faUserPlus, faFolder } from "@fortawesome/free-solid-svg-icons";
import { EquipePerson } from "../Forms/ReferentsSelector";
import { GroupeDto, EnfantDto } from "../../types/api";
import { sejourGroupeService } from "../../services/sejour-groupe.service";
import CreateGroupeForm from "../Forms/CreateGroupeForm";
import { NiveauScolaireLabels } from "../../enums/NiveauScolaire";
import calculerAge from "../../helpers/calculerAge";
import { trierEnfantsParNom } from "../../helpers/trierUtilisateurs";
import { getEnfantsMatchingTranche } from "../../helpers/groupeTranche";
import styles from "./ListeGroupes.module.scss";

type AddEnfantsModalState =
    | { step: "pick"; groupe: GroupeDto }
    | { step: "recap"; groupeNom: string; noms: string[] };

interface ListeGroupesProps {
    groupes: GroupeDto[];
    enfants: EnfantDto[];
    sejourId: number;
    dateDebutSejour: string | number;
    /** Équipe complète (directeur + membres) pour sélection des référents */
    equipe?: EquipePerson[];
    initialExpandedGroupeId?: number;
    onGroupRendered?: (groupeId: number) => void;
}

const ListeGroupes: React.FC<ListeGroupesProps> = ({ groupes, enfants, sejourId, dateDebutSejour, equipe = [], initialExpandedGroupeId, onGroupRendered }) => {
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; groupe: GroupeDto | null }>({ show: false, groupe: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedGroupes, setExpandedGroupes] = useState<Set<number>>(() =>
        initialExpandedGroupeId ? new Set([initialExpandedGroupeId]) : new Set()
    );
    const groupeRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const lastExpandedGroupeId = useRef<number | null>(null);
    const hasScrolledFromReturn = useRef(false);

    useEffect(() => {
        if (initialExpandedGroupeId) {
            setExpandedGroupes(new Set([initialExpandedGroupeId]));
        }
    }, [initialExpandedGroupeId]);

    const scrollToGroupe = (groupeId: number) => {
        const el = groupeRefs.current[groupeId] ?? document.querySelector(`[data-groupe-id="${groupeId}"]`) as HTMLElement | null;
        if (!el) return;
        const headerOffset = 80;
        const elementTop = el.getBoundingClientRect().top + window.scrollY;
        const targetPosition = elementTop - headerOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    };

    // Scroll quand on clique pour ouvrir un groupe
    useEffect(() => {
        const id = lastExpandedGroupeId.current;
        if (!id) return;
        lastExpandedGroupeId.current = null;
        requestAnimationFrame(() => scrollToGroupe(id));
    }, [expandedGroupes]);

    // Notifier le parent quand le groupe est rendu (pour scroll au retour du dossier)
    const hasNotifiedGroupRendered = useRef(false);
    useLayoutEffect(() => {
        if (!initialExpandedGroupeId || hasNotifiedGroupRendered.current) return;
        const el = groupeRefs.current[initialExpandedGroupeId];
        if (el) {
            hasNotifiedGroupRendered.current = true;
            onGroupRendered?.(initialExpandedGroupeId);
        }
    });
    useEffect(() => {
        if (!initialExpandedGroupeId || hasScrolledFromReturn.current) return;
        hasScrolledFromReturn.current = true;
        const timer1 = setTimeout(() => scrollToGroupe(initialExpandedGroupeId), 100);
        const timer2 = setTimeout(() => scrollToGroupe(initialExpandedGroupeId), 650);
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [initialExpandedGroupeId]);
    const [addEnfantsModal, setAddEnfantsModal] = useState<AddEnfantsModalState | null>(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerSelectedIds, setPickerSelectedIds] = useState<Set<number>>(new Set());
    const [isAddingEnfants, setIsAddingEnfants] = useState(false);
    const [retirerEnfantModal, setRetirerEnfantModal] = useState<{ groupe: GroupeDto; enfant: EnfantDto } | null>(null);
    const [isRetirantEnfant, setIsRetirantEnfant] = useState(false);
    const [editGroupe, setEditGroupe] = useState<GroupeDto | null>(null);
    const [addTrancheModal, setAddTrancheModal] = useState<{ groupe: GroupeDto; enfants: EnfantDto[] } | null>(null);
    const [isAddingTranche, setIsAddingTranche] = useState(false);

    const toggleGroupe = (groupeId: number) => {
        setExpandedGroupes((prev) => {
            if (prev.has(groupeId)) {
                const next = new Set(prev);
                next.delete(groupeId);
                return next;
            }
            lastExpandedGroupeId.current = groupeId;
            // Un seul groupe ouvert à la fois
            return new Set([groupeId]);
        });
    };

    const formatTranche = (g: GroupeDto): string => {
        if (g.typeGroupe === "THEMATIQUE") {
            return "";
        }
        if (g.typeGroupe === "AGE") {
            return `${g.ageMin ?? "?"} - ${g.ageMax ?? "?"} ans`;
        }
        const min = g.niveauScolaireMin ? (NiveauScolaireLabels[g.niveauScolaireMin as keyof typeof NiveauScolaireLabels] || g.niveauScolaireMin) : "?";
        const max = g.niveauScolaireMax ? (NiveauScolaireLabels[g.niveauScolaireMax as keyof typeof NiveauScolaireLabels] || g.niveauScolaireMax) : "?";
        return `${min} - ${max}`;
    };

    const getTypeLabel = (g: GroupeDto): string => {
        if (g.typeGroupe === "THEMATIQUE") return "Par thématique";
        if (g.typeGroupe === "AGE") return "Par âge :";
        return "Par niveau scolaire :";
    };

    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        revalidator.revalidate();
    };

    const handleEditSuccess = () => {
        setEditGroupe(null);
        revalidator.revalidate();
    };

    const handleRetirerEnfant = async (groupe: GroupeDto, enfant: EnfantDto) => {
        setErrorMessage(null);
        try {
            await sejourGroupeService.retirerEnfantDuGroupe(sejourId, groupe.id, enfant.id);
            setRetirerEnfantModal(null);
            revalidator.revalidate();
        } catch (error) {
            console.error("Erreur lors du retrait de l'enfant", error);
            setErrorMessage("Erreur lors du retrait de l'enfant du groupe");
        } finally {
            setIsRetirantEnfant(false);
        }
    };

    const confirmRetirerEnfant = async () => {
        if (!retirerEnfantModal) return;
        setIsRetirantEnfant(true);
        await handleRetirerEnfant(retirerEnfantModal.groupe, retirerEnfantModal.enfant);
    };

    const openAddEnfantsPicker = (groupe: GroupeDto) => {
        setPickerSearch("");
        setPickerSelectedIds(new Set());
        setAddEnfantsModal({ step: "pick", groupe });
    };

    const dismissAddEnfantsModal = (runRevalidate: boolean) => {
        setAddEnfantsModal(null);
        setPickerSearch("");
        setPickerSelectedIds(new Set());
        if (runRevalidate) {
            revalidator.revalidate();
        }
    };

    const togglePickerEnfant = (enfantId: number) => {
        setPickerSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(enfantId)) next.delete(enfantId);
            else next.add(enfantId);
            return next;
        });
    };

    const confirmAjouterEnfantsSelection = async () => {
        if (addEnfantsModal?.step !== "pick" || pickerSelectedIds.size === 0) return;
        const { groupe } = addEnfantsModal;
        setIsAddingEnfants(true);
        setErrorMessage(null);
        try {
            const ids = Array.from(pickerSelectedIds);
            for (const enfantId of ids) {
                await sejourGroupeService.ajouterEnfantAuGroupe(sejourId, groupe.id, enfantId);
            }
            const groupeNom = groupe.nom;
            const byId = new Map(enfants.map((e) => [e.id, e]));
            const noms = ids
                .map((id) => {
                    const e = byId.get(id);
                    return e ? `${e.nom} ${e.prenom}`.trim() : `Enfant #${id}`;
                })
                .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
            // Même modale : étape récap (pas de revalidate tant que l’utilisateur n’a pas fermé — évite de remonter l’arbre / perdre l’état).
            setAddEnfantsModal({ step: "recap", groupeNom, noms });
            setPickerSearch("");
            setPickerSelectedIds(new Set());
        } catch (error) {
            console.error("Erreur lors de l'ajout des enfants", error);
            setErrorMessage("Erreur lors de l'ajout des enfants au groupe");
        } finally {
            setIsAddingEnfants(false);
        }
    };

    const handleAjouterTranche = async () => {
        if (!addTrancheModal) return;
        setErrorMessage(null);
        setIsAddingTranche(true);
        try {
            for (const enfant of addTrancheModal.enfants) {
                await sejourGroupeService.ajouterEnfantAuGroupe(sejourId, addTrancheModal.groupe.id, enfant.id);
            }
            setAddTrancheModal(null);
            revalidator.revalidate();
        } catch (error) {
            console.error("Erreur lors de l'ajout des enfants de la tranche", error);
            setErrorMessage("Erreur lors de l'ajout des enfants au groupe");
        } finally {
            setIsAddingTranche(false);
        }
    };

    const handleSupprimerGroupe = async () => {
        if (!deleteModal.groupe) return;
        setIsDeleting(true);
        setErrorMessage(null);
        try {
            await sejourGroupeService.supprimerGroupe(sejourId, deleteModal.groupe.id);
            setDeleteModal({ show: false, groupe: null });
            revalidator.revalidate();
        } catch (error) {
            console.error("Erreur lors de la suppression du groupe", error);
            setErrorMessage("Erreur lors de la suppression du groupe");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.actionsContainer}>
                <Button color="primary" onClick={() => setShowCreateModal(true)}>
                    <FontAwesomeIcon icon={faPlus} className={styles.icon} />
                    Créer un groupe
                </Button>
            </div>

            {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

            {groupes.length === 0 ? (
                <p className={styles.placeholderText}>
                    Aucun groupe créé. Cliquez sur "Créer un groupe" pour commencer.
                </p>
            ) : (
                <div className={styles.groupesList}>
                    {groupes.map((groupe) => {
                        const enfantsIdsDansGroupe = new Set(groupe.enfants.map((e) => e.id));
                        const enfantsHorsGroupe = trierEnfantsParNom(enfants.filter((e) => !enfantsIdsDansGroupe.has(e.id)));
                        const ageAtSejour = (e: EnfantDto) => calculerAge(e.dateNaissance, dateDebutSejour);

                        const isExpanded = expandedGroupes.has(groupe.id);
                        return (
                            <div
                                key={groupe.id}
                                ref={ref => { groupeRefs.current[groupe.id] = ref; }}
                                data-groupe-id={groupe.id}
                                className={styles.groupeCard}
                            >
                                <div className={styles.groupeHeader}>
                                    <button
                                        type="button"
                                        className={styles.groupeHeaderButton}
                                        onClick={() => toggleGroupe(groupe.id)}
                                    >
                                        <FontAwesomeIcon
                                            icon={isExpanded ? faChevronDown : faChevronRight}
                                            className={styles.chevronIcon}
                                        />
                                        <span className={styles.groupeNom}>{groupe.nom}</span>
                                        <span className={styles.groupeCount}>({groupe.enfants.length})</span>
                                    </button>
                                    <div className={styles.groupeHeaderActions}>
                                        <Button
                                            color="light"
                                            size="sm"
                                            outline
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditGroupe(groupe);
                                            }}
                                            className={styles.editButton}
                                        >
                                            Modifier
                                        </Button>
                                        <Button
                                            color="danger"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteModal({ show: true, groupe });
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faTrash} /> Supprimer
                                        </Button>
                                    </div>
                                </div>

                                {isExpanded && (
                                <div className={styles.enfantsSection}>
                                    {groupe.description && (
                                        <p className={styles.groupeDescription}>{groupe.description}</p>
                                    )}
                                    <div className={styles.referentsRow}>
                                        <span className={styles.referentsLabel}>Référents :</span>
                                        <span className={styles.referentsList}>
                                            {(groupe.referents?.length ?? 0) > 0
                                                ? groupe.referents!.map((r) => `${r.prenom} ${r.nom}`).join(", ")
                                                : "Pas de référent pour ce groupe"}
                                        </span>
                                    </div>
                                    <div className={styles.trancheRow}>
                                        <span className={styles.trancheBadge}>
                                            {getTypeLabel(groupe)} {formatTranche(groupe)}
                                        </span>
                                        {(groupe.typeGroupe === "AGE" || groupe.typeGroupe === "NIVEAU_SCOLAIRE") &&
                                            (() => {
                                                const matching = getEnfantsMatchingTranche(
                                                    groupe,
                                                    enfants,
                                                    dateDebutSejour,
                                                    enfantsIdsDansGroupe
                                                );
                                                return matching.length > 0 ? (
                                                    <Button
                                                        color="success"
                                                        size="sm"
                                                        className={styles.addTrancheButton}
                                                        onClick={() => setAddTrancheModal({ groupe, enfants: matching })}
                                                    >
                                                        <FontAwesomeIcon icon={faUserPlus} /> Ajouter les {matching.length}{" "}
                                                        enfant{matching.length > 1 ? "s" : ""} de la tranche
                                                    </Button>
                                                ) : null;
                                            })()}
                                    </div>

                                    {enfantsHorsGroupe.length > 0 && (
                                        <div className={styles.addEnfant}>
                                            <Button
                                                color="primary"
                                                size="sm"
                                                className={styles.addEnfantsButton}
                                                onClick={() => openAddEnfantsPicker(groupe)}
                                            >
                                                <FontAwesomeIcon icon={faUserPlus} className={styles.icon} />
                                                Ajouter des enfants
                                            </Button>
                                        </div>
                                    )}

                                    <h4 className={styles.enfantsTitle}>
                                        Enfants ({groupe.enfants.length})
                                    </h4>
                                    {groupe.enfants.length === 0 ? (
                                        <p className={styles.noEnfants}>Aucun enfant dans ce groupe</p>
                                    ) : (
                                        <ul className={styles.enfantsList}>
                                            {groupe.enfants.map((enfant) => (
                                                <li key={enfant.id} className={styles.enfantItem}>
                                                    <span className={styles.enfantNameWrapper}>
                                                        <FontAwesomeIcon
                                                            className="icone_dossier"
                                                            icon={faFolder}
                                                            onClick={() => {
                                                                const state = { from: 'groupes' as const, openAccordion: '4', expandedGroupeId: groupe.id };
                                                                navigate(`/directeur/sejours/${sejourId}`, { state, replace: true });
                                                                navigate(`/directeur/sejours/${sejourId}/enfants/${enfant.id}/dossier`, { state });
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                            title="Voir le dossier"
                                                        />
                                                        <span>
                                                            {enfant.nom} {enfant.prenom}
                                                            <span className={styles.enfantMeta}>
                                                                {" "}
                                                                ({ageAtSejour(enfant)} ans, {NiveauScolaireLabels[enfant.niveauScolaire as keyof typeof NiveauScolaireLabels] || enfant.niveauScolaire})
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <Button
                                                        color="danger"
                                                        size="sm"
                                                        onClick={() => setRetirerEnfantModal({ groupe, enfant })}
                                                        title="Retirer du groupe"
                                                    >
                                                        <FontAwesomeIcon icon={faUserMinus} /> Retirer
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={showCreateModal} toggle={() => setShowCreateModal(false)} size="lg">
                <ModalHeader toggle={() => setShowCreateModal(false)}>Créer un groupe</ModalHeader>
                <ModalBody>
                    <CreateGroupeForm
                        sejourId={sejourId}
                        handleCloseModal={handleCreateSuccess}
                        enfants={enfants}
                        dateDebutSejour={dateDebutSejour}
                        equipe={equipe}
                    />
                </ModalBody>
            </Modal>

            <Modal isOpen={!!editGroupe} toggle={() => setEditGroupe(null)} size="lg">
                <ModalHeader toggle={() => setEditGroupe(null)}>Modifier le groupe</ModalHeader>
                <ModalBody>
                    {editGroupe && (
                        <CreateGroupeForm
                            sejourId={sejourId}
                            groupe={editGroupe}
                            handleCloseModal={handleEditSuccess}
                            equipe={equipe}
                        />
                    )}
                </ModalBody>
            </Modal>

            <Modal
                isOpen={addEnfantsModal !== null}
                toggle={() => {
                    if (!addEnfantsModal || isAddingEnfants) return;
                    dismissAddEnfantsModal(addEnfantsModal.step === "recap");
                }}
                size="lg"
            >
                <ModalHeader
                    toggle={() => {
                        if (!addEnfantsModal || isAddingEnfants) return;
                        dismissAddEnfantsModal(addEnfantsModal.step === "recap");
                    }}
                >
                    {addEnfantsModal?.step === "recap" ? "Ajout au groupe" : "Ajouter des enfants"}
                </ModalHeader>
                <ModalBody>
                    {addEnfantsModal?.step === "pick" &&
                        (() => {
                            const g = addEnfantsModal.groupe;
                            const gid = g.id;
                            const idsDansGroupe = new Set(g.enfants.map((e) => e.id));
                            const hors = trierEnfantsParNom(enfants.filter((e) => !idsDansGroupe.has(e.id)));
                            const search = pickerSearch.toLowerCase().trim();
                            const searchWords = search ? search.split(/\s+/).filter(Boolean) : [];
                            const filtered = hors.filter((e: EnfantDto) => {
                                if (!search) return true;
                                const fullName = `${e.nom} ${e.prenom}`.toLowerCase();
                                return searchWords.every((word) => fullName.includes(word));
                            });
                            return (
                                <>
                                    <p className={styles.pickerIntro}>
                                        Groupe <strong>{g.nom}</strong> — cochez les enfants à ajouter, puis validez.
                                    </p>
                                    <label className={styles.pickerSearchLabel} htmlFor={`picker-search-${gid}`}>
                                        Filtrer la liste
                                    </label>
                                    <input
                                        id={`picker-search-${gid}`}
                                        type="search"
                                        className={styles.pickerSearchInput}
                                        placeholder="Nom, prénom…"
                                        value={pickerSearch}
                                        onChange={(e) => setPickerSearch(e.target.value)}
                                        autoComplete="off"
                                    />
                                    <ul className={styles.pickerList} role="listbox" aria-multiselectable>
                                        {filtered.length === 0 ? (
                                            <li className={styles.pickerEmpty}>Aucun enfant ne correspond au filtre.</li>
                                        ) : (
                                            filtered.map((e) => (
                                                <li key={e.id} className={styles.pickerRow}>
                                                    <label className={styles.pickerRowLabel}>
                                                        <input
                                                            type="checkbox"
                                                            className={styles.pickerCheckbox}
                                                            checked={pickerSelectedIds.has(e.id)}
                                                            onChange={() => togglePickerEnfant(e.id)}
                                                        />
                                                        <span>
                                                            {e.nom} {e.prenom}
                                                            <span className={styles.pickerRowMeta}>
                                                                {" "}
                                                                ({calculerAge(e.dateNaissance, dateDebutSejour)} ans,{" "}
                                                                {NiveauScolaireLabels[e.niveauScolaire as keyof typeof NiveauScolaireLabels] ?? e.niveauScolaire})
                                                            </span>
                                                        </span>
                                                    </label>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </>
                            );
                        })()}
                    {addEnfantsModal?.step === "recap" && (
                        <p className={styles.recapEnfantsMessage}>
                            {addEnfantsModal.noms.length === 1 ? (
                                <>
                                    L&apos;enfant <strong>{addEnfantsModal.noms[0]}</strong> a bien été ajouté au groupe{" "}
                                    <strong>{addEnfantsModal.groupeNom}</strong>.
                                </>
                            ) : (
                                <>
                                    Les enfants <strong>{addEnfantsModal.noms.join(", ")}</strong> ont bien été ajoutés au groupe{" "}
                                    <strong>{addEnfantsModal.groupeNom}</strong>.
                                </>
                            )}
                        </p>
                    )}
                </ModalBody>
                <ModalFooter>
                    {addEnfantsModal?.step === "pick" ? (
                        <>
                            <Button color="secondary" onClick={() => dismissAddEnfantsModal(false)} disabled={isAddingEnfants}>
                                Annuler
                            </Button>
                            <Button
                                color="primary"
                                onClick={confirmAjouterEnfantsSelection}
                                disabled={isAddingEnfants || pickerSelectedIds.size === 0}
                            >
                                {isAddingEnfants ? "Ajout en cours..." : `Valider (${pickerSelectedIds.size})`}
                            </Button>
                        </>
                    ) : (
                        addEnfantsModal?.step === "recap" && (
                            <Button color="primary" onClick={() => dismissAddEnfantsModal(true)}>
                                OK
                            </Button>
                        )
                    )}
                </ModalFooter>
            </Modal>

            <Modal isOpen={!!retirerEnfantModal} toggle={() => setRetirerEnfantModal(null)}>
                <ModalHeader toggle={() => setRetirerEnfantModal(null)}>
                    Retirer un enfant du groupe
                </ModalHeader>
                <ModalBody>
                    {retirerEnfantModal && (
                        <p>
                            Voulez-vous retirer <strong>{retirerEnfantModal.enfant.nom} {retirerEnfantModal.enfant.prenom}</strong> du groupe <strong>{retirerEnfantModal.groupe.nom}</strong> ?
                        </p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setRetirerEnfantModal(null)}>
                        Annuler
                    </Button>
                    <Button color="danger" onClick={confirmRetirerEnfant} disabled={isRetirantEnfant}>
                        {isRetirantEnfant ? "Retrait en cours..." : "Confirmer"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={!!addTrancheModal} toggle={() => setAddTrancheModal(null)} size="lg">
                <ModalHeader toggle={() => setAddTrancheModal(null)}>
                    Ajouter les enfants de la tranche
                </ModalHeader>
                <ModalBody>
                    {addTrancheModal && (
                        <>
                            <p>
                                Voulez-vous ajouter les <strong>{addTrancheModal.enfants.length}</strong> enfant
                                {addTrancheModal.enfants.length > 1 ? "s" : ""} correspondant à la tranche du groupe{" "}
                                <strong>{addTrancheModal.groupe.nom}</strong> ? (aucun doublon)
                            </p>
                            <ul className={styles.addTrancheList}>
                                {addTrancheModal.enfants.map((e) => (
                                    <li key={e.id}>
                                        {e.nom} {e.prenom} ({calculerAge(e.dateNaissance, dateDebutSejour)} ans,{" "}
                                        {NiveauScolaireLabels[e.niveauScolaire as keyof typeof NiveauScolaireLabels] ?? e.niveauScolaire})
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setAddTrancheModal(null)}>
                        Annuler
                    </Button>
                    <Button color="primary" onClick={handleAjouterTranche} disabled={isAddingTranche}>
                        {isAddingTranche ? "Ajout en cours..." : "Confirmer"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModal.show} toggle={() => setDeleteModal({ show: false, groupe: null })}>
                <ModalHeader toggle={() => setDeleteModal({ show: false, groupe: null })}>
                    Supprimer le groupe
                </ModalHeader>
                <ModalBody>
                    {deleteModal.groupe && (
                        <p>
                            Voulez-vous supprimer le groupe <strong>{deleteModal.groupe.nom}</strong> ?
                            Les enfants ne seront pas retirés du séjour.
                        </p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setDeleteModal({ show: false, groupe: null })}>
                        Annuler
                    </Button>
                    <Button color="danger" onClick={handleSupprimerGroupe} disabled={isDeleting}>
                        {isDeleting ? "Suppression..." : "Supprimer"}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default ListeGroupes;
