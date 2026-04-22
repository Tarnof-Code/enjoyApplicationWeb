import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "reactstrap";
import type { ActiviteDto, GroupeDto, MomentDto } from "../../types/api";
import type { MembreEquipeSejour } from "./listeActivitesTypes";
import {
    CALENDRIER_NOMBRES_JOURS_VUE,
    type CalendrierNombreJoursVue,
    couleurFondCalendrierPourTypeActivite,
    trierActivitesPourCelluleCalendrier,
} from "./listeActivitesUtils";
import styles from "./ListeActivites.module.scss";

export type CalendrierNavigationPeriodeProps = {
    libellePlage: string;
    peutReculer: boolean;
    peutAvancer: boolean;
    onReculer: () => void;
    onAvancer: () => void;
    nombreJoursVue: CalendrierNombreJoursVue;
    onNombreJoursVueChange: (n: CalendrierNombreJoursVue) => void;
};

export function CalendrierNavigationPeriode({
    libellePlage,
    peutReculer,
    peutAvancer,
    onReculer,
    onAvancer,
    nombreJoursVue,
    onNombreJoursVueChange,
}: CalendrierNavigationPeriodeProps) {
    return (
        <div
            className={`${styles.calendrierNav} ${styles.calendrierNavDansBarre}`}
            role="toolbar"
            aria-label="Période affichée dans le calendrier"
        >
            <div
                className={styles.calendrierVueJours}
                role="group"
                aria-label="Nombre de jours visibles dans le planning"
            >
                {CALENDRIER_NOMBRES_JOURS_VUE.map((n) => (
                    <button
                        key={n}
                        type="button"
                        className={`${styles.calendrierVueJoursBtn} ${
                            nombreJoursVue === n ? styles.calendrierVueJoursBtnActive : ""
                        }`}
                        aria-pressed={nombreJoursVue === n}
                        aria-label={
                            n === 1
                                ? "Afficher une journée à la fois"
                                : `Afficher ${n} jours à la fois`
                        }
                        onClick={() => onNombreJoursVueChange(n)}
                    >
                        {n === 1 ? "1 j." : `${n} j.`}
                    </button>
                ))}
            </div>
            <button
                type="button"
                className={styles.calendrierNavBtn}
                onClick={onReculer}
                disabled={!peutReculer}
                aria-label="Reculer d'un jour la période affichée"
            >
                ‹
            </button>
            <span className={styles.calendrierPlage}>{libellePlage}</span>
            <button
                type="button"
                className={styles.calendrierNavBtn}
                onClick={onAvancer}
                disabled={!peutAvancer}
                aria-label="Avancer d'un jour la période affichée"
            >
                ›
            </button>
        </div>
    );
}

export type CalendrierFiltresPlanningProps = {
    equipeTriéeFiltre: MembreEquipeSejour[];
    groupesTriésFiltre: GroupeDto[];
    groupes: GroupeDto[];
    filtreCalendrierTokens: Set<string>;
    filtreCalendrierGroupeIds: Set<number>;
    filtresCalendrierActifs: boolean;
    libelleResumeFiltreCalendrierAnim: string;
    libelleResumeFiltreCalendrierGroupes: string;
    onToggleFiltreCalendrierToken: (tokenId: string) => void;
    onToggleFiltreCalendrierGroupe: (groupeId: number) => void;
    onToutSelectionnerFiltreCalendrierAnim: () => void;
    onRienSelectionnerFiltreCalendrierAnim: () => void;
    onToutSelectionnerFiltreCalendrierGroupes: () => void;
    onRienSelectionnerFiltreCalendrierGroupes: () => void;
    onReinitialiserFiltresCalendrier: () => void;
};

export function CalendrierFiltresPlanning({
    equipeTriéeFiltre,
    groupesTriésFiltre,
    groupes,
    filtreCalendrierTokens,
    filtreCalendrierGroupeIds,
    filtresCalendrierActifs,
    libelleResumeFiltreCalendrierAnim,
    libelleResumeFiltreCalendrierGroupes,
    onToggleFiltreCalendrierToken,
    onToggleFiltreCalendrierGroupe,
    onToutSelectionnerFiltreCalendrierAnim,
    onRienSelectionnerFiltreCalendrierAnim,
    onToutSelectionnerFiltreCalendrierGroupes,
    onRienSelectionnerFiltreCalendrierGroupes,
    onReinitialiserFiltresCalendrier,
}: CalendrierFiltresPlanningProps) {
    const [calFiltAnimPanelOuvert, setCalFiltAnimPanelOuvert] = useState(false);
    const [calFiltGrpPanelOuvert, setCalFiltGrpPanelOuvert] = useState(false);
    const calFiltAnimDropdownRef = useRef<HTMLDivElement>(null);
    const calFiltGrpDropdownRef = useRef<HTMLDivElement>(null);

    const fermerPanneaux = useCallback(() => {
        setCalFiltAnimPanelOuvert(false);
        setCalFiltGrpPanelOuvert(false);
    }, []);

    const reinitialiserEtFermer = () => {
        onReinitialiserFiltresCalendrier();
        fermerPanneaux();
    };

    useEffect(() => {
        if (!calFiltAnimPanelOuvert && !calFiltGrpPanelOuvert) return;
        const fermerSiExterieur = (e: MouseEvent) => {
            const cible = e.target as Node;
            if (
                calFiltAnimPanelOuvert &&
                calFiltAnimDropdownRef.current &&
                !calFiltAnimDropdownRef.current.contains(cible)
            ) {
                setCalFiltAnimPanelOuvert(false);
            }
            if (
                calFiltGrpPanelOuvert &&
                calFiltGrpDropdownRef.current &&
                !calFiltGrpDropdownRef.current.contains(cible)
            ) {
                setCalFiltGrpPanelOuvert(false);
            }
        };
        document.addEventListener("mousedown", fermerSiExterieur);
        return () => document.removeEventListener("mousedown", fermerSiExterieur);
    }, [calFiltAnimPanelOuvert, calFiltGrpPanelOuvert]);

    return (
        <div className={styles.calendrierFiltersSection}>
            <div className={styles.filterBlock}>
                <div className={styles.calendrierFiltreBarre}>
                    <span className={styles.calendrierFiltreTitre}>Filtrer le planning</span>
                    <div className={styles.calendrierFiltreBarreFiltres}>
                        <div ref={calFiltAnimDropdownRef} className={styles.calendrierFiltreDropdown}>
                            <button
                                type="button"
                                className={styles.calendrierFiltreDropdownBtn}
                                aria-haspopup="listbox"
                                aria-expanded={calFiltAnimPanelOuvert}
                                aria-label={`Animateurs affichés : ${libelleResumeFiltreCalendrierAnim}`}
                                id="calfilt-anim-btn"
                                onClick={() => {
                                    setCalFiltAnimPanelOuvert((v) => !v);
                                    setCalFiltGrpPanelOuvert(false);
                                }}
                            >
                                <span className={styles.calendrierFiltreDropdownBtnText}>
                                    {libelleResumeFiltreCalendrierAnim}
                                </span>
                                <span className={styles.calendrierFiltreDropdownChevron} aria-hidden>
                                    &#9660;
                                </span>
                            </button>
                            {calFiltAnimPanelOuvert ? (
                                <div
                                    className={styles.calendrierFiltreDropdownPanel}
                                    role="listbox"
                                    aria-multiselectable="true"
                                    aria-label="Choisir les animateurs à afficher"
                                >
                                    {equipeTriéeFiltre.length > 0 ? (
                                        <div className={styles.calendrierFiltreDropdownBulk}>
                                            <Button
                                                type="button"
                                                color="link"
                                                size="sm"
                                                className={styles.calendrierFiltreDropdownBulkBtn}
                                                onClick={onToutSelectionnerFiltreCalendrierAnim}
                                                aria-label="Tout sélectionner dans les animateurs du calendrier"
                                            >
                                                Tout sélectionner
                                            </Button>
                                            <Button
                                                type="button"
                                                color="link"
                                                size="sm"
                                                className={styles.calendrierFiltreDropdownBulkBtn}
                                                onClick={onRienSelectionnerFiltreCalendrierAnim}
                                                aria-label="Ne sélectionner aucun animateur dans le calendrier"
                                            >
                                                Rien sélectionner
                                            </Button>
                                        </div>
                                    ) : null}
                                    {equipeTriéeFiltre.map((m) => (
                                        <label key={m.tokenId} className={styles.calendrierFiltreDropdownItem}>
                                            <Input
                                                type="checkbox"
                                                className={styles.calendrierFiltreDropdownCheckbox}
                                                id={`calfilt-anim-${m.tokenId}`}
                                                checked={
                                                    filtreCalendrierTokens.size === 0 ||
                                                    filtreCalendrierTokens.has(m.tokenId)
                                                }
                                                onChange={() => onToggleFiltreCalendrierToken(m.tokenId)}
                                            />
                                            <span className={styles.calendrierFiltreDropdownItemLabel}>
                                                {m.prenom} {m.nom}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        {groupes.length > 0 ? (
                            <div ref={calFiltGrpDropdownRef} className={styles.calendrierFiltreDropdown}>
                                <button
                                    type="button"
                                    className={styles.calendrierFiltreDropdownBtn}
                                    aria-haspopup="listbox"
                                    aria-expanded={calFiltGrpPanelOuvert}
                                    aria-label={`Groupes d’activités : ${libelleResumeFiltreCalendrierGroupes}`}
                                    id="calfilt-grp-btn"
                                    onClick={() => {
                                        setCalFiltGrpPanelOuvert((v) => !v);
                                        setCalFiltAnimPanelOuvert(false);
                                    }}
                                >
                                    <span className={styles.calendrierFiltreDropdownBtnText}>
                                        {libelleResumeFiltreCalendrierGroupes}
                                    </span>
                                    <span className={styles.calendrierFiltreDropdownChevron} aria-hidden>
                                        &#9660;
                                    </span>
                                </button>
                                {calFiltGrpPanelOuvert ? (
                                    <div
                                        className={styles.calendrierFiltreDropdownPanel}
                                        role="listbox"
                                        aria-multiselectable="true"
                                        aria-label="Choisir les groupes pour filtrer les activités"
                                    >
                                        {groupesTriésFiltre.length > 0 ? (
                                            <div className={styles.calendrierFiltreDropdownBulk}>
                                                <Button
                                                    type="button"
                                                    color="link"
                                                    size="sm"
                                                    className={styles.calendrierFiltreDropdownBulkBtn}
                                                    onClick={onToutSelectionnerFiltreCalendrierGroupes}
                                                    aria-label="Tout sélectionner dans les groupes du calendrier"
                                                >
                                                    Tout sélectionner
                                                </Button>
                                                <Button
                                                    type="button"
                                                    color="link"
                                                    size="sm"
                                                    className={styles.calendrierFiltreDropdownBulkBtn}
                                                    onClick={onRienSelectionnerFiltreCalendrierGroupes}
                                                    aria-label="Ne sélectionner aucun groupe dans le calendrier"
                                                >
                                                    Rien sélectionner
                                                </Button>
                                            </div>
                                        ) : null}
                                        {groupesTriésFiltre.map((g) => (
                                            <label key={g.id} className={styles.calendrierFiltreDropdownItem}>
                                                <Input
                                                    type="checkbox"
                                                    className={styles.calendrierFiltreDropdownCheckbox}
                                                    id={`calfilt-grp-${g.id}`}
                                                    checked={
                                                        filtreCalendrierGroupeIds.size === 0 ||
                                                        filtreCalendrierGroupeIds.has(g.id)
                                                    }
                                                    onChange={() => onToggleFiltreCalendrierGroupe(g.id)}
                                                />
                                                <span className={styles.calendrierFiltreDropdownItemLabel}>
                                                    {g.nom}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    {filtresCalendrierActifs ? (
                        <Button
                            type="button"
                            color="link"
                            size="sm"
                            className={`${styles.filterReset} ${styles.calendrierFiltreBarreReinitialiser}`}
                            onClick={reinitialiserEtFermer}
                        >
                            Réinitialiser les filtres
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export type CalendrierPlanningProps = {
    /** Nombre de colonnes jour (pour la grille CSS) ; doit correspondre à la longueur de `joursFenetreCalendrier`. */
    nombreJoursFenetre: number;
    joursFenetreCalendrier: { ymd: string; label: string; dansSejour: boolean }[];
    equipePourCalendrier: MembreEquipeSejour[];
    activitesParAnimateurEtDate: Map<string, Map<string, ActiviteDto[]>>;
    libellesGroupesReferentParToken: Map<string, string>;
    filtreCalendrierGroupeIds: Set<number>;
    /** Vrai si le filtre groupes exclut tout (aucune activité ne peut correspondre) — pas de grille ni d’ajout en case. */
    calendrierFiltreExclutTousLesGroupes: boolean;
    momentsTriés: MomentDto[];
    groupes: GroupeDto[];
    peutAjouterActivite: boolean;
    activitesCount: number;
    onOpenNouvelleActivite: (opts?: { dateYmd?: string; animateurTokenId?: string }) => void;
    onOpenEdit: (a: ActiviteDto) => void;
    onDelete: (activiteId: number) => void;
    deletingActiviteId: number | null;
};

export function CalendrierPlanning({
    nombreJoursFenetre,
    joursFenetreCalendrier,
    equipePourCalendrier,
    activitesParAnimateurEtDate,
    libellesGroupesReferentParToken,
    filtreCalendrierGroupeIds,
    calendrierFiltreExclutTousLesGroupes,
    momentsTriés,
    groupes,
    peutAjouterActivite,
    activitesCount,
    onOpenNouvelleActivite,
    onOpenEdit,
    onDelete,
    deletingActiviteId,
}: CalendrierPlanningProps) {
    return (
        <div className={styles.calendrierWrap}>
            {joursFenetreCalendrier.length > 0 ? (
                equipePourCalendrier.length === 0 ? (
                    <p className={styles.calendrierFootnote}>Aucun animateur ne correspond aux filtres sélectionnés.</p>
                ) : calendrierFiltreExclutTousLesGroupes ? (
                    <p className={styles.calendrierFootnote}>
                        Aucun groupe ne fait partie du filtre — aucune activité ne peut s’afficher. Sélectionnez au moins
                        un groupe pour voir le planning.
                    </p>
                ) : (
                    <div
                        className={styles.calendrierScroll}
                        role="region"
                        aria-label="Planning par animateur et par jour"
                    >
                        <table
                            className={styles.calendrierTable}
                            style={
                                {
                                    "--calendrier-jours": String(
                                        Math.max(1, nombreJoursFenetre || joursFenetreCalendrier.length)
                                    ),
                                } as React.CSSProperties
                            }
                        >
                            <colgroup>
                                <col className={styles.calendrierColAnimateur} />
                                {joursFenetreCalendrier.map(({ ymd }) => (
                                    <col key={ymd} className={styles.calendrierColJour} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th scope="col" className={styles.calendrierCorner}>
                                        Animateur
                                    </th>
                                    {joursFenetreCalendrier.map(({ ymd, label, dansSejour }) => (
                                        <th
                                            key={ymd}
                                            scope="col"
                                            className={`${styles.calendrierColHead} ${
                                                !dansSejour ? styles.calendrierColHorsSejour : ""
                                            }`}
                                            title={ymd}
                                        >
                                            <span className={styles.calendrierColHeadLabel}>{label}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {equipePourCalendrier.map((membre) => {
                                    const libelleGroupesReferent =
                                        libellesGroupesReferentParToken.get(membre.tokenId);
                                    return (
                                        <tr key={membre.tokenId}>
                                            <th scope="row" className={styles.calendrierRowHead}>
                                                <span className={styles.calendrierRowHeadName}>
                                                    {membre.prenom} {membre.nom}
                                                </span>
                                                {libelleGroupesReferent ? (
                                                    <span className={styles.calendrierRowHeadGroupe}>
                                                        {libelleGroupesReferent}
                                                    </span>
                                                ) : null}
                                            </th>
                                            {joursFenetreCalendrier.map(({ ymd, dansSejour }) => {
                                                const brutes =
                                                    activitesParAnimateurEtDate.get(membre.tokenId)?.get(ymd) ?? [];
                                                const brutesFiltreesGroupe =
                                                    filtreCalendrierGroupeIds.size === 0
                                                        ? brutes
                                                        : brutes.filter((a) =>
                                                              (a.groupeIds ?? []).some((id) =>
                                                                  filtreCalendrierGroupeIds.has(id)
                                                              )
                                                          );
                                                const dansCellule = trierActivitesPourCelluleCalendrier(
                                                    brutesFiltreesGroupe,
                                                    momentsTriés
                                                );
                                                const classeCellule =
                                                    dansCellule.length > 0
                                                        ? styles.calendrierCellFilled
                                                        : styles.calendrierCellEmpty;
                                                const celluleAjoutClic =
                                                    dansSejour && peutAjouterActivite && dansCellule.length === 0;
                                                return (
                                                    <td
                                                        key={ymd}
                                                        className={`${classeCellule} ${
                                                            !dansSejour ? styles.calendrierCellHorsSejour : ""
                                                        } ${celluleAjoutClic ? styles.calendrierCellAjoutClic : ""}`}
                                                        {...(celluleAjoutClic
                                                            ? {
                                                                  role: "button",
                                                                  tabIndex: 0,
                                                                  "aria-label": `Ajouter une activité le ${ymd} pour ${membre.prenom} ${membre.nom}`,
                                                                  onClick: () =>
                                                                      onOpenNouvelleActivite({
                                                                          dateYmd: ymd,
                                                                          animateurTokenId: membre.tokenId,
                                                                      }),
                                                                  onKeyDown: (e: React.KeyboardEvent) => {
                                                                      if (e.key === "Enter" || e.key === " ") {
                                                                          e.preventDefault();
                                                                          onOpenNouvelleActivite({
                                                                              dateYmd: ymd,
                                                                              animateurTokenId: membre.tokenId,
                                                                          });
                                                                      }
                                                                  },
                                                              }
                                                            : {})}
                                                    >
                                                        {celluleAjoutClic ? (
                                                            <span
                                                                className={styles.calendrierCellAjoutHint}
                                                                aria-hidden
                                                            >
                                                                Cliquer pour ajouter
                                                            </span>
                                                        ) : null}
                                                        {dansCellule.map((a) => (
                                                            <div
                                                                key={a.id}
                                                                className={styles.calendrierActiviteCard}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className={styles.calendrierActiviteBtn}
                                                                    style={
                                                                        {
                                                                            "--cal-act-type-bg":
                                                                                couleurFondCalendrierPourTypeActivite(
                                                                                    a.typeActivite?.id
                                                                                ),
                                                                        } as React.CSSProperties
                                                                    }
                                                                    onClick={() => onOpenEdit(a)}
                                                                    disabled={deletingActiviteId === a.id}
                                                                >
                                                                    {a.moment ? (
                                                                        <span className={styles.calendrierActiviteMoment}>
                                                                            {a.moment.nom}
                                                                        </span>
                                                                    ) : null}
                                                                    <span className={styles.calendrierActiviteNom}>
                                                                        {a.nom}
                                                                    </span>
                                                                    {a.lieu ? (
                                                                        <span className={styles.calendrierActiviteLieu}>
                                                                            Lieu : {a.lieu.nom}
                                                                        </span>
                                                                    ) : null}
                                                                    {(() => {
                                                                        const autresAnimateurs = (
                                                                            a.membres ?? []
                                                                        ).filter((m) => m.tokenId !== membre.tokenId);
                                                                        if (autresAnimateurs.length === 0) return null;
                                                                        return (
                                                                            <span
                                                                                className={styles.calendrierActiviteAvec}
                                                                            >
                                                                                Avec :{" "}
                                                                                {autresAnimateurs
                                                                                    .map((m) =>
                                                                                        `${m.prenom} ${m.nom}`.trim()
                                                                                    )
                                                                                    .join(", ")}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    {a.groupeIds?.length ? (
                                                                        <span
                                                                            className={styles.calendrierActiviteGroupes}
                                                                        >
                                                                            Groupes :{" "}
                                                                            {a.groupeIds
                                                                                .map(
                                                                                    (id) =>
                                                                                        groupes.find((g) => g.id === id)
                                                                                            ?.nom
                                                                                )
                                                                                .filter(Boolean)
                                                                                .join(", ") || "—"}
                                                                        </span>
                                                                    ) : null}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={styles.calendrierActiviteDeleteBtn}
                                                                    aria-label={`Supprimer l’activité « ${a.nom} »`}
                                                                    title="Supprimer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDelete(a.id);
                                                                    }}
                                                                    disabled={deletingActiviteId === a.id}
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {dansSejour && peutAjouterActivite && dansCellule.length > 0 ? (
                                                            <button
                                                                type="button"
                                                                className={styles.calendrierAjoutMemeCaseBtn}
                                                                onClick={() =>
                                                                    onOpenNouvelleActivite({
                                                                        dateYmd: ymd,
                                                                        animateurTokenId: membre.tokenId,
                                                                    })
                                                                }
                                                            >
                                                                + Activité
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <p className={styles.calendrierFootnote}>Période du calendrier indisponible.</p>
            )}
            {activitesCount === 0 && !calendrierFiltreExclutTousLesGroupes ? (
                <p className={styles.calendrierFootnote}>
                    Aucune activité planifiée — cliquez dans une case (jour et animateur) pour en ajouter une.
                </p>
            ) : null}
        </div>
    );
}
