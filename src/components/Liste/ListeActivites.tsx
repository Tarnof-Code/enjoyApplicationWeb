import React, { useEffect, useMemo, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import {
    ActiviteDto,
    CreateActiviteRequest,
    EmplacementLieu,
    GroupeDto,
    LieuDto,
    MomentDto,
    SejourDTO,
    TypeActiviteDto,
    UpdateActiviteRequest,
} from "../../types/api";
import { EmplacementLieuLabels, EmplacementLieuValues } from "../../enums/EmplacementLieu";
import { sejourActiviteService } from "../../services/sejour-activite.service";
import formaterDate, { parseDate } from "../../helpers/formaterDate";
import { trierMomentsChronologiquement } from "../../helpers/trierMomentsChronologiquement";
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
    moments: MomentDto[];
    typesActivite: TypeActiviteDto[];
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

function dateDuJourVersInputDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Champ date d’un séjour (dateDebut / dateFin) : JSON = chaîne ISO ou nombre (timestamp ms).
 */
function sejourChampDateVersInput(value: string | number): string {
    if (typeof value === "string") {
        const t = value.trim();
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const d = parseDate(value);
    if (d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return dateDuJourVersInputDate();
}

function sejourDebutToInputDate(value: SejourDTO["dateDebut"]): string {
    return sejourChampDateVersInput(value);
}

const JOURS_COURTS_FR: readonly string[] = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Abréviations courantes des mois (janv. → déc.) pour les boutons jour */
const MOIS_COURTS_FR: readonly string[] = [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
];

function parseYmdVersDateLocale(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
}

function libelleJourCourtPourBouton(d: Date): string {
    const mois = MOIS_COURTS_FR[d.getMonth()] ?? "";
    return `${JOURS_COURTS_FR[d.getDay()]} ${d.getDate()} ${mois}`.trim();
}

/** Tous les jours calendaires du séjour (début → fin inclus), pour les boutons de filtre. */
function enumererJoursDuSejour(sejour: SejourDTO): { ymd: string; label: string }[] {
    const debutStr = sejourChampDateVersInput(sejour.dateDebut);
    const finStr = sejourChampDateVersInput(sejour.dateFin);
    const debut = parseYmdVersDateLocale(debutStr);
    const fin = parseYmdVersDateLocale(finStr);
    if (!debut || !fin) {
        const d = debut ?? fin ?? new Date();
        const y = d.getFullYear();
        const mo = d.getMonth() + 1;
        const day = d.getDate();
        const ymd = `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return [{ ymd: debut ? debutStr : fin ? finStr : ymd, label: libelleJourCourtPourBouton(debut ?? fin ?? d) }];
    }
    if (fin < debut) {
        return [{ ymd: debutStr, label: libelleJourCourtPourBouton(debut) }];
    }
    const out: { ymd: string; label: string }[] = [];
    const cur = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate());
    const finCl = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
    while (cur <= finCl) {
        const y = cur.getFullYear();
        const mo = cur.getMonth() + 1;
        const day = cur.getDate();
        const ymd = `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        out.push({ ymd, label: libelleJourCourtPourBouton(cur) });
        cur.setDate(cur.getDate() + 1);
    }
    return out;
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

/** Valeur du select « lieu » pour n’afficher que les activités sans lieu */
const FILTRE_LISTE_LIEU_SANS = "__sans_lieu__";

function activiteDateToFilterKey(value: ActiviteDto["date"]): string {
    if (Array.isArray(value)) {
        const [y, m, d] = value as unknown as number[];
        if (y != null && m != null && d != null) {
            return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
    }
    return activiteDateToInputDate(value as string);
}

function trierTypesParLibelle(a: TypeActiviteDto, b: TypeActiviteDto): number {
    return a.libelle.localeCompare(b.libelle, undefined, { sensitivity: "base" });
}

const ListeActivites: React.FC<ListeActivitesProps> = ({
    activites,
    sejour,
    groupes,
    equipe,
    lieux,
    moments,
    typesActivite,
}) => {
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
    /** Moment obligatoire dès qu'au moins un créneau existe pour le séjour */
    const [formMomentId, setFormMomentId] = useState<number | "">("");
    /** Obligatoire côté API pour toute activité */
    const [formTypeActiviteId, setFormTypeActiviteId] = useState<number | "">("");
    const [filtreEmplacementLieu, setFiltreEmplacementLieu] = useState<
        typeof EMPLACEMENT_FILTRE_TOUS_ACTIVITE | EmplacementLieu
    >(EMPLACEMENT_FILTRE_TOUS_ACTIVITE);

    /** Filtres sur la liste (cumulables, ET logique) ; date = yyyy-MM-dd ou vide (toutes les dates) */
    const [filtreListeDate, setFiltreListeDate] = useState(() => sejourChampDateVersInput(sejour.dateDebut));
    const [filtreListeLieu, setFiltreListeLieu] = useState("");
    const [filtreListeGroupe, setFiltreListeGroupe] = useState("");
    const [filtreListeAnimateur, setFiltreListeAnimateur] = useState("");
    const [filtreListeType, setFiltreListeType] = useState("");

    const momentsTriés = trierMomentsChronologiquement(moments);
    const typesPredefinisSelect = useMemo(
        () => typesActivite.filter((t) => t.predefini).sort(trierTypesParLibelle),
        [typesActivite]
    );
    const typesPersoSelect = useMemo(
        () => typesActivite.filter((t) => !t.predefini).sort(trierTypesParLibelle),
        [typesActivite]
    );

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
        if (momentsTriés.length === 1) {
            setFormMomentId(momentsTriés[0].id);
        } else {
            setFormMomentId("");
        }
        const typesOrdonnes = [...typesPredefinisSelect, ...typesPersoSelect];
        if (typesOrdonnes.length === 1) {
            setFormTypeActiviteId(typesOrdonnes[0].id);
        } else {
            setFormTypeActiviteId("");
        }
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
        setFormMomentId(activite.moment?.id ?? "");
        setFormTypeActiviteId(activite.typeActivite?.id ?? "");
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

    const groupesTriésFiltre = useMemo(
        () => [...groupes].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" })),
        [groupes]
    );
    const equipeTriéeFiltre = useMemo(
        () =>
            [...equipe].sort((a, b) => {
                const pa = `${a.prenom} ${a.nom}`.trim();
                const pb = `${b.prenom} ${b.nom}`.trim();
                return pa.localeCompare(pb, undefined, { sensitivity: "base" });
            }),
        [equipe]
    );
    const typesTriésFiltre = useMemo(
        () => [...typesActivite].sort(trierTypesParLibelle),
        [typesActivite]
    );
    const lieuxTriésListe = useMemo(() => trierLieuxParNom(lieux), [lieux]);

    const joursDuSejourPourFiltre = useMemo(() => enumererJoursDuSejour(sejour), [sejour.dateDebut, sejour.dateFin]);

    useEffect(() => {
        const jours = enumererJoursDuSejour(sejour);
        setFiltreListeDate(jours[0]?.ymd ?? sejourChampDateVersInput(sejour.dateDebut));
        setFiltreListeLieu("");
        setFiltreListeGroupe("");
        setFiltreListeAnimateur("");
        setFiltreListeType("");
    }, [sejour.id, sejour.dateDebut, sejour.dateFin]);

    /** Dès qu’une date est renseignée, elle compte comme filtre (lien « voir toutes les activités », compteur). */
    const filtresListeActifs =
        filtreListeDate !== "" ||
        filtreListeLieu !== "" ||
        filtreListeGroupe !== "" ||
        filtreListeAnimateur !== "" ||
        filtreListeType !== "";

    const activitesFiltrees = useMemo(() => {
        return activites.filter((a) => {
            if (filtreListeDate !== "") {
                if (activiteDateToFilterKey(a.date) !== filtreListeDate) return false;
            }
            if (filtreListeLieu !== "") {
                if (filtreListeLieu === FILTRE_LISTE_LIEU_SANS) {
                    if (a.lieu != null) return false;
                } else {
                    const id = Number.parseInt(filtreListeLieu, 10);
                    if (Number.isNaN(id) || a.lieu?.id !== id) return false;
                }
            }
            if (filtreListeGroupe !== "") {
                const gid = Number.parseInt(filtreListeGroupe, 10);
                if (Number.isNaN(gid) || !a.groupeIds?.includes(gid)) return false;
            }
            if (filtreListeAnimateur !== "") {
                if (!a.membres?.some((m) => m.tokenId === filtreListeAnimateur)) return false;
            }
            if (filtreListeType !== "") {
                const tid = Number.parseInt(filtreListeType, 10);
                if (Number.isNaN(tid) || a.typeActivite?.id !== tid) return false;
            }
            return true;
        });
    }, [
        activites,
        filtreListeDate,
        filtreListeLieu,
        filtreListeGroupe,
        filtreListeAnimateur,
        filtreListeType,
    ]);

    const voirToutesLesActivites = () => {
        setFiltreListeDate("");
        setFiltreListeLieu("");
        setFiltreListeGroupe("");
        setFiltreListeAnimateur("");
        setFiltreListeType("");
    };

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
        if (moments.length > 0) {
            if (formMomentId === "") {
                setErrorMessage("Le moment (créneau) est obligatoire.");
                return;
            }
        }
        if (formTypeActiviteId === "") {
            setErrorMessage("Le type d'activité est obligatoire.");
            return;
        }

        const payload: CreateActiviteRequest | UpdateActiviteRequest = {
            date: formDate,
            nom: formNom.trim(),
            membreTokenIds: [...selectedTokens],
            groupeIds: [...selectedGroupeIds].sort((x, y) => x - y),
            typeActiviteId: formTypeActiviteId,
        };
        const desc = formDescription.trim();
        if (desc) payload.description = desc;

        if (formLieuId !== "") {
            payload.lieuId = formLieuId;
        } else if (editingActiviteId != null) {
            payload.lieuId = null;
        }

        if (moments.length > 0 && formMomentId !== "") {
            payload.momentId = formMomentId;
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
            <div className={styles.addActiviteRow}>
                <Button
                    color="success"
                    onClick={openModal}
                    disabled={
                        equipe.length === 0 ||
                        groupes.length === 0 ||
                        moments.length === 0 ||
                        typesActivite.length === 0
                    }
                >
                    Ajouter une activité
                </Button>
            </div>
            {activites.length > 0 ? (
                <div className={styles.stickyFiltersSection}>
                    <div className={styles.filterBlock}>
                    <div
                        className={styles.joursFiltreRow}
                        role="group"
                        aria-label="Filtrer par jour du séjour"
                    >
                        {joursDuSejourPourFiltre.map(({ ymd, label }) => (
                            <button
                                key={ymd}
                                type="button"
                                className={`${styles.jourFiltreBtn} ${
                                    filtreListeDate === ymd ? styles.jourFiltreBtnSelected : ""
                                }`}
                                onClick={() => setFiltreListeDate(ymd)}
                                aria-pressed={filtreListeDate === ymd}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className={styles.filtersRow}>
                        <div className={styles.filtersRowInputs}>
                    <div className={styles.filterField}>
                        <Input
                            id="liste-act-filtre-lieu"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            aria-label="Filtrer par lieu"
                            value={filtreListeLieu}
                            onChange={(e) => setFiltreListeLieu(e.target.value)}
                            disabled={lieux.length === 0}
                        >
                            <option value="">Tous les lieux</option>
                            <option value={FILTRE_LISTE_LIEU_SANS}>Sans lieu</option>
                            {lieuxTriésListe.map((l) => (
                                <option key={l.id} value={String(l.id)}>
                                    {l.nom}
                                </option>
                            ))}
                        </Input>
                    </div>
                    <div className={styles.filterField}>
                        <Input
                            id="liste-act-filtre-groupe"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            aria-label="Filtrer par groupe"
                            value={filtreListeGroupe}
                            onChange={(e) => setFiltreListeGroupe(e.target.value)}
                            disabled={groupes.length === 0}
                        >
                            <option value="">Tous les groupes</option>
                            {groupesTriésFiltre.map((g) => (
                                <option key={g.id} value={String(g.id)}>
                                    {g.nom}
                                </option>
                            ))}
                        </Input>
                    </div>
                    <div className={styles.filterField}>
                        <Input
                            id="liste-act-filtre-anim"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            aria-label="Filtrer par animateur"
                            value={filtreListeAnimateur}
                            onChange={(e) => setFiltreListeAnimateur(e.target.value)}
                            disabled={equipe.length === 0}
                        >
                            <option value="">Tous les animateurs</option>
                            {equipeTriéeFiltre.map((m) => (
                                <option key={m.tokenId} value={m.tokenId}>
                                    {m.prenom} {m.nom}
                                </option>
                            ))}
                        </Input>
                    </div>
                    <div className={styles.filterField}>
                        <Input
                            id="liste-act-filtre-type"
                            type="select"
                            bsSize="sm"
                            className={styles.filterInput}
                            aria-label="Filtrer par type d'activité"
                            value={filtreListeType}
                            onChange={(e) => setFiltreListeType(e.target.value)}
                            disabled={typesActivite.length === 0}
                        >
                            <option value="">Tous les types</option>
                            {typesTriésFiltre.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                    {t.libelle}
                                </option>
                            ))}
                        </Input>
                    </div>
                        </div>
                    {filtresListeActifs ? (
                        <div className={styles.filterActions}>
                            <Button
                                type="button"
                                color="link"
                                size="sm"
                                className={styles.filterReset}
                                onClick={voirToutesLesActivites}
                            >
                                Voir toutes les activités
                            </Button>
                            <p className={styles.filterMeta}>
                                {activitesFiltrees.length} activité{activitesFiltrees.length !== 1 ? "s" : ""} sur{" "}
                                {activites.length} (filtres combinés)
                            </p>
                        </div>
                    ) : null}
                    </div>
                    </div>
                </div>
            ) : null}
            {typesActivite.length === 0 && (
                <p className={styles.warningText}>
                    Aucun type d&apos;activité n&apos;est disponible pour ce séjour. Ils sont normalement créés
                    automatiquement ; contactez l&apos;administrateur si cette liste reste vide.
                </p>
            )}
            {moments.length === 0 && (
                <p className={styles.warningText}>
                    Aucun moment (matin, après-midi, etc.) n&apos;est défini, il faut en créer au moins un avant
                    d&apos;ajouter une activité. Demandez à la <strong>direction</strong> d&apos;en configurer pour ce
                    séjour.
                </p>
            )}
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
            ) : activitesFiltrees.length === 0 ? (
                <p className={styles.empty}>Aucune activité ne correspond aux filtres sélectionnés.</p>
            ) : (
                <div className={styles.list}>
                    {activitesFiltrees.map((a) => (
                        <article key={a.id} className={styles.card}>
                            <div className={styles.cardBody}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.dateBadge}>{formatActiviteDateForDisplay(a.date)}</span>
                                    <span className={styles.nom}>{a.nom}</span>
                                </div>
                                <div className={styles.metaGrid}>
                                    {a.moment ? (
                                        <div className={styles.metaCell}>
                                            <div className={styles.meta}>
                                                <strong>Moment :</strong> {a.moment.nom}
                                            </div>
                                        </div>
                                    ) : null}
                                    {a.lieu ? (
                                        <div className={styles.metaCell}>
                                            <div className={styles.meta}>
                                                <strong>Lieu :</strong> {a.lieu.nom} — {resumePartageLieu(a.lieu)}
                                            </div>
                                        </div>
                                    ) : null}
                                    {a.groupeIds?.length ? (
                                        <div className={styles.metaCell}>
                                            <div className={styles.meta}>
                                                <strong>Groupes :</strong>{" "}
                                                {a.groupeIds
                                                    .map((id) => groupes.find((g) => g.id === id)?.nom)
                                                    .filter(Boolean)
                                                    .join(", ") || "—"}
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className={styles.metaCell}>
                                        <div className={styles.meta}>
                                            <strong>Animateurs :</strong>{" "}
                                            {a.membres?.length
                                                ? a.membres.map((m) => `${m.prenom} ${m.nom}`.trim()).join(", ")
                                                : "—"}
                                        </div>
                                    </div>
                                    <div className={styles.metaCell}>
                                        <div className={styles.meta}>
                                            <strong>Type :</strong> {a.typeActivite?.libelle ?? "—"}
                                        </div>
                                    </div>
                                </div>
                                {a.description ? <p className={styles.description}>{a.description}</p> : null}
                            </div>
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
                        <Label for="act-date">
                            Date{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
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
                        <Label for="act-moment">
                            Moment (créneau)
                            {momentsTriés.length > 0 ? (
                                <span className={styles.requiredAsterisk} aria-hidden="true">
                                    {" "}
                                    *
                                </span>
                            ) : null}
                        </Label>
                        <Input
                            id="act-moment"
                            type="select"
                            value={formMomentId === "" ? "" : String(formMomentId)}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                    setFormMomentId("");
                                    return;
                                }
                                const n = Number.parseInt(v, 10);
                                setFormMomentId(Number.isNaN(n) ? "" : n);
                            }}
                            disabled={submitting || momentsTriés.length === 0}
                            required={momentsTriés.length > 0}
                        >
                            <option value="">— Choisir un moment —</option>
                            {momentsTriés.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.nom}
                                </option>
                            ))}
                        </Input>
                        {momentsTriés.length === 0 ? (
                            <p className={styles.lieuHint}>
                                Aucun moment n&apos;existe pour ce séjour. Demandez à la direction d&apos;en créer au
                                moins un dans la section « Moments » avant de planifier une activité.
                            </p>
                        ) : null}
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-type">
                            Type d&apos;activité{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
                        <Input
                            id="act-type"
                            type="select"
                            value={formTypeActiviteId === "" ? "" : String(formTypeActiviteId)}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                    setFormTypeActiviteId("");
                                    return;
                                }
                                const n = Number.parseInt(v, 10);
                                setFormTypeActiviteId(Number.isNaN(n) ? "" : n);
                            }}
                            disabled={submitting || typesActivite.length === 0}
                            required
                        >
                            <option value="">— Choisir un type —</option>
                            {typesPredefinisSelect.length > 0 ? (
                                <optgroup label="Types par défaut">
                                    {typesPredefinisSelect.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.libelle}
                                        </option>
                                    ))}
                                </optgroup>
                            ) : null}
                            {typesPersoSelect.length > 0 ? (
                                <optgroup label="Types du séjour">
                                    {typesPersoSelect.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.libelle}
                                        </option>
                                    ))}
                                </optgroup>
                            ) : null}
                        </Input>
                        {typesActivite.length === 0 ? (
                            <p className={styles.lieuHint}>
                                Aucun type chargé. Utilisez la section « Types d&apos;activité » du détail séjour.
                            </p>
                        ) : null}
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="act-nom">
                            Nom{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
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
                        <Label>
                            Groupes concernés{" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
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
                        <Label>
                            Animateurs (membres de l&apos;équipe du séjour){" "}
                            <span className={styles.requiredAsterisk} aria-hidden="true">
                                *
                            </span>
                        </Label>
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
