import { useCallback, useEffect, useState } from "react";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import {
    ReferenceAlimentaireDto,
    ReferenceAlimentaireType,
    SaveReferenceAlimentaireRequest,
    UpdateReferenceAlimentaireRequest,
} from "../../types/api";
import { referencesAlimentairesService, trierReferencesAlimentaires } from "../../services/references-alimentaires.service";
import styles from "./ListeReferencesAlimentaires.module.scss";

function refsDuType(liste: ReferenceAlimentaireDto[], type: ReferenceAlimentaireType): ReferenceAlimentaireDto[] {
    return trierReferencesAlimentaires(liste.filter((r) => r.type === type));
}

function prochainOrdreSuggest(liste: ReferenceAlimentaireDto[], type: ReferenceAlimentaireType): number {
    const sous = liste.filter((r) => r.type === type);
    if (sous.length === 0) return 10;
    const max = Math.max(...sous.map((r) => r.ordre));
    return max + 10;
}

/**
 * Catalogue global allergènes / régimes — aligné API `GET /references-alimentaires` (afficher tout ce que renvoie l’API).
 */
function ListeReferencesAlimentaires() {
    const [liste, setListe] = useState<ReferenceAlimentaireDto[]>([]);
    const [chargement, setChargement] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalCreateType, setModalCreateType] = useState<ReferenceAlimentaireType | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formLibelle, setFormLibelle] = useState("");
    const [formActif, setFormActif] = useState(true);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const recharger = useCallback(async () => {
        setChargement(true);
        setErrorMessage(null);
        try {
            const data = await referencesAlimentairesService.getReferencesAlimentaires();
            setListe(data);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Impossible de charger le référentiel");
        } finally {
            setChargement(false);
        }
    }, []);

    useEffect(() => {
        void recharger();
    }, [recharger]);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setSuccessModalOpen(true);
    };

    const openCreate = (type: ReferenceAlimentaireType) => {
        setErrorMessage(null);
        setEditingId(null);
        setModalCreateType(type);
        setFormLibelle("");
        setFormActif(true);
        setModalOpen(true);
    };

    const openEdit = (r: ReferenceAlimentaireDto) => {
        setErrorMessage(null);
        setEditingId(r.id);
        setModalCreateType(null);
        setFormLibelle(r.libelle);
        setFormActif(r.actif);
        setModalOpen(true);
    };

    const handleSubmitModal = async () => {
        setErrorMessage(null);
        const libelle = formLibelle.trim();
        if (!libelle) {
            setErrorMessage("Le libellé est obligatoire.");
            return;
        }
        setSubmitting(true);
        try {
            if (editingId == null) {
                const type = modalCreateType;
                if (!type) {
                    setErrorMessage("Type manquant.");
                    setSubmitting(false);
                    return;
                }
                const ordre = prochainOrdreSuggest(liste, type);
                const body: SaveReferenceAlimentaireRequest = { type, libelle, ordre };
                await referencesAlimentairesService.creerReference(body);
                showSuccess("Référence créée.");
            } else {
                const refExistante = liste.find((r) => r.id === editingId);
                if (!refExistante) {
                    setErrorMessage("Référence introuvable.");
                    setSubmitting(false);
                    return;
                }
                const body: UpdateReferenceAlimentaireRequest = {
                    libelle,
                    ordre: refExistante.ordre,
                    actif: formActif,
                };
                await referencesAlimentairesService.modifierReference(editingId, body);
                showSuccess("Référence mise à jour.");
            }
            setModalOpen(false);
            setEditingId(null);
            setModalCreateType(null);
            await recharger();
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Enregistrement impossible");
        } finally {
            setSubmitting(false);
        }
    };

    const requestDelete = (id: number) => {
        setErrorMessage(null);
        setPendingDeleteId(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (pendingDeleteId == null) return;
        const id = pendingDeleteId;
        setDeletingId(id);
        setErrorMessage(null);
        try {
            await referencesAlimentairesService.supprimerReference(id);
            setDeleteModalOpen(false);
            setPendingDeleteId(null);
            showSuccess("Référence supprimée.");
            await recharger();
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Suppression impossible");
        } finally {
            setDeletingId(null);
        }
    };

    const allergenes = refsDuType(liste, "ALLERGENE");
    const regimes = refsDuType(liste, "REGIME_PREFERENCE");

    const renderListe = (sousListe: ReferenceAlimentaireDto[], type: ReferenceAlimentaireType, titre: string) => (
        <div className={styles.subSection}>
            <div className={styles.subSectionHeader}>
                <h3 className={styles.subTitle}>{titre}</h3>
                <div className={styles.actionsContainer}>
                    <Button color="success" size="sm" onClick={() => openCreate(type)} disabled={chargement}>
                        Ajouter
                    </Button>
                </div>
            </div>
            {sousListe.length === 0 ? (
                <p className={styles.empty}>Aucune entrée.</p>
            ) : (
                <div className={styles.list}>
                    {sousListe.map((r) => (
                        <article key={r.id} className={`${styles.card} ${!r.actif ? styles.cardInactive : ""}`}>
                            <div className={styles.cardHeader}>
                                <span className={styles.libelle}>{r.libelle}</span>
                                {!r.actif && <span className={styles.badgeInactive}>Inactif</span>}
                            </div>
                            <div className={styles.cardActions}>
                                <Button color="primary" size="sm" onClick={() => openEdit(r)} disabled={deletingId === r.id}>
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => requestDelete(r.id)}
                                    disabled={deletingId === r.id}
                                >
                                    Supprimer
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );

    if (chargement && liste.length === 0) {
        return <p className={styles.hint}>Chargement du référentiel alimentaire…</p>;
    }

    return (
        <div>           
            {errorMessage && !modalOpen && !deleteModalOpen && <div className={styles.errorMessage}>{errorMessage}</div>}

            {renderListe(allergenes, "ALLERGENE", "Allergènes")}
            {renderListe(regimes, "REGIME_PREFERENCE", "Régimes et préférences")}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)} size="lg">
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {editingId == null
                        ? modalCreateType === "ALLERGENE"
                            ? "Nouvel allergène"
                            : "Nouveau régime ou préférence"
                        : "Modifier la référence"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="ref-libelle">Libellé</Label>
                        <Input
                            id="ref-libelle"
                            type="text"
                            value={formLibelle}
                            onChange={(e) => setFormLibelle(e.target.value)}
                            disabled={submitting}
                            autoComplete="off"
                        />
                    </FormGroup>
                    {editingId != null && (
                        <FormGroup check className={styles.modalField}>
                            <Label check>
                                <Input
                                    type="checkbox"
                                    checked={formActif}
                                    onChange={(e) => setFormActif(e.target.checked)}
                                    disabled={submitting}
                                />{" "}
                                Actif
                            </Label>
                        </FormGroup>
                    )}
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <div className={styles.modalFooterMessage} aria-live="polite">
                        {errorMessage ? <span className={styles.modalFooterError}>{errorMessage}</span> : null}
                    </div>
                    <div className={styles.modalFooterActions}>
                        <Button color="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                            Annuler
                        </Button>
                        <Button color="success" onClick={() => void handleSubmitModal()} disabled={submitting}>
                            {submitting ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModalOpen} toggle={() => !deletingId && setDeleteModalOpen(false)}>
                <ModalHeader toggle={() => !deletingId && setDeleteModalOpen(false)}>Supprimer la référence</ModalHeader>
                <ModalBody>
                    <p>
                        Confirmer la suppression ? Elle est refusée si la référence est encore liée à un dossier enfant ou à un
                        menu repas.
                    </p>
                    {errorMessage && <p className={styles.modalFooterError}>{errorMessage}</p>}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deletingId != null}>
                        Annuler
                    </Button>
                    <Button color="danger" onClick={() => void handleDelete()} disabled={deletingId != null}>
                        {deletingId != null ? "Suppression…" : "Supprimer"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={successModalOpen} toggle={() => setSuccessModalOpen(false)}>
                <ModalHeader toggle={() => setSuccessModalOpen(false)}>Succès</ModalHeader>
                <ModalBody>
                    <p>{successMessage}</p>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => setSuccessModalOpen(false)}>
                        OK
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default ListeReferencesAlimentaires;
