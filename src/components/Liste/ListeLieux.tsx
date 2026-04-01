import { useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { LieuDto, SaveLieuRequest, EmplacementLieu } from "../../types/api";
import { sejourLieuService } from "../../services/sejour-lieu.service";
import { EmplacementLieuLabels, EmplacementLieuValues } from "../../enums/EmplacementLieu";
import styles from "./ListeLieux.module.scss";

export interface ListeLieuxProps {
    lieux: LieuDto[];
    sejourId: number;
}

function trierLieuxParNom(lieux: LieuDto[]): LieuDto[] {
    return [...lieux].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" }));
}

const EMPLACEMENT_FILTRE_TOUS = "" as const;

function filtrerLieuxParCritères(
    lieux: LieuDto[],
    emplacementFiltre: typeof EMPLACEMENT_FILTRE_TOUS | EmplacementLieu,
    capacitéMinStr: string
): { résultat: LieuDto[]; erreurCapacité: string | null; filtresActifs: boolean } {
    let seuil: number | undefined;
    let erreurCapacité: string | null = null;

    const t = capacitéMinStr.trim();
    if (t !== "") {
        const n = Number.parseInt(t, 10);
        if (Number.isNaN(n) || n < 1) {
            erreurCapacité = "Capacité minimale : saisir un entier ≥ 1.";
        } else {
            seuil = n;
        }
    }

    const filtrerCapacité = !erreurCapacité && seuil !== undefined;
    const filtresActifs = emplacementFiltre !== EMPLACEMENT_FILTRE_TOUS || t !== "";

    const résultat = lieux.filter((lieu) => {
        if (emplacementFiltre !== EMPLACEMENT_FILTRE_TOUS && lieu.emplacement !== emplacementFiltre) {
            return false;
        }
        if (filtrerCapacité && seuil !== undefined) {
            if (lieu.nombreMax != null && lieu.nombreMax < seuil) return false;
        }
        return true;
    });

    return { résultat, erreurCapacité, filtresActifs };
}

function ListeLieux({ lieux, sejourId }: ListeLieuxProps) {
    const revalidator = useRevalidator();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteLieuId, setPendingDeleteLieuId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingLieuId, setEditingLieuId] = useState<number | null>(null);
    const [deletingLieuId, setDeletingLieuId] = useState<number | null>(null);
    const [formNom, setFormNom] = useState("");
    const [formEmplacement, setFormEmplacement] = useState<EmplacementLieu>(EmplacementLieuValues[0]);
    const [formNombreMax, setFormNombreMax] = useState("");
    const [formPartageable, setFormPartageable] = useState(false);
    const [formMaxActivitesJour, setFormMaxActivitesJour] = useState("");
    const [filterEmplacement, setFilterEmplacement] = useState<typeof EMPLACEMENT_FILTRE_TOUS | EmplacementLieu>(
        EMPLACEMENT_FILTRE_TOUS
    );
    const [filterCapacitéMin, setFilterCapacitéMin] = useState("");

    const openModal = () => {
        setErrorMessage(null);
        setEditingLieuId(null);
        setFormNom("");
        setFormEmplacement(EmplacementLieuValues[0]);
        setFormNombreMax("");
        setFormPartageable(false);
        setFormMaxActivitesJour("");
        setModalOpen(true);
    };

    const showSuccessModal = (message: string) => {
        setSuccessMessage(message);
        setSuccessModalOpen(true);
    };

    const openEditModal = (lieu: LieuDto) => {
        setErrorMessage(null);
        setEditingLieuId(lieu.id);
        setFormNom(lieu.nom);
        setFormEmplacement(lieu.emplacement);
        setFormNombreMax(lieu.nombreMax != null ? String(lieu.nombreMax) : "");
        setFormPartageable(Boolean(lieu.partageableEntreAnimateurs));
        setFormMaxActivitesJour(
            lieu.nombreMaxActivitesSimultanees != null ? String(lieu.nombreMaxActivitesSimultanees) : ""
        );
        setModalOpen(true);
    };

    const buildPayload = (): SaveLieuRequest | null => {
        const nom = formNom.trim();
        if (!nom) {
            setErrorMessage("Le nom du lieu est obligatoire.");
            return null;
        }
        const rawCap = formNombreMax.trim();
        let nombreMax: number | null = null;
        if (rawCap !== "") {
            const n = Number.parseInt(rawCap, 10);
            if (Number.isNaN(n) || n < 1) {
                setErrorMessage("La capacité maximale doit être un entier supérieur ou égal à 1.");
                return null;
            }
            nombreMax = n;
        }
        let nombreMaxActivitesSimultanees: number | null = null;
        if (formPartageable) {
            const rawMaxAct = formMaxActivitesJour.trim();
            if (!rawMaxAct) {
                setErrorMessage(
                    "Nombre max d'activités le même jour obligatoire si le lieu est partageable entre animateurs (minimum 2)."
                );
                return null;
            }
            const m = Number.parseInt(rawMaxAct, 10);
            if (Number.isNaN(m) || m < 2) {
                setErrorMessage("Le nombre max d'activités le même jour doit être un entier supérieur ou égal à 2.");
                return null;
            }
            nombreMaxActivitesSimultanees = m;
        }
        return {
            nom,
            emplacement: formEmplacement,
            nombreMax,
            partageableEntreAnimateurs: formPartageable,
            nombreMaxActivitesSimultanees,
        };
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const payload = buildPayload();
        if (!payload) return;

        setSubmitting(true);
        try {
            if (editingLieuId == null) {
                await sejourLieuService.creerLieu(sejourId, payload);
                showSuccessModal("Lieu créé avec succès.");
            } else {
                await sejourLieuService.modifierLieu(sejourId, editingLieuId, payload);
                showSuccessModal("Lieu modifié avec succès.");
            }
            setModalOpen(false);
            setEditingLieuId(null);
            revalidator.revalidate();
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : editingLieuId == null
                      ? "Impossible de créer le lieu"
                      : "Impossible de modifier le lieu";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const requestDeleteLieu = (lieuId: number) => {
        setPendingDeleteLieuId(lieuId);
        setDeleteModalOpen(true);
    };

    const handleSupprimer = async () => {
        if (pendingDeleteLieuId == null) return;
        setErrorMessage(null);
        setDeletingLieuId(pendingDeleteLieuId);
        try {
            await sejourLieuService.supprimerLieu(sejourId, pendingDeleteLieuId);
            setDeleteModalOpen(false);
            setPendingDeleteLieuId(null);
            showSuccessModal("Lieu supprimé avec succès.");
            revalidator.revalidate();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Impossible de supprimer le lieu";
            setErrorMessage(msg);
        } finally {
            setDeletingLieuId(null);
        }
    };

    const { résultat: lieuxFiltrés, erreurCapacité, filtresActifs } = filtrerLieuxParCritères(
        lieux,
        filterEmplacement,
        filterCapacitéMin
    );
    const sorted = trierLieuxParNom(lieuxFiltrés);
    const réinitialiserFiltres = () => {
        setFilterEmplacement(EMPLACEMENT_FILTRE_TOUS);
        setFilterCapacitéMin("");
    };

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openModal}>
                    Ajouter un lieu
                </Button>
            </div>
            {lieux.length > 0 ? (
                <div className={styles.filtersBar}>
                    <div className={styles.filterField}>
                        <Label for="filtre-emplacement" className={styles.filterLabel}>
                            Emplacement
                        </Label>
                        <Input
                            id="filtre-emplacement"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            value={filterEmplacement}
                            onChange={(e) =>
                                setFilterEmplacement(e.target.value as typeof EMPLACEMENT_FILTRE_TOUS | EmplacementLieu)
                            }
                        >
                            <option value={EMPLACEMENT_FILTRE_TOUS}>Tous les emplacements</option>
                            {EmplacementLieuValues.map((v) => (
                                <option key={v} value={v}>
                                    {EmplacementLieuLabels[v]}
                                </option>
                            ))}
                        </Input>
                    </div>
                    <div className={`${styles.filterField} ${styles.filterFieldMax}`}>
                        <Label for="filtre-capacite-min" className={styles.filterLabel}>
                            Capacité min. (≥)
                        </Label>
                        <Input
                            id="filtre-capacite-min"
                            type="number"
                            bsSize="sm"
                            min={1}
                            step={1}
                            className={styles.filterInput}
                            value={filterCapacitéMin}
                            onChange={(e) => setFilterCapacitéMin(e.target.value)}
                            placeholder="ex. 10"
                        />
                    </div>                  
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
                    {filtresActifs && !erreurCapacité ? (
                        <p className={styles.filterMeta}>
                            {sorted.length} lieu{sorted.length !== 1 ? "x" : ""} sur {lieux.length}
                        </p>
                    ) : null}
                    {erreurCapacité ? <p className={styles.filterError}>{erreurCapacité}</p> : null}
                </div>
            ) : null}
            {errorMessage && !modalOpen && <div className={styles.errorMessage}>{errorMessage}</div>}

            {lieux.length === 0 ? (
                <p className={styles.empty}>Aucun lieu enregistré pour ce séjour (salles, terrains, etc.).</p>
            ) : sorted.length === 0 ? (
                <p className={styles.empty}>Aucun lieu ne correspond aux filtres sélectionnés.</p>
            ) : (
                <div className={styles.list}>
                    {sorted.map((lieu) => (
                        <article key={lieu.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.emplacementBadge}>{EmplacementLieuLabels[lieu.emplacement]}</span>
                                <span className={styles.nom}>{lieu.nom}</span>
                            </div>
                            <div className={styles.meta}>
                                <strong>Capacité max :</strong> {lieu.nombreMax != null ? lieu.nombreMax : "—"}
                            </div>
                            <div className={styles.meta}>
                                <strong>Partage possible :</strong>{" "}
                                {lieu.partageableEntreAnimateurs && lieu.nombreMaxActivitesSimultanees != null
                                    ? `Oui, ${lieu.nombreMaxActivitesSimultanees} activités maximum`
                                    : "Non"}
                            </div>
                            <div className={styles.cardActions}>
                                <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => openEditModal(lieu)}
                                    disabled={deletingLieuId === lieu.id}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => requestDeleteLieu(lieu.id)}
                                    disabled={deletingLieuId === lieu.id}
                                >
                                    {deletingLieuId === lieu.id ? "Suppression…" : "Supprimer"}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)}>
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {editingLieuId == null ? "Nouveau lieu" : "Modifier le lieu"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="lieu-nom">Nom</Label>
                        <Input
                            id="lieu-nom"
                            type="text"
                            value={formNom}
                            onChange={(e) => setFormNom(e.target.value)}
                            disabled={submitting}
                            maxLength={150}
                            required
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="lieu-emp">Emplacement</Label>
                        <Input
                            id="lieu-emp"
                            type="select"
                            value={formEmplacement}
                            onChange={(e) => setFormEmplacement(e.target.value as EmplacementLieu)}
                            disabled={submitting}
                        >
                            {EmplacementLieuValues.map((v) => (
                                <option key={v} value={v}>
                                    {EmplacementLieuLabels[v]}
                                </option>
                            ))}
                        </Input>
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="lieu-cap">Capacité maximale (optionnel)</Label>
                        <Input
                            id="lieu-cap"
                            type="number"
                            min={1}
                            step={1}
                            value={formNombreMax}
                            onChange={(e) => setFormNombreMax(e.target.value)}
                            disabled={submitting}
                            placeholder="Ex. 40"
                        />
                        <p className={styles.hint}>Laissez vide si la capacité ne s&apos;applique pas.</p>
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <div className={styles.checkboxRow}>
                            <Input
                                id="lieu-partage"
                                type="checkbox"
                                checked={formPartageable}
                                onChange={(e) => {
                                    setFormPartageable(e.target.checked);
                                    if (!e.target.checked) setFormMaxActivitesJour("");
                                }}
                                disabled={submitting}
                            />
                            <Label for="lieu-partage" className="mb-0">
                                Partageable entre animateurs (plusieurs activités le même jour sur ce lieu)
                            </Label>
                        </div>
                        {formPartageable ? (
                            <>
                                <Label for="lieu-max-act" className="mt-2">
                                    Nombre max d&apos;activités le même jour
                                </Label>
                                <Input
                                    id="lieu-max-act"
                                    type="number"
                                    min={2}
                                    step={1}
                                    value={formMaxActivitesJour}
                                    onChange={(e) => setFormMaxActivitesJour(e.target.value)}
                                    disabled={submitting}
                                    placeholder="Ex. 2"
                                />
                                <p className={styles.hint}>Minimum 2. Laissez vide tant que la case ci-dessus n&apos;est pas cochée.</p>
                            </>
                        ) : null}
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
                            color={editingLieuId == null ? "success" : "primary"}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Enregistrement…" : editingLieuId == null ? "Créer" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={deleteModalOpen} toggle={() => !deletingLieuId && setDeleteModalOpen(false)}>
                <ModalHeader toggle={() => !deletingLieuId && setDeleteModalOpen(false)}>
                    Confirmation de suppression
                </ModalHeader>
                <ModalBody>
                    <p>Voulez-vous vraiment supprimer ce lieu ?</p>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        onClick={() => {
                            setDeleteModalOpen(false);
                            setPendingDeleteLieuId(null);
                        }}
                        disabled={deletingLieuId != null}
                    >
                        Annuler
                    </Button>
                    <Button color="danger" onClick={handleSupprimer} disabled={deletingLieuId != null}>
                        {deletingLieuId != null ? "Suppression…" : "Confirmer la suppression"}
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

export default ListeLieux;
