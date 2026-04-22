import { useState } from "react";
import { Button, Input } from "reactstrap";
import type { ActiviteDto, GroupeDto, LieuDto, TypeActiviteDto } from "../../types/api";
import type { MembreEquipeSejour } from "./listeActivitesTypes";
import { FILTRE_LISTE_LIEU_SANS, formatActiviteDateForDisplay, resumePartageLieu } from "./listeActivitesUtils";
import styles from "./ListeActivites.module.scss";

export type ListeActivitesListeFiltresProps = {
    joursDuSejourPourFiltre: { ymd: string; label: string }[];
    filtreListeDate: string;
    setFiltreListeDate: (ymd: string) => void;
    filtreListeLieu: string;
    setFiltreListeLieu: (v: string) => void;
    filtreListeGroupe: string;
    setFiltreListeGroupe: (v: string) => void;
    filtreListeAnimateur: string;
    setFiltreListeAnimateur: (v: string) => void;
    filtreListeType: string;
    setFiltreListeType: (v: string) => void;
    lieuxTriésListe: LieuDto[];
    groupesTriésFiltre: GroupeDto[];
    equipeTriéeFiltre: MembreEquipeSejour[];
    typesTriésFiltre: TypeActiviteDto[];
    lieux: LieuDto[];
    groupes: GroupeDto[];
    equipe: MembreEquipeSejour[];
    typesActivite: TypeActiviteDto[];
    filtresListeActifs: boolean;
    voirToutesLesActivites: () => void;
    activitesFiltreesCount: number;
    activitesTotal: number;
};

export function ListeActivitesListeFiltres({
 joursDuSejourPourFiltre,
 filtreListeDate,
 setFiltreListeDate,
 filtreListeLieu,
 setFiltreListeLieu,
 filtreListeGroupe,
 setFiltreListeGroupe,
 filtreListeAnimateur,
 setFiltreListeAnimateur,
 filtreListeType,
 setFiltreListeType,
 lieuxTriésListe,
 groupesTriésFiltre,
 equipeTriéeFiltre,
 typesTriésFiltre,
 lieux,
 groupes,
 equipe,
 typesActivite,
 filtresListeActifs,
 voirToutesLesActivites,
 activitesFiltreesCount,
 activitesTotal,
}: ListeActivitesListeFiltresProps) {
    const [filtresMobileOuverts, setFiltresMobileOuverts] = useState(false);

    return (
        <div className={styles.stickyFiltersSection}>
            <div className={styles.listeFiltresMobileBar}>
                <button
                    type="button"
                    className={styles.listeFiltresToggleBtn}
                    aria-expanded={filtresMobileOuverts}
                    aria-controls="liste-act-filtres-panel"
                    onClick={() => setFiltresMobileOuverts((v) => !v)}
                >
                    {filtresMobileOuverts ? "Masquer les filtres" : "Afficher les filtres"}
                </button>
                {filtresListeActifs ? (
                    <span className={styles.listeFiltresBadgeActifs}>Filtres actifs</span>
                ) : null}
            </div>
            <div
                id="liste-act-filtres-panel"
                className={`${styles.filterBlock} ${styles.listeFiltresPanel}`}
                data-liste-filtres-ouverts={filtresMobileOuverts ? "true" : "false"}
            >
                <div className={styles.joursFiltreRow} role="group" aria-label="Filtrer par jour du séjour">
                    <button
                        type="button"
                        className={`${styles.jourFiltreBtn} ${
                            filtreListeDate === "" ? styles.jourFiltreBtnSelected : ""
                        } ${styles.jourFiltreBtnToutesDates}`}
                        onClick={() => setFiltreListeDate("")}
                        aria-pressed={filtreListeDate === ""}
                    >
                        Toutes les dates
                    </button>
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
                        <div
                            className={styles.filterActions}
                            role="group"
                            aria-label={`${activitesFiltreesCount} activité${
                                activitesFiltreesCount !== 1 ? "s" : ""
                            } sur ${activitesTotal} avec filtres combinés`}
                        >
                            <Button
                                type="button"
                                color="link"
                                size="sm"
                                className={styles.filterReset}
                                onClick={voirToutesLesActivites}
                                aria-label="Réinitialiser les filtres et afficher toutes les activités"
                            >
                                Tout afficher
                            </Button>
                            <span
                                className={styles.filterMeta}
                                title={`${activitesFiltreesCount} activité${
                                    activitesFiltreesCount !== 1 ? "s" : ""
                                } sur ${activitesTotal} (filtres combinés)`}
                            >
                                {activitesFiltreesCount}&nbsp;/&nbsp;{activitesTotal}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export type ListeActivitesListeResultatProps = {
    activites: ActiviteDto[];
    activitesFiltrees: ActiviteDto[];
    groupes: GroupeDto[];
    deletingActiviteId: number | null;
    onEdit: (a: ActiviteDto) => void;
    onDelete: (id: number) => void;
};

export function ListeActivitesListeResultat({
    activites,
    activitesFiltrees,
    groupes,
    deletingActiviteId,
    onEdit,
    onDelete,
}: ListeActivitesListeResultatProps) {
    if (activites.length === 0) {
        return <p className={styles.empty}>Aucune activité planifiée pour ce séjour.</p>;
    }
    if (activitesFiltrees.length === 0) {
        return <p className={styles.empty}>Aucune activité ne correspond aux filtres sélectionnés.</p>;
    }
    return (
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
                            onClick={() => onEdit(a)}
                            disabled={deletingActiviteId === a.id}
                        >
                            Modifier
                        </Button>
                        <Button
                            color="danger"
                            size="sm"
                            onClick={() => onDelete(a.id)}
                            disabled={deletingActiviteId === a.id}
                        >
                            {deletingActiviteId === a.id ? "Suppression…" : "Supprimer"}
                        </Button>
                    </div>
                </article>
            ))}
        </div>
    );
}
