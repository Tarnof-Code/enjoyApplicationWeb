import { Fragment, useState, type ReactNode } from "react";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { MomentDto } from "../../types/api";
import {
    aplatirMomentsHierarchiquement,
    construireArbreMoments,
    enfantsDirectsMoment,
    idsApresDeplacementMomentFrere,
    idsRacinesSelectionEnfants,
    idsSousArbreMoment,
    libelleMomentIndenté,
    MomentArbreNode,
    nombreDescendantsMoment,
    optionsEnfantsAffichables,
    parentsEligiblesPourMoment,
    validerLiensParentEnfants,
} from "../../helpers/construireArbreMoments";
import { sejourMomentService } from "../../services/sejour-moment.service";
import styles from "./ListeMoments.module.scss";

export interface ListeMomentsProps {
    moments: MomentDto[];
    sejourId: number;
    onMomentsReordered?: (moments: MomentDto[]) => void;
    onMomentCreated?: (moment: MomentDto) => void;
    onMomentUpdated?: (moment: MomentDto) => void;
    onMomentDeleted?: (momentId: number) => void;
}

type ModalMode = "create" | "edit";

async function rattacherEnfants(
    sejourId: number,
    parentId: number,
    enfantIds: number[],
    moments: MomentDto[],
    onMomentUpdated?: (moment: MomentDto) => void,
) {
    for (const enfantId of enfantIds) {
        const enfant = moments.find((m) => m.id === enfantId);
        if (!enfant || enfant.parentId === parentId) continue;
        const misAJour = await sejourMomentService.modifierMoment(sejourId, enfant.id, {
            nom: enfant.nom,
            parentId,
        });
        onMomentUpdated?.(misAJour);
    }
}

async function synchroniserEnfants(
    sejourId: number,
    momentId: number,
    enfantIdsSelectionnes: Set<number>,
    moments: MomentDto[],
    onMomentUpdated?: (moment: MomentDto) => void,
) {
    const racinesSelection = idsRacinesSelectionEnfants(enfantIdsSelectionnes, moments);
    const enfantsActuels = moments.filter((m) => m.parentId === momentId);
    const aDetacher = enfantsActuels.filter((m) => !racinesSelection.includes(m.id));
    const aRattacher = racinesSelection.filter((id) => {
        const m = moments.find((x) => x.id === id);
        return m != null && m.parentId !== momentId;
    });

    for (const enfant of aDetacher) {
        const misAJour = await sejourMomentService.modifierMoment(sejourId, enfant.id, {
            nom: enfant.nom,
            parentId: null,
        });
        onMomentUpdated?.(misAJour);
    }
    await rattacherEnfants(sejourId, momentId, aRattacher, moments, onMomentUpdated);
}

function ListeMoments({
    moments,
    sejourId,
    onMomentsReordered,
    onMomentCreated,
    onMomentUpdated,
    onMomentDeleted,
}: ListeMomentsProps) {
    const [accordionsFermes, setAccordionsFermes] = useState<Set<number>>(() => new Set());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
    const [pendingDeleteMomentId, setPendingDeleteMomentId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingMomentId, setEditingMomentId] = useState<number | null>(null);
    const [deletingMomentId, setDeletingMomentId] = useState<number | null>(null);
    const [formNom, setFormNom] = useState("");
    const [formParentId, setFormParentId] = useState<number | "">("");
    const [formEnfantIds, setFormEnfantIds] = useState<Set<number>>(() => new Set());
    const [reorderLoading, setReorderLoading] = useState(false);

    const racines = construireArbreMoments(moments);
    const aplat = aplatirMomentsHierarchiquement(moments);
    const afficherLiens = moments.length > 0;

    const momentCourantId = modalMode === "edit" ? editingMomentId : null;
    const parentIdCourant = formParentId === "" ? null : formParentId;

    const optionsParent = parentsEligiblesPourMoment(moments, momentCourantId).filter(
        (m) => !formEnfantIds.has(m.id),
    );
    const optionsEnfant = optionsEnfantsAffichables(moments, momentCourantId, parentIdCourant);
    const enfantsRattaches =
        modalMode === "edit" && editingMomentId != null
            ? enfantsDirectsMoment(moments, editingMomentId)
            : [];
    const idsEnfantsRattaches = new Set(enfantsRattaches.map((m) => m.id));
    const optionsAjoutEnfants =
        modalMode === "edit"
            ? optionsEnfant.filter((m) => !idsEnfantsRattaches.has(m.id))
            : optionsEnfant;

    const openCreateModal = () => {
        setErrorMessage(null);
        setModalMode("create");
        setEditingMomentId(null);
        setFormNom("");
        setFormParentId("");
        setFormEnfantIds(new Set());
        setModalOpen(true);
    };

    const openEditModal = (moment: MomentDto) => {
        setErrorMessage(null);
        setModalMode("edit");
        setEditingMomentId(moment.id);
        setFormNom(moment.nom);
        setFormParentId(moment.parentId ?? "");
        const ids = new Set<number>();
        for (const enfant of moments.filter((m) => m.parentId === moment.id)) {
            for (const id of idsSousArbreMoment(moments, enfant.id)) {
                ids.add(id);
            }
        }
        setFormEnfantIds(ids);
        setModalOpen(true);
    };

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const toggleEnfantId = (id: number) => {
        setFormEnfantIds((prev) => {
            const next = new Set(prev);
            const sousArbre = idsSousArbreMoment(moments, id);
            if (next.has(id)) {
                for (const sid of sousArbre) next.delete(sid);
            } else {
                for (const sid of sousArbre) next.add(sid);
            }
            return next;
        });
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const nom = formNom.trim();
        if (!nom) {
            setErrorMessage("Le nom du moment est obligatoire.");
            return;
        }

        const parentId = formParentId === "" ? null : (formParentId as number);
        const enfantIds = idsRacinesSelectionEnfants(formEnfantIds, moments);
        const erreurLien = validerLiensParentEnfants(moments, {
            momentId: editingMomentId,
            parentId,
            enfantIds,
        });
        if (erreurLien) {
            setErrorMessage(erreurLien);
            return;
        }

        setSubmitting(true);
        try {
            if (editingMomentId == null) {
                const created = await sejourMomentService.creerMoment(sejourId, { nom, parentId });
                onMomentCreated?.(created);
                await rattacherEnfants(sejourId, created.id, enfantIds, moments, onMomentUpdated);
                showSuccessModal("Moment créé avec succès.");
            } else {
                const updated = await sejourMomentService.modifierMoment(sejourId, editingMomentId, {
                    nom,
                    parentId,
                });
                onMomentUpdated?.(updated);
                await synchroniserEnfants(
                    sejourId,
                    editingMomentId,
                    formEnfantIds,
                    moments,
                    onMomentUpdated,
                );
                showSuccessModal("Moment modifié avec succès.");
            }
            setModalOpen(false);
            setEditingMomentId(null);
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingMomentId == null
                      ? "Impossible de créer le moment"
                      : "Impossible de modifier le moment";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const requestDeleteMoment = (momentId: number) => {
        setDeleteErrorMessage(null);
        setPendingDeleteMomentId(momentId);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteMomentId == null) return;
        const momentIdASupprimer = pendingDeleteMomentId;
        setDeleteErrorMessage(null);
        setDeletingMomentId(momentIdASupprimer);
        try {
            await sejourMomentService.supprimerMoment(sejourId, momentIdASupprimer);
            setDeleteModalOpen(false);
            setPendingDeleteMomentId(null);
            showSuccessModal("Moment supprimé avec succès.");
            onMomentDeleted?.(momentIdASupprimer);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer le moment";
            setDeleteErrorMessage(msg);
        } finally {
            setDeletingMomentId(null);
        }
    };

    const moveMoment = async (momentId: number, direction: "up" | "down") => {
        const next = idsApresDeplacementMomentFrere(moments, momentId, direction);
        if (!next) return;
        setErrorMessage(null);
        setReorderLoading(true);
        try {
            const updated = await sejourMomentService.reordonnerMoments(sejourId, { momentIds: next });
            onMomentsReordered?.(updated);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de réordonner les moments";
            setErrorMessage(msg);
        } finally {
            setReorderLoading(false);
        }
    };

    const peutMonter = (momentId: number): boolean => {
        const m = moments.find((x) => x.id === momentId);
        if (!m) return false;
        const freres = moments.filter((x) => x.parentId === m.parentId);
        return freres.findIndex((x) => x.id === momentId) > 0;
    };

    const estAccordionOuvert = (id: number) => !accordionsFermes.has(id);

    const toggleAccordion = (id: number) => {
        setAccordionsFermes((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const peutDescendre = (momentId: number): boolean => {
        const m = moments.find((x) => x.id === momentId);
        if (!m) return false;
        const freres = moments.filter((x) => x.parentId === m.parentId);
        const idx = freres.findIndex((x) => x.id === momentId);
        return idx >= 0 && idx < freres.length - 1;
    };

    const renderOptionsMoments = (liste: MomentDto[]) =>
        liste.map((m) => {
            const aplatMoment = aplat.find((x) => x.id === m.id);
            return (
                <option key={m.id} value={m.id}>
                    {aplatMoment ? libelleMomentIndenté(aplatMoment) : m.nom}
                </option>
            );
        });

    const libelleEnfantCheckbox = (m: MomentDto, aplatAffichage: boolean): string => {
        const nbDesc = nombreDescendantsMoment(moments, m.id);
        if (nbDesc > 0) {
            return `${m.nom} (${nbDesc} sous-moment${nbDesc > 1 ? "s" : ""})`;
        }
        if (aplatAffichage) {
            const aplatMoment = aplat.find((x) => x.id === m.id);
            return aplatMoment ? libelleMomentIndenté(aplatMoment) : m.nom;
        }
        return m.nom;
    };

    const renderCheckboxEnfants = (
        liste: MomentDto[],
        idPrefix: string,
        options?: { indentation?: boolean },
    ) => (
        <div className={styles.checkboxGroup}>
            {liste.map((m) => (
                <div key={m.id} className={styles.checkboxRow}>
                    <Input
                        type="checkbox"
                        id={`${idPrefix}-${m.id}`}
                        checked={formEnfantIds.has(m.id)}
                        onChange={() => toggleEnfantId(m.id)}
                        disabled={submitting}
                    />
                    <Label for={`${idPrefix}-${m.id}`} className="mb-0">
                        {libelleEnfantCheckbox(m, options?.indentation ?? false)}
                    </Label>
                </div>
            ))}
        </div>
    );

    const renderSelecteursParentEnfant = () => (
        <>
            <FormGroup className={styles.modalField}>
                <Label for="moment-parent">Parent</Label>
                <Input
                    id="moment-parent"
                    type="select"
                    value={formParentId === "" ? "" : String(formParentId)}
                    onChange={(e) => {
                        const v = e.target.value;
                        const next = v === "" ? "" : Number(v);
                        setFormParentId(next);
                        if (next !== "") {
                            setFormEnfantIds((prev) => {
                                const sousArbre = idsSousArbreMoment(moments, next as number);
                                const copy = new Set(prev);
                                let modifie = false;
                                for (const sid of sousArbre) {
                                    if (copy.has(sid)) {
                                        copy.delete(sid);
                                        modifie = true;
                                    }
                                }
                                return modifie ? copy : prev;
                            });
                        }
                    }}
                    disabled={submitting}
                >
                    <option value="">— Aucun —</option>
                    {renderOptionsMoments(optionsParent)}
                </Input>
                <p className={styles.hint}>Un seul parent possible. Laissez vide pour un moment racine.</p>
            </FormGroup>
            {modalMode === "edit" && enfantsRattaches.length > 0 ? (
                <FormGroup className={styles.modalField}>
                    <Label>Enfants rattachés</Label>
                    {renderCheckboxEnfants(enfantsRattaches, "moment-enfant-rattache")}
                    <p className={styles.hint}>
                        Décochez un enfant pour le retirer de ce parent (il redevient moment racine). Les
                        sous-moments suivent leur parent.
                    </p>
                </FormGroup>
            ) : null}
            <FormGroup className={styles.modalField}>
                <Label>{modalMode === "edit" ? "Ajouter des enfants" : "Enfants"}</Label>
                {optionsAjoutEnfants.length === 0 ? (
                    <p className={styles.hint}>
                        {modalMode === "edit"
                            ? "Aucun autre moment disponible à rattacher."
                            : "Aucun moment disponible à rattacher comme enfant."}
                    </p>
                ) : (
                    renderCheckboxEnfants(optionsAjoutEnfants, "moment-enfant-ajout", { indentation: true })
                )}
                {optionsAjoutEnfants.length > 0 ? (
                    <p className={styles.hint}>
                        Cochez un ou plusieurs moments : leurs sous-moments suivent automatiquement et ne
                        sont pas listés séparément.
                    </p>
                ) : null}
            </FormGroup>
        </>
    );

    const renderMomentCard = (
        noeud: MomentArbreNode,
        accordion?: { ouvert: boolean; onToggle: () => void },
    ): ReactNode => {
        const aFreres = moments.filter((m) => m.parentId === noeud.parentId).length > 1;
        const estParent = noeud.enfants.length > 0;
        const estEnfant = noeud.parentId != null;
        const busy = reorderLoading || deletingMomentId != null;

        return (
            <article
                className={`${styles.card} ${estParent ? styles.cardParent : ""} ${estEnfant ? styles.cardEnfant : ""}`}
            >
                <div className={styles.cardRow}>
                    {accordion ? (
                        <button
                            type="button"
                            className={styles.accordionToggle}
                            onClick={accordion.onToggle}
                            aria-expanded={accordion.ouvert}
                            title={accordion.ouvert ? "Réduire les sous-moments" : "Développer les sous-moments"}
                        >
                            {accordion.ouvert ? "▼" : "▶"}
                        </button>
                    ) : null}
                    <span className={styles.nom}>
                        {noeud.nom}
                        {estParent ? (
                            <span className={styles.parentBadge}>
                                {noeud.enfants.length} sous-moment{noeud.enfants.length > 1 ? "s" : ""}
                            </span>
                        ) : null}
                    </span>
                    <div className={styles.cardControls}>
                        {aFreres ? (
                            <>
                                <Button
                                    color="secondary"
                                    outline
                                    size="sm"
                                    type="button"
                                    onClick={() => moveMoment(noeud.id, "up")}
                                    disabled={busy || !peutMonter(noeud.id)}
                                    aria-label={`Monter « ${noeud.nom} »`}
                                    title="Monter"
                                >
                                    ↑
                                </Button>
                                <Button
                                    color="secondary"
                                    outline
                                    size="sm"
                                    type="button"
                                    onClick={() => moveMoment(noeud.id, "down")}
                                    disabled={busy || !peutDescendre(noeud.id)}
                                    aria-label={`Descendre « ${noeud.nom} »`}
                                    title="Descendre"
                                >
                                    ↓
                                </Button>
                            </>
                        ) : null}
                        <Button
                            color="primary"
                            size="sm"
                            onClick={() => openEditModal(noeud)}
                            disabled={deletingMomentId === noeud.id || reorderLoading}
                        >
                            Modifier
                        </Button>
                        <Button
                            color="danger"
                            size="sm"
                            onClick={() => requestDeleteMoment(noeud.id)}
                            disabled={deletingMomentId === noeud.id || reorderLoading}
                        >
                            {deletingMomentId === noeud.id ? "Suppression…" : "Supprimer"}
                        </Button>
                    </div>
                </div>
            </article>
        );
    };

    const renderNoeud = (noeud: MomentArbreNode): ReactNode => {
        if (noeud.enfants.length === 0) {
            return <Fragment key={noeud.id}>{renderMomentCard(noeud)}</Fragment>;
        }

        const ouvert = estAccordionOuvert(noeud.id);
        return (
            <div key={noeud.id} className={styles.blocParent}>
                {renderMomentCard(noeud, { ouvert, onToggle: () => toggleAccordion(noeud.id) })}
                {ouvert ? (
                    <div
                        className={styles.blocEnfants}
                        role="group"
                        aria-label={`Sous-moments de ${noeud.nom}`}
                    >
                        {noeud.enfants.map((enfant) => renderNoeud(enfant))}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openCreateModal}>
                    Ajouter un moment
                </Button>
            </div>
            <p className={styles.hint}>
                Les moments décrivent les créneaux de la journée.
            </p>
            {errorMessage && !modalOpen && <div className={styles.errorMessage}>{errorMessage}</div>}

            {moments.length === 0 ? (
                <p className={styles.empty}>Aucun moment n&apos;est défini.</p>
            ) : (
                <div className={styles.list}>{racines.map((r) => renderNoeud(r))}</div>
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)}>
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {modalMode === "create" ? "Nouveau moment" : "Modifier le moment"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="moment-nom">Nom</Label>
                        <Input
                            id="moment-nom"
                            type="text"
                            value={formNom}
                            onChange={(e) => setFormNom(e.target.value)}
                            disabled={submitting}
                            maxLength={200}
                            required
                        />
                        <p className={styles.hint}>Ex. Matin, Après-midi, Soirée (max. 200 caractères).</p>
                    </FormGroup>
                    {afficherLiens ? renderSelecteursParentEnfant() : null}
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
                            color={editingMomentId == null ? "success" : "primary"}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Enregistrement…" : editingMomentId == null ? "Créer" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModalOpen} toggle={() => !deletingMomentId && setDeleteModalOpen(false)}>
                <ModalHeader toggle={() => !deletingMomentId && setDeleteModalOpen(false)}>
                    Confirmation de suppression
                </ModalHeader>
                <ModalBody>
                    {deleteErrorMessage ? (
                        <div className={styles.errorMessage}>{deleteErrorMessage}</div>
                    ) : (
                        <>
                            <p>Voulez-vous vraiment supprimer ce moment ?</p>
                            <p className={styles.hint}>
                                La suppression est refusée si le moment a des sous-moments, ou si des activités
                                y sont encore rattachées.
                            </p>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setDeleteErrorMessage(null);
                            setPendingDeleteMomentId(null);
                        }}
                        disabled={deletingMomentId != null}
                    >
                        {deleteErrorMessage ? "Fermer" : "Annuler"}
                    </Button>
                    {!deleteErrorMessage ? (
                        <Button color="danger" onClick={handleSupprimer} disabled={deletingMomentId != null}>
                            {deletingMomentId != null ? "Suppression…" : "Confirmer la suppression"}
                        </Button>
                    ) : null}
                </ModalFooter>
            </Modal>

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

export default ListeMoments;
