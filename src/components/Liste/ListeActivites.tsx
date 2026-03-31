import React, { useEffect, useMemo, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import {
    ActiviteDto,
    CreateActiviteRequest,
    EmplacementLieu,
    GroupeDto,
    LieuDto,
    SejourDTO,
    UpdateActiviteRequest,
} from "../../types/api";
import { EmplacementLieuLabels, EmplacementLieuValues } from "../../enums/EmplacementLieu";
import { sejourActiviteService } from "../../services/sejour-activite.service";
import formaterDate, { parseDate } from "../../helpers/formaterDate";
import styles from "./ListeActivites.module.scss";

export interface MembreEquipeSejour {
    tokenId: string;
    nom: string;
    prenom: string;
}

export interface ListeActivitesProps {
    activites: ActiviteDto[];
    sejour: SejourDTO;
    groupes: GroupeDto[];
    equipe: MembreEquipeSejour[];
    lieux: LieuDto[];
}

function formatActiviteDateForDisplay(date: ActiviteDto["date"]): string {
    if (Array.isArray(date)) {
        const [y, m, d] = date as unknown as number[];
        if (y != null && m != null && d != null) {
            return formaterDate(new Date(y, m - 1, d));
        }
    }
    const parsed = parseDate(date as string);
    return parsed ? formaterDate(parsed) : String(date);
}

/**
 * SejourDto.dateDebut est un java.util.Date : JSON = chaîne ISO (AI_MEMORY) ou nombre (timestamp ms).
 */
function sejourDebutToInputDate(value: SejourDTO["dateDebut"]): string {
    if (typeof value === "string") {
        const t = value.trim();
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const d = parseDate(value);
    if (d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function activiteDateToInputDate(value: ActiviteDto["date"]): string {
    if (typeof value === "string") {
        const t = value.trim();
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const d = parseDate(value as string);
    if (d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return "";
}

function trierLieuxParNom(lieux: LieuDto[]): LieuDto[] {
    return [...lieux].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" }));
}

function resumePartageLieu(l: LieuDto): string {
    if (l.partageableEntreAnimateurs && l.nombreMaxActivitesSimultanees != null) {
        return `Jusqu'à ${l.nombreMaxActivitesSimultanees} activités.`;
    }
    return "Une seule activité à la fois.";
}

const EMPLACEMENT_FILTRE_TOUS_ACTIVITE = "" as const;

const ListeActivites: React.FC<ListeActivitesProps> = ({ activites, sejour, groupes, equipe, lieux }) => {
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
    const [filtreEmplacementLieu, setFiltreEmplacementLieu] = useState<
        typeof EMPLACEMENT_FILTRE_TOUS_ACTIVITE | EmplacementLieu
    >(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);

    const openModal = () => {
        setErrorMessage(null);
        setEditingActiviteId(null);
        setFormDate(sejourDebutToInputDate(sejour.dateDebut));
        setFormNom("");
        setFormDescription("");
        const initialGroupes = new Set<number>();
        if (groupes.length === 1) initialGroupes.add(groupes[0].id);
        setSelectedGroupeIds(initialGroupes);
        const initial = new Set<string>();
        if (equipe.length === 1) initial.add(equipe[0].tokenId);
        setSelectedTokens(initial);
        setFormLieuId("");
        setFiltreEmplacementLieu(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);
        setModalOpen(true);
    };

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

        const payload: CreateActiviteRequest | UpdateActiviteRequest = {
            date: formDate,
            nom: formNom.trim(),
            membreTokenIds: [...selectedTokens],
            groupeIds: [...selectedGroupeIds].sort((x, y) => x - y),
        };
        const desc = formDescription.trim();
        if (desc) payload.description = desc;

        if (formLieuId !== "") {
            payload.lieuId = formLieuId;
        } else if (editingActiviteId != null) {
            payload.lieuId = null;
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

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openModal} disabled={equipe.length === 0 || groupes.length === 0}>
                    Ajouter une activité
                </Button>
            </div>
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

            {activites.length === 0 ? (
                <p className={styles.empty}>Aucune activité planifiée pour ce séjour.</p>
            ) : (
                <div className={styles.list}>
                    {activites.map((a) => (
                        <article key={a.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.dateBadge}>{formatActiviteDateForDisplay(a.date)}</span>
                                <span className={styles.nom}>{a.nom}</span>
                            </div>
                            <div className={styles.meta}>
                                <strong>Animateurs :</strong>{" "}
                                {a.membres?.length
                                    ? a.membres.map((m) => `${m.prenom} ${m.nom}`.trim()).join(", ")
                                    : "—"}
                            </div>
                            {a.lieu ? (
                                <div className={styles.meta}>
                                    <strong>Lieu :</strong> {a.lieu.nom} — {resumePartageLieu(a.lieu)}
                                </div>
                            ) : null}
                            {a.groupeIds?.length ? (
                                <div className={styles.meta}>
                                    <strong>Groupes :</strong>{" "}
                                    {a.groupeIds
                                        .map((id) => groupes.find((g) => g.id === id)?.nom)
                                        .filter(Boolean)
                                        .join(", ") || "—"}
                                </div>
                            ) : null}
                            {a.description ? <p className={styles.description}>{a.description}</p> : null}
                            <div className={styles.cardActions}>
                                <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => openEditModal(a)}
                                    disabled={deletingActiviteId === a.id}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => requestDeleteActivite(a.id)}
                                    disabled={deletingActiviteId === a.id}
                                >
                                    {deletingActiviteId === a.id ? "Suppression…" : "Supprimer"}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} toggle={() => !submitting && setModalOpen(false)} size="lg">
                <ModalHeader toggle={() => !submitting && setModalOpen(false)}>
                    {editingActiviteId == null ? "Nouvelle activité" : "Modifier l'activité"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-date">Date</Label>
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
                        <Label for="act-nom">Nom</Label>
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
                        <Label>Groupes concernés</Label>
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
                        <Label>Animateurs (membres de l&apos;équipe du séjour)</Label>
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
