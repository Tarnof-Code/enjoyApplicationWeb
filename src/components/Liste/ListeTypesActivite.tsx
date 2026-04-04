import { useMemo, useState } from "react";
import {
    Button,
    Collapse,
    FormGroup,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from "reactstrap";
import { SaveTypeActiviteRequest, TypeActiviteDto } from "../../types/api";
import { sejourTypeActiviteService } from "../../services/sejour-type-activite.service";
import styles from "./ListeTypesActivite.module.scss";

export interface ListeTypesActiviteProps {
    typesActivite: TypeActiviteDto[];
    sejourId: number;
    onTypeCreated?: (t: TypeActiviteDto) => void;
    onTypeUpdated?: (t: TypeActiviteDto) => void;
    onTypeDeleted?: (typeId: number) => void;
}

function trierParLibelle(a: TypeActiviteDto, b: TypeActiviteDto): number {
    return a.libelle.localeCompare(b.libelle, undefined, { sensitivity: "base" });
}

/** Aligné sur l’erreur 400 du backend quand `countByTypeActivite_Id` > 0 */
const MSG_SUPPRESSION_TYPE_UTILISE_PAR_ACTIVITES =
    "Impossible de supprimer ce type car des activités l'utilisent encore.";

function estErreurTypeUtiliseParDesActivites(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const m = error.message;
    return (
        /impossible de supprimer ce type d'activité/i.test(m) &&
        (/y sont encore associée/i.test(m) || /activité\(s\) y sont encore/i.test(m))
    );
}

function ListeTypesActivite({
    typesActivite,
    sejourId,
    onTypeCreated,
    onTypeUpdated,
    onTypeDeleted,
}: ListeTypesActiviteProps) {
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
    const [openPredefined, setOpenPredefined] = useState(true);
    const [openCustom, setOpenCustom] = useState(true);
    /** Après échec API : type encore référencé par des activités */
    const [suppressionBloqueeParActivites, setSuppressionBloqueeParActivites] = useState(false);
    const [deleteModalOtherError, setDeleteModalOtherError] = useState<string | null>(null);

    const fermerModalSuppression = () => {
        setDeleteModalOpen(false);
        setPendingDeleteId(null);
        setSuppressionBloqueeParActivites(false);
        setDeleteModalOtherError(null);
    };

    const typesPredefinis = useMemo(
        () => typesActivite.filter((t) => t.predefini).sort(trierParLibelle),
        [typesActivite]
    );
    const typesPersonnalises = useMemo(
        () => typesActivite.filter((t) => !t.predefini).sort(trierParLibelle),
        [typesActivite]
    );

    const openModalCreate = () => {
        setErrorMessage(null);
        setEditingId(null);
        setFormLibelle("");
        setModalOpen(true);
    };

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const openModalEdit = (t: TypeActiviteDto) => {
        if (t.predefini) return;
        setErrorMessage(null);
        setEditingId(t.id);
        setFormLibelle(t.libelle);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const libelle = formLibelle.trim();
        if (!libelle) {
            setErrorMessage("Le libellé est obligatoire.");
            return;
        }
        const payload: SaveTypeActiviteRequest = { libelle };

        setSubmitting(true);
        try {
            if (editingId == null) {
                const created = await sejourTypeActiviteService.creerTypeActivite(sejourId, payload);
                onTypeCreated?.(created);
                showSuccessModal("Type d'activité créé avec succès.");
            } else {
                const updated = await sejourTypeActiviteService.modifierTypeActivite(sejourId, editingId, payload);
                onTypeUpdated?.(updated);
                showSuccessModal("Type d'activité modifié avec succès.");
            }
            setModalOpen(false);
            setEditingId(null);
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingId == null
                      ? "Impossible de créer le type d'activité"
                      : "Impossible de modifier le type d'activité";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const requestDelete = (typeId: number, predefini: boolean) => {
        if (predefini) return;
        setPendingDeleteId(typeId);
        setSuppressionBloqueeParActivites(false);
        setDeleteModalOtherError(null);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteId == null) return;
        const idASupprimer = pendingDeleteId;
        setErrorMessage(null);
        setDeletingId(idASupprimer);
        try {
            await sejourTypeActiviteService.supprimerTypeActivite(sejourId, idASupprimer);
            fermerModalSuppression();
            showSuccessModal("Type d'activité supprimé avec succès.");
            onTypeDeleted?.(idASupprimer);
        } catch (e: unknown) {
            if (estErreurTypeUtiliseParDesActivites(e)) {
                setSuppressionBloqueeParActivites(true);
                setDeleteModalOtherError(null);
            } else {
                setSuppressionBloqueeParActivites(false);
                setDeleteModalOtherError(
                    e instanceof Error ? e.message : "Impossible de supprimer le type d'activité"
                );
            }
        } finally {
            setDeletingId(null);
        }
    };

    const renderListePredefinis = () => {
        if (typesPredefinis.length === 0) {
            return <p className={styles.empty}>Aucun type par défaut (contactez l&apos;administrateur).</p>;
        }
        return (
            <div className={styles.listPredefinis}>
                {typesPredefinis.map((t) => (
                    <article key={t.id} className={`${styles.card} ${styles.cardReadonly}`}>
                        <div className={styles.cardHeader}>
                            <span className={styles.nom}>{t.libelle}</span>                                           
                        </div>
                    </article>
                ))}
            </div>
        );
    };

    const renderListePersonnalises = () => (
        <>
            <div className={styles.sectionActions}>
                <Button color="success" size="sm" onClick={openModalCreate}>
                    Ajouter un type au séjour
                </Button>
            </div>
            {typesPersonnalises.length === 0 ? (
                <p className={styles.empty}>
                    Aucun type personnalisé. Les types ci-dessus suffisent souvent ; ajoutez les vôtres si besoin
                    (ex. sciences, sortie).
                </p>
            ) : (
                <div className={styles.list}>
                    {typesPersonnalises.map((t) => (
                        <article key={t.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.nom}>{t.libelle}</span>
                            </div>
                            <div className={styles.cardActions}>
                                <Button
                                    color="primary"
                                    size="sm"
                                    type="button"
                                    onClick={() => openModalEdit(t)}
                                    disabled={deletingId === t.id}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    type="button"
                                    onClick={() => requestDelete(t.id, t.predefini)}
                                    disabled={deletingId === t.id}
                                >
                                    {deletingId === t.id ? "Suppression…" : "Supprimer"}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <div>
            <p className={styles.hint}>
                Chaque activité doit avoir un type (Sport, Manuel, Expression, etc.) / 
                Six types par défaut sont proposés et vous pouvez ajouter vos propres types.
            </p>
            {errorMessage && !modalOpen && !deleteModalOpen && (
                <div className={styles.errorMessage}>{errorMessage}</div>
            )}

            <div className={styles.accordionBlock} data-accordion-types="predef">
                <button
                    type="button"
                    className={styles.accordionToggle}
                    aria-expanded={openPredefined}
                    onClick={() => setOpenPredefined((v) => !v)}
                >
                    <span>
                        Types par défaut
                        <span className={styles.accordionToggleMeta}> ({typesPredefinis.length})</span>
                    </span>
                    <span className={styles.chevron} aria-hidden>
                        {openPredefined ? "▼" : "▶"}
                    </span>
                </button>
                <Collapse isOpen={openPredefined}>
                    <div className={styles.accordionBodyInner}>{renderListePredefinis()}</div>
                </Collapse>
            </div>

            <div className={styles.accordionBlock} data-accordion-types="custom">
                <button
                    type="button"
                    className={styles.accordionToggle}
                    aria-expanded={openCustom}
                    onClick={() => setOpenCustom((v) => !v)}
                >
                    <span>
                        Types propres au séjour
                        <span className={styles.accordionToggleMeta}> ({typesPersonnalises.length})</span>
                    </span>
                    <span className={styles.chevron} aria-hidden>
                        {openCustom ? "▼" : "▶"}
                    </span>
                </button>
                <Collapse isOpen={openCustom}>
                    <div className={styles.accordionBodyInner}>{renderListePersonnalises()}</div>
                </Collapse>
            </div>

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)}>
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {editingId == null ? "Nouveau type d'activité" : "Modifier le type d'activité"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="type-act-libelle">Libellé</Label>
                        <Input
                            id="type-act-libelle"
                            type="text"
                            value={formLibelle}
                            onChange={(e) => setFormLibelle(e.target.value)}
                            disabled={submitting}
                            maxLength={100}
                            required
                        />
                        <p className={styles.hint}>Unique pour ce séjour (max. 100 caractères), sans tenir compte de la casse.</p>
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

            <Modal isOpen={deleteModalOpen} toggle={() => !deletingId && fermerModalSuppression()}>
                <ModalHeader toggle={() => !deletingId && fermerModalSuppression()}>
                    Confirmation de suppression
                </ModalHeader>
                <ModalBody>
                    {suppressionBloqueeParActivites ? (
                        <p className={styles.deleteModalError} role="alert">
                            {MSG_SUPPRESSION_TYPE_UTILISE_PAR_ACTIVITES}
                        </p>
                    ) : (
                        <>
                            <p>Voulez-vous vraiment supprimer ce type d&apos;activité ?</p>                          
                        </>
                    )}
                    {deleteModalOtherError ? (
                        <p className={styles.deleteModalError} role="alert">
                            {deleteModalOtherError}
                        </p>
                    ) : null}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={fermerModalSuppression} disabled={deletingId != null}>
                        {suppressionBloqueeParActivites ? "Fermer" : "Annuler"}
                    </Button>
                    {!suppressionBloqueeParActivites ? (
                        <Button color="danger" onClick={handleSupprimer} disabled={deletingId != null}>
                            {deletingId != null ? "Suppression…" : "Confirmer la suppression"}
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

export default ListeTypesActivite;
