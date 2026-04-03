import { useState } from "react";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { MomentDto, SaveMomentRequest } from "../../types/api";
import { trierMomentsChronologiquement } from "../../helpers/trierMomentsChronologiquement";
import { sejourMomentService } from "../../services/sejour-moment.service";
import styles from "./ListeMoments.module.scss";

export interface ListeMomentsProps {
    moments: MomentDto[];
    sejourId: number;
    /** Mises à jour locales après mutation API : évite de relancer tout le loader (6+ GET). */
    onMomentsReordered?: (moments: MomentDto[]) => void;
    onMomentCreated?: (moment: MomentDto) => void;
    onMomentUpdated?: (moment: MomentDto) => void;
    onMomentDeleted?: (momentId: number) => void;
}

function ListeMoments({
    moments,
    sejourId,
    onMomentsReordered,
    onMomentCreated,
    onMomentUpdated,
    onMomentDeleted,
}: ListeMomentsProps) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteMomentId, setPendingDeleteMomentId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingMomentId, setEditingMomentId] = useState<number | null>(null);
    const [deletingMomentId, setDeletingMomentId] = useState<number | null>(null);
    const [formNom, setFormNom] = useState("");
    const [reorderLoading, setReorderLoading] = useState(false);

    const openModal = () => {
        setErrorMessage(null);
        setEditingMomentId(null);
        setFormNom("");
        setModalOpen(true);
    };

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const openEditModal = (moment: MomentDto) => {
        setErrorMessage(null);
        setEditingMomentId(moment.id);
        setFormNom(moment.nom);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const nom = formNom.trim();
        if (!nom) {
            setErrorMessage("Le nom du moment est obligatoire.");
            return;
        }
        const payload: SaveMomentRequest = { nom };

        setSubmitting(true);
        try {
            if (editingMomentId == null) {
                const created = await sejourMomentService.creerMoment(sejourId, payload);
                onMomentCreated?.(created);
                showSuccessModal("Moment créé avec succès.");
            } else {
                const updated = await sejourMomentService.modifierMoment(sejourId, editingMomentId, payload);
                onMomentUpdated?.(updated);
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
        setPendingDeleteMomentId(momentId);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteMomentId == null) return;
        const momentIdASupprimer = pendingDeleteMomentId;
        setErrorMessage(null);
        setDeletingMomentId(momentIdASupprimer);
        try {
            await sejourMomentService.supprimerMoment(sejourId, momentIdASupprimer);
            setDeleteModalOpen(false);
            setPendingDeleteMomentId(null);
            showSuccessModal("Moment supprimé avec succès.");
            onMomentDeleted?.(momentIdASupprimer);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer le moment";
            setErrorMessage(msg);
        } finally {
            setDeletingMomentId(null);
        }
    };

    const moveMoment = async (fromIndex: number, toIndex: number) => {
        const sorted = trierMomentsChronologiquement(moments);
        if (toIndex < 0 || toIndex >= sorted.length) return;
        const ids = sorted.map((m) => m.id);
        const next = [...ids];
        const [removed] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, removed);
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

    const sorted = trierMomentsChronologiquement(moments);

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openModal}>
                    Ajouter un moment
                </Button>
            </div>
            <p className={styles.hint}>
                Les moments décrivent les créneaux de la journée (ex. matin, après-midi, soir). Ils sont affichés
                dans l&apos;ordre chronologique du séjour. Utilisez Monter / Descendre pour ajuster cet ordre (liste
                des activités et sélecteurs suivent le même ordre). Chaque activité doit être rattachée à un moment ;
                les noms sont uniques par séjour.
            </p>
            {errorMessage && !modalOpen && <div className={styles.errorMessage}>{errorMessage}</div>}

            {moments.length === 0 ? (
                <p className={styles.empty}>
                    Aucun moment n&apos;est défini. 
                </p>
            ) : (
                <div className={styles.list}>
                    {sorted.map((m, index) => (
                        <article key={m.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.nom}>{m.nom}</span>
                            </div>
                            {sorted.length > 1 && (
                                <div className={styles.reorderRow}>
                                    <Button
                                        color="secondary"
                                        outline
                                        size="sm"
                                        type="button"
                                        onClick={() => moveMoment(index, index - 1)}
                                        disabled={
                                            reorderLoading || deletingMomentId != null || index === 0
                                        }
                                        aria-label={`Monter « ${m.nom} »`}
                                    >
                                        Monter
                                    </Button>
                                    <Button
                                        color="secondary"
                                        outline
                                        size="sm"
                                        type="button"
                                        onClick={() => moveMoment(index, index + 1)}
                                        disabled={
                                            reorderLoading ||
                                            deletingMomentId != null ||
                                            index === sorted.length - 1
                                        }
                                        aria-label={`Descendre « ${m.nom} »`}
                                    >
                                        Descendre
                                    </Button>
                                </div>
                            )}
                            <div className={styles.cardActions}>
                                <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => openEditModal(m)}
                                    disabled={deletingMomentId === m.id || reorderLoading}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => requestDeleteMoment(m.id)}
                                    disabled={deletingMomentId === m.id || reorderLoading}
                                >
                                    {deletingMomentId === m.id ? "Suppression…" : "Supprimer"}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)}>
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {editingMomentId == null ? "Nouveau moment" : "Modifier le moment"}
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
                    <p>Voulez-vous vraiment supprimer ce moment ?</p>
                    <p className={styles.hint}>
                        La suppression est refusée si des activités y sont encore rattachées.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setPendingDeleteMomentId(null);
                        }}
                        disabled={deletingMomentId != null}
                    >
                        Annuler
                    </Button>
                    <Button color="danger" onClick={handleSupprimer} disabled={deletingMomentId != null}>
                        {deletingMomentId != null ? "Suppression…" : "Confirmer la suppression"}
                    </Button>
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
