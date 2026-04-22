import { useState } from "react";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { HoraireDto, SaveHoraireRequest } from "../../types/api";
import { sejourHoraireService } from "../../services/sejour-horaire.service";
import { validerLibelleHoraire } from "../../helpers/validerLibelleHoraire";
import { trierHorairesChronologiquement } from "../../helpers/trierHorairesChronologiquement";
import styles from "./ListeHoraires.module.scss";

export interface ListeHorairesProps {
    horaires: HoraireDto[];
    sejourId: number;
    onHoraireCreated?: (h: HoraireDto) => void;
    onHoraireUpdated?: (h: HoraireDto) => void;
    onHoraireDeleted?: (horaireId: number) => void;
}

function ListeHoraires({
    horaires,
    sejourId,
    onHoraireCreated,
    onHoraireUpdated,
    onHoraireDeleted,
}: ListeHorairesProps) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [formLibelle, setFormLibelle] = useState("");

    const openModal = () => {
        setErrorMessage(null);
        setEditingId(null);
        setFormLibelle("");
        setModalOpen(true);
    };

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const openEditModal = (h: HoraireDto) => {
        setErrorMessage(null);
        setEditingId(h.id);
        setFormLibelle(h.libelle);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const err = validerLibelleHoraire(formLibelle);
        if (err) {
            setErrorMessage(err);
            return;
        }
        const libelle = formLibelle.trim();
        const payload: SaveHoraireRequest = { libelle };

        setSubmitting(true);
        try {
            if (editingId == null) {
                const created = await sejourHoraireService.creerHoraire(sejourId, payload);
                onHoraireCreated?.(created);
                showSuccessModal("Horaire créé avec succès.");
            } else {
                const updated = await sejourHoraireService.modifierHoraire(sejourId, editingId, payload);
                onHoraireUpdated?.(updated);
                showSuccessModal("Horaire modifié avec succès.");
            }
            setModalOpen(false);
            setEditingId(null);
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingId == null
                      ? "Impossible de créer l'horaire"
                      : "Impossible de modifier l'horaire";
            setErrorMessage(msg);
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
        const idSuppr = pendingDeleteId;
        setErrorMessage(null);
        setDeletingId(idSuppr);
        try {
            await sejourHoraireService.supprimerHoraire(sejourId, idSuppr);
            setDeleteModalOpen(false);
            setPendingDeleteId(null);
            showSuccessModal("Horaire supprimé avec succès.");
            onHoraireDeleted?.(idSuppr);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer l'horaire";
            setErrorMessage(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const sorted = trierHorairesChronologiquement(horaires);

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openModal}>
                    Ajouter un horaire
                </Button>
            </div>
            <p className={styles.hint}>
                Libellés d&apos;heure pour le séjour (ex. 8h30, 12h00). Format : heures 0 à 23, minutes sur deux
                chiffres, sans espace. Chaque libellé est unique pour ce séjour (insensible à la casse côté serveur).
            </p>
            {errorMessage && !modalOpen && <div className={styles.errorMessage}>{errorMessage}</div>}

            {horaires.length === 0 ? (
                <p className={styles.empty}>Aucun horaire n&apos;est défini.</p>
            ) : (
                <div className={styles.list}>
                    {sorted.map((h) => (
                        <article key={h.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.libelle}>{h.libelle}</span>
                            </div>
                            <div className={styles.cardActions}>
                                <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => openEditModal(h)}
                                    disabled={deletingId === h.id}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => requestDelete(h.id)}
                                    disabled={deletingId === h.id}
                                >
                                    {deletingId === h.id ? "Suppression…" : "Supprimer"}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)}>
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {editingId == null ? "Nouvel horaire" : "Modifier l'horaire"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="horaire-libelle">Libellé</Label>
                        <Input
                            id="horaire-libelle"
                            type="text"
                            value={formLibelle}
                            onChange={(e) => setFormLibelle(e.target.value)}
                            disabled={submitting}
                            maxLength={8}
                            placeholder="ex. 8h30"
                            autoComplete="off"
                        />
                        <p className={styles.hint}>Ex. 6h00, 14h15, 23h45 (max. 8 caractères côté API).</p>
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
                            color={editingId == null ? "success" : "primary"}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Enregistrement…" : editingId == null ? "Créer" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModalOpen} toggle={() => !deletingId && setDeleteModalOpen(false)}>
                <ModalHeader toggle={() => !deletingId && setDeleteModalOpen(false)}>
                    Confirmation de suppression
                </ModalHeader>
                <ModalBody>
                    <p>Voulez-vous vraiment supprimer cet horaire ?</p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setPendingDeleteId(null);
                        }}
                        disabled={deletingId != null}
                    >
                        Annuler
                    </Button>
                    <Button color="danger" onClick={handleSupprimer} disabled={deletingId != null}>
                        {deletingId != null ? "Suppression…" : "Confirmer la suppression"}
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

export default ListeHoraires;
