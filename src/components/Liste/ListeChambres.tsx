import { useMemo, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import ReferentsSelector, { EquipePerson } from "../Forms/ReferentsSelector";
import {
    ChambreDto,
    SaveChambreRequest,
    TypeChambre,
    GenreChambre,
} from "../../types/api";
import { sejourChambreService } from "../../services/sejour-chambre.service";
import { TypeChambreLabels, TypeChambreValues } from "../../enums/TypeChambre";
import { GenreChambreLabels, GenreChambreValues } from "../../enums/GenreChambre";
import { libelleChambre, resumeLocalisation } from "../../helpers/libelleChambre";
import styles from "./ListeChambres.module.scss";

export interface ListeChambresProps {
    chambres: ChambreDto[];
    sejourId: number;
    /** Directeur ou adjoint : CRUD + référents ; sinon consultation seule */
    peutGererChambres: boolean;
    equipe?: EquipePerson[];
}

const FILTRE_TOUS = "" as const;

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
    batimentFiltre: typeof FILTRE_TOUS | string
): { résultat: ChambreDto[]; filtresActifs: boolean } {
    const filtresActifs =
        typeFiltre !== FILTRE_TOUS || genreFiltre !== FILTRE_TOUS || batimentFiltre !== FILTRE_TOUS;

    const résultat = chambres.filter((c) => {
        if (typeFiltre !== FILTRE_TOUS && c.typeChambre !== typeFiltre) return false;
        if (genreFiltre !== FILTRE_TOUS && c.genreAutorise !== genreFiltre) return false;
        if (batimentFiltre !== FILTRE_TOUS && (c.batiment?.trim() ?? "") !== batimentFiltre) return false;
        return true;
    });

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

function ListeChambres({ chambres, sejourId, peutGererChambres, equipe = [] }: ListeChambresProps) {
    const revalidator = useRevalidator();
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

    const [formTypeChambre, setFormTypeChambre] = useState<TypeChambre>("ENFANT");
    const [formIdentifiant, setFormIdentifiant] = useState("");
    const [formNom, setFormNom] = useState("");
    const [formCapaciteMax, setFormCapaciteMax] = useState("");
    const [formGenreAutorise, setFormGenreAutorise] = useState<GenreChambre>("MIXTE");
    const [formDescription, setFormDescription] = useState("");
    const [formBatiment, setFormBatiment] = useState("");
    const [formCouloir, setFormCouloir] = useState("");
    const [formEtage, setFormEtage] = useState("");
    const [formReferents, setFormReferents] = useState("[]");

    const [filterType, setFilterType] = useState<typeof FILTRE_TOUS | TypeChambre>(FILTRE_TOUS);
    const [filterGenre, setFilterGenre] = useState<typeof FILTRE_TOUS | GenreChambre>(FILTRE_TOUS);
    const [filterBatiment, setFilterBatiment] = useState<typeof FILTRE_TOUS | string>(FILTRE_TOUS);

    const batimentsDistincts = useMemo(() => {
        const set = new Set<string>();
        for (const c of chambres) {
            const b = c.batiment?.trim();
            if (b) set.add(b);
        }
        return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }, [chambres]);

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
            setErrorMessage("Le surnom ne doit pas dépasser 150 caractères.");
            return null;
        }
        const descTrim = formDescription.trim();
        if (descTrim.length > 2000) {
            setErrorMessage("La description ne doit pas dépasser 2000 caractères.");
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
        return {
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
            showSuccessModal("Chambre créée avec succès.");
        } else {
            await sejourChambreService.modifierChambre(sejourId, editingChambre.id, payload);
            if (formTypeChambre === "ENFANT") {
                await synchroniserReferents(
                    sejourId,
                    editingChambre.id,
                    editingChambre.referents ?? [],
                    selectedReferentIds
                );
            }
            showSuccessModal("Chambre modifiée avec succès.");
        }
        setModalOpen(false);
        setEditingChambre(null);
        setTypeChangeConfirmOpen(false);
        revalidator.revalidate();
    };

    const handleSubmit = async () => {
        setErrorMessage(null);
        const payload = buildPayload();
        if (!payload) return;

        if (doitConfirmerChangementType()) {
            setTypeChangeConfirmOpen(true);
            return;
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
        setErrorMessage(null);
        setDeletingChambreId(pendingDeleteChambreId);
        try {
            await sejourChambreService.supprimerChambre(sejourId, pendingDeleteChambreId);
            setDeleteModalOpen(false);
            setPendingDeleteChambreId(null);
            showSuccessModal("Chambre supprimée avec succès.");
            revalidator.revalidate();
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
        filterBatiment
    );

    const réinitialiserFiltres = () => {
        setFilterType(FILTRE_TOUS);
        setFilterGenre(FILTRE_TOUS);
        setFilterBatiment(FILTRE_TOUS);
    };

    return (
        <div>
            {peutGererChambres ? (
                <div className={styles.actionsContainer}>
                    <Button color="success" onClick={openModal}>
                        Ajouter une chambre
                    </Button>
                </div>
            ) : null}

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
                            onChange={(e) => setFilterType(e.target.value as typeof FILTRE_TOUS | TypeChambre)}
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
                            Genre autorisé
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
                    {batimentsDistincts.length > 0 ? (
                        <div className={styles.filterField}>
                            <Label for="filtre-batiment-chambre" className={styles.filterLabel}>
                                Bâtiment
                            </Label>
                            <Input
                                id="filtre-batiment-chambre"
                                type="select"
                                bsSize="sm"
                                className={styles.filterInput}
                                value={filterBatiment}
                                onChange={(e) => setFilterBatiment(e.target.value)}
                            >
                                <option value={FILTRE_TOUS}>Tous les bâtiments</option>
                                {batimentsDistincts.map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </Input>
                        </div>
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
                    {filtresActifs ? (
                        <p className={styles.filterMeta}>
                            {chambresFiltrées.length} chambre{chambresFiltrées.length !== 1 ? "s" : ""} sur{" "}
                            {chambres.length}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {errorMessage && !modalOpen && !typeChangeConfirmOpen ? (
                <div className={styles.errorMessage}>{errorMessage}</div>
            ) : null}

            {chambres.length === 0 ? (
                <p className={styles.empty}>
                    Aucune chambre enregistrée pour ce séjour.
                    {peutGererChambres ? " Cliquez sur « Ajouter une chambre » pour commencer." : null}
                </p>
            ) : chambresFiltrées.length === 0 ? (
                <p className={styles.empty}>Aucune chambre ne correspond aux filtres sélectionnés.</p>
            ) : (
                <div className={styles.list}>
                    {chambresFiltrées.map((chambre) => (
                        <article key={chambre.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.typeBadge}>{TypeChambreLabels[chambre.typeChambre]}</span>
                                <span className={styles.identifiant}>{libelleChambre(chambre)}</span>
                            </div>
                            <div className={styles.meta}>
                                <strong>Capacité :</strong> {chambre.capaciteMax} place
                                {chambre.capaciteMax > 1 ? "s" : ""}
                            </div>
                            <div className={styles.meta}>
                                <strong>Genre autorisé :</strong> {GenreChambreLabels[chambre.genreAutorise]}
                            </div>
                            <div className={styles.meta}>
                                <strong>Localisation :</strong> {resumeLocalisation(chambre)}
                            </div>
                            {chambre.description?.trim() ? (
                                <div className={styles.meta}>
                                    <strong>Description :</strong> {chambre.description.trim()}
                                </div>
                            ) : null}
                            {chambre.typeChambre === "ENFANT" ? (
                                <div className={styles.referentsRow}>
                                    <span className={styles.referentsLabel}>Référents : </span>
                                    {(chambre.referents?.length ?? 0) > 0
                                        ? chambre.referents!.map((r) => `${r.prenom} ${r.nom}`).join(", ")
                                        : "Pas de référent pour cette chambre"}
                                </div>
                            ) : null}
                            {peutGererChambres ? (
                                <div className={styles.cardActions}>
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
                            ) : null}
                        </article>
                    ))}
                </div>
            )}

            <div className={styles.occupantsPlaceholder} aria-hidden="false">
                <p className={styles.occupantsPlaceholderTitle}>Affectation des occupants</p>
                <p>
                    L&apos;affectation des enfants et des membres d&apos;équipe aux chambres sera disponible prochainement.
                </p>
            </div>

            {peutGererChambres ? (
                <>
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
                                        if (next === "EQUIPE") setFormReferents("[]");
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
                                <Label for="chambre-nom">Surnom (optionnel)</Label>
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
                                />
                            </FormGroup>
                            <FormGroup className={styles.modalField}>
                                <Label for="chambre-genre">Genre autorisé</Label>
                                <Input
                                    id="chambre-genre"
                                    type="select"
                                    value={formGenreAutorise}
                                    onChange={(e) => setFormGenreAutorise(e.target.value as GenreChambre)}
                                    disabled={submitting}
                                >
                                    {GenreChambreValues.map((v) => (
                                        <option key={v} value={v}>
                                            {GenreChambreLabels[v]}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
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
                                    type="number"
                                    step={1}
                                    value={formEtage}
                                    onChange={(e) => setFormEtage(e.target.value)}
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
                                <Label for="chambre-description">Description (optionnel)</Label>
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
                                    equipe={equipe}
                                    disabled={submitting}
                                    label="Référents animateurs"
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
                                    disabled={submitting}
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
                                actuellement associés seront supprimés définitivement.
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
                </>
            ) : null}

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
