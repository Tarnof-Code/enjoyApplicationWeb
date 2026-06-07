import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "reactstrap";
import type { ActiviteDto, ActivitePrestataireDto, GroupeDto, MomentDto } from "../../types/api";
import type { CalendrierCelluleItem } from "./listeActivitesPrestatairesCalendrier";
import {
    cleRetraitSortieCalendrier,
    libellePlageHorairePrestataire,
} from "./listeActivitesPrestatairesCalendrier";
import type { ChoixResolutionConflitPrestataire } from "./listeActivitesTypes";
import { CalendrierCarteEditionAvecSuppression } from "../PlanningCalendrier/CalendrierCarteEditionAvecSuppression";
import { CalendrierCelluleAjoutHint } from "../PlanningCalendrier/CalendrierCelluleAjoutHint";
import { proprietesTdAjoutPlanning } from "../PlanningCalendrier/calendrierCelluleClavier";
import planningCal from "../PlanningCalendrier/PlanningCalendrier.module.scss";
import type { MembreEquipeSejour } from "./listeActivitesTypes";
import {
    CALENDRIER_NOMBRES_JOURS_VUE,
    type CalendrierNombreJoursVue,
    couleurFondCalendrierPourTypeActivite,
} from "./listeActivitesUtils";
import styles from "./ListeActivites.module.scss";
import { GroupesFilterDropdownItems } from "./SelectionGroupesParType";

export type CalendrierNavigationPeriodeProps = {
    libellePlage: string;
    peutReculer: boolean;
    peutAvancer: boolean;
    onReculer: () => void;
    onAvancer: () => void;
    nombreJoursVue: CalendrierNombreJoursVue;
    onNombreJoursVueChange: (n: CalendrierNombreJoursVue) => void;
    /** Début de fenêtre (AAAA-MM-JJ) : si renseigné avec les bornes et le callback, la plage ouvre un sélecteur de date. */
    debutFenetreYmd?: string;
    minDebutFenetreYmd?: string;
    maxDebutFenetreYmd?: string;
    onChangerDebutFenetre?: (ymd: string) => void;
};

export function CalendrierNavigationPeriode({
    libellePlage,
    peutReculer,
    peutAvancer,
    onReculer,
    onAvancer,
    nombreJoursVue,
    onNombreJoursVueChange,
    debutFenetreYmd,
    minDebutFenetreYmd,
    maxDebutFenetreYmd,
    onChangerDebutFenetre,
}: CalendrierNavigationPeriodeProps) {
    const dateDebutPickerRef = useRef<HTMLInputElement>(null);

    const plageSelectable =
        Boolean(
            debutFenetreYmd &&
                minDebutFenetreYmd &&
                maxDebutFenetreYmd &&
                onChangerDebutFenetre,
        );

    const ouvrirSelecteurDebutFenetre = () => {
        const el = dateDebutPickerRef.current;
        if (!el) return;
        if (typeof el.showPicker === "function") {
            try {
                el.showPicker();
                return;
            } catch {
                /* certains navigateurs lancent si non geste utilisateur ou policy */
            }
        }
        el.click();
    };

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
            {plageSelectable ? (
                <div className={styles.calendrierPlagePickWrap}>
                    <input
                        ref={dateDebutPickerRef}
                        type="date"
                        className={styles.calendrierPlageDateHidden}
                        min={minDebutFenetreYmd}
                        max={maxDebutFenetreYmd}
                        value={debutFenetreYmd}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v && onChangerDebutFenetre) onChangerDebutFenetre(v);
                        }}
                        tabIndex={-1}
                        aria-hidden
                    />
                    <button
                        type="button"
                        className={`${styles.calendrierPlage} ${styles.calendrierPlageBtn}`}
                        onClick={ouvrirSelecteurDebutFenetre}
                        aria-label={`Choisir la date de début de la période affichée (${libellePlage})`}
                    >
                        {libellePlage}
                    </button>
                </div>
            ) : (
                <span className={styles.calendrierPlage}>{libellePlage}</span>
            )}
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
    /** Si vrai : pas de choix d’animateurs (ligne unique imposée côté parent). */
    masquerFiltreAnimateurs?: boolean;
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
    masquerFiltreAnimateurs = false,
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
                        {!masquerFiltreAnimateurs ? (
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
                        ) : null}
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
                                        <GroupesFilterDropdownItems
                                            groupes={groupesTriésFiltre}
                                            isSelected={(id) =>
                                                filtreCalendrierGroupeIds.size === 0 ||
                                                filtreCalendrierGroupeIds.has(id)
                                            }
                                            onToggle={onToggleFiltreCalendrierGroupe}
                                            itemClassName={styles.calendrierFiltreDropdownItem}
                                            checkboxClassName={styles.calendrierFiltreDropdownCheckbox}
                                            labelClassName={styles.calendrierFiltreDropdownItemLabel}
                                        />
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

function itemPasseFiltreGroupeCalendrier(item: CalendrierCelluleItem, filtreCalendrierGroupeIds: Set<number>): boolean {
    if (filtreCalendrierGroupeIds.size === 0) return true;
    if (item.kind === "activite") {
        return (item.activite.groupeIds ?? []).some((id) => filtreCalendrierGroupeIds.has(id));
    }
    const ids = item.sortie.groupeIds ?? [];
    return ids.some((id) => filtreCalendrierGroupeIds.has(id));
}

export type CalendrierPlanningProps = {
    /** Nombre de colonnes jour (pour la grille CSS) ; doit correspondre à la longueur de `joursFenetreCalendrier`. */
    nombreJoursFenetre: number;
    joursFenetreCalendrier: { ymd: string; label: string; dansSejour: boolean }[];
    equipePourCalendrier: MembreEquipeSejour[];
    cellulesParAnimateurEtDate: Map<string, Map<string, CalendrierCelluleItem[]>>;
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
    /**
     * Si renseigné : seules les lignes dont le `tokenId` correspond peuvent créer ou modifier/supprimer une activité
     * (cases des autres lignes en lecture seule).
     */
    tokenEditionCalendrierReserve?: string | null;
    onOpenHistoriqueActivite?: (a: ActiviteDto) => void;
    onOpenEnfantsActivite?: (a: ActiviteDto) => void;
    peutResoudreConflitsPrestataires?: boolean;
    onResoudreConflitPrestataire?: (
        item: Extract<CalendrierCelluleItem, { kind: "conflit" }>,
        tokenId: string,
        choix: ChoixResolutionConflitPrestataire,
    ) => void;
    conflitResolutionEnCours?: string | null;
    onRetirerSortieCalendrier?: (
        sortie: ActivitePrestataireDto,
        moment: MomentDto,
        tokenId: string,
        animateurLabel: string,
    ) => void;
    retirerSortieCalendrierEnCours?: string | null;
};

export function CalendrierPlanning({
    nombreJoursFenetre,
    joursFenetreCalendrier,
    equipePourCalendrier,
    cellulesParAnimateurEtDate,
    libellesGroupesReferentParToken,
    filtreCalendrierGroupeIds,
    calendrierFiltreExclutTousLesGroupes,
    momentsTriés: _momentsTriés,
    groupes,
    peutAjouterActivite,
    activitesCount,
    onOpenNouvelleActivite,
    onOpenEdit,
    onDelete,
    deletingActiviteId,
    tokenEditionCalendrierReserve = null,
    onOpenHistoriqueActivite,
    onOpenEnfantsActivite,
    peutResoudreConflitsPrestataires = false,
    onResoudreConflitPrestataire,
    conflitResolutionEnCours = null,
    onRetirerSortieCalendrier,
    retirerSortieCalendrierEnCours = null,
}: CalendrierPlanningProps) {
    return (
        <div className={styles.calendrierWrap}>
            {joursFenetreCalendrier.length > 0 ? (
                equipePourCalendrier.length === 0 ? (
                    <p className={planningCal.footnote}>Aucun animateur ne correspond aux filtres sélectionnés.</p>
                ) : calendrierFiltreExclutTousLesGroupes ? (
                    <p className={planningCal.footnote}>
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
                                    const ligneEditableCalendrier =
                                        tokenEditionCalendrierReserve == null ||
                                        tokenEditionCalendrierReserve.trim() === "" ||
                                        membre.tokenId.trim() === tokenEditionCalendrierReserve.trim();
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
                                                    cellulesParAnimateurEtDate.get(membre.tokenId)?.get(ymd) ??
                                                    [];
                                                const dansCellule = brutes.filter((item) =>
                                                    itemPasseFiltreGroupeCalendrier(
                                                        item,
                                                        filtreCalendrierGroupeIds,
                                                    ),
                                                );
                                                const classeTone =
                                                    dansCellule.length > 0
                                                        ? planningCal.cellToneFilled
                                                        : planningCal.cellToneEmpty;
                                                const celluleAjoutClic =
                                                    ligneEditableCalendrier &&
                                                    dansSejour &&
                                                    peutAjouterActivite &&
                                                    dansCellule.length === 0;
                                                const ouvrirNouvelleActiviteCellule = () =>
                                                    onOpenNouvelleActivite({
                                                        dateYmd: ymd,
                                                        animateurTokenId: membre.tokenId,
                                                    });
                                                return (
                                                    <td
                                                        key={ymd}
                                                        className={`${planningCal.cellShell} ${styles.calendrierCell} ${classeTone} ${
                                                            !dansSejour ? planningCal.cellToneHorsSejour : ""
                                                        } ${celluleAjoutClic ? planningCal.cellAjoutClic : ""}`}
                                                        {...proprietesTdAjoutPlanning(
                                                            celluleAjoutClic,
                                                            `Ajouter une activité le ${ymd} pour ${membre.prenom} ${membre.nom}`,
                                                            ouvrirNouvelleActiviteCellule,
                                                        )}
                                                    >
                                                        {celluleAjoutClic ? <CalendrierCelluleAjoutHint /> : null}
                                                        {dansCellule.map((item) => {
                                                            if (item.kind === "activite") {
                                                                const a = item.activite;
                                                                return (
                                                                    <CalendrierCarteEditionAvecSuppression
                                                                        key={`act-${a.id}`}
                                                                        lectureSeule={!ligneEditableCalendrier}
                                                                        onEdit={() => onOpenEdit(a)}
                                                                        editDisabled={
                                                                            deletingActiviteId === a.id ||
                                                                            !ligneEditableCalendrier
                                                                        }
                                                                        editAriaLabel={`Éditer l’activité « ${a.nom} »`}
                                                                        mainButtonStyle={
                                                                            {
                                                                                "--plan-cal-carte-bg":
                                                                                    couleurFondCalendrierPourTypeActivite(
                                                                                        a.typeActivite?.id,
                                                                                    ),
                                                                            } as React.CSSProperties
                                                                        }
                                                                        onDeleteClick={() => onDelete(a.id)}
                                                                        deleteAriaLabel={`Supprimer l’activité « ${a.nom} »`}
                                                                        deleteDisabled={
                                                                            deletingActiviteId === a.id ||
                                                                            !ligneEditableCalendrier
                                                                        }
                                                                        onHistoriqueClick={
                                                                            onOpenHistoriqueActivite
                                                                                ? () =>
                                                                                      onOpenHistoriqueActivite(a)
                                                                                : undefined
                                                                        }
                                                                        historiqueAriaLabel={`Historique de « ${a.nom} »`}
                                                                        onEnfantsClick={
                                                                            onOpenEnfantsActivite &&
                                                                            ligneEditableCalendrier
                                                                                ? () => onOpenEnfantsActivite(a)
                                                                                : undefined
                                                                        }
                                                                        enfantsAriaLabel={`Enfants participants pour « ${a.nom} »`}
                                                                    >
                                                                        {a.moment ? (
                                                                            <span
                                                                                className={
                                                                                    styles.calendrierActiviteMoment
                                                                                }
                                                                            >
                                                                                {a.moment.nom}
                                                                            </span>
                                                                        ) : null}
                                                                        <span className={styles.calendrierActiviteNom}>
                                                                            {a.nom}
                                                                        </span>
                                                                        {a.lieu ? (
                                                                            <span
                                                                                className={styles.calendrierActiviteLieu}
                                                                            >
                                                                                Lieu : {a.lieu.nom}
                                                                            </span>
                                                                        ) : null}
                                                                        {(() => {
                                                                            const autresAnimateurs = (
                                                                                a.membres ?? []
                                                                            ).filter(
                                                                                (m) =>
                                                                                    m.tokenId !== membre.tokenId,
                                                                            );
                                                                            if (autresAnimateurs.length === 0)
                                                                                return null;
                                                                            return (
                                                                                <span
                                                                                    className={
                                                                                        styles.calendrierActiviteAvec
                                                                                    }
                                                                                >
                                                                                    Avec :{" "}
                                                                                    {autresAnimateurs
                                                                                        .map((m) =>
                                                                                            `${m.prenom} ${m.nom}`.trim(),
                                                                                        )
                                                                                        .join(", ")}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                        {a.groupeIds?.length ? (
                                                                            <span
                                                                                className={
                                                                                    styles.calendrierActiviteGroupes
                                                                                }
                                                                            >
                                                                                Groupes :{" "}
                                                                                {a.groupeIds
                                                                                    .map(
                                                                                        (id) =>
                                                                                            groupes.find(
                                                                                                (g) => g.id === id,
                                                                                            )?.nom,
                                                                                    )
                                                                                    .filter(Boolean)
                                                                                    .join(", ") || "—"}
                                                                            </span>
                                                                        ) : null}
                                                                    </CalendrierCarteEditionAvecSuppression>
                                                                );
                                                            }
                                                            if (item.kind === "prestataire") {
                                                                const plage = libellePlageHorairePrestataire(
                                                                    item.sortie.heureDepart,
                                                                    item.sortie.heureRetour,
                                                                );
                                                                const cleRetrait = cleRetraitSortieCalendrier(
                                                                    item.sortie.id,
                                                                    item.moment.id,
                                                                    membre.tokenId,
                                                                );
                                                                const animateurLabel =
                                                                    `${membre.prenom} ${membre.nom}`.trim();
                                                                return (
                                                                    <div
                                                                        key={`presta-${item.sortie.id}-${item.moment.id}`}
                                                                        className={styles.calendrierCartePrestataire}
                                                                    >
                                                                        <CalendrierCarteEditionAvecSuppression
                                                                            carteNonCliquable
                                                                            lectureSeule={
                                                                                !ligneEditableCalendrier ||
                                                                                !onRetirerSortieCalendrier
                                                                            }
                                                                            onEdit={() => {}}
                                                                            editAriaLabel={`Sortie « ${item.sortie.nom} » — ${item.moment.nom}`}
                                                                            onDeleteClick={() =>
                                                                                onRetirerSortieCalendrier?.(
                                                                                    item.sortie,
                                                                                    item.moment,
                                                                                    membre.tokenId,
                                                                                    animateurLabel,
                                                                                )
                                                                            }
                                                                            deleteAriaLabel={`Retirer « ${item.sortie.nom} » du calendrier de ${animateurLabel} (${item.moment.nom})`}
                                                                            deleteTitle="Ne plus participer à ce créneau"
                                                                            deleteDisabled={
                                                                                retirerSortieCalendrierEnCours ===
                                                                                    cleRetrait ||
                                                                                !ligneEditableCalendrier ||
                                                                                !onRetirerSortieCalendrier
                                                                            }
                                                                            mainButtonStyle={
                                                                                {
                                                                                    "--plan-cal-carte-bg":
                                                                                        "rgba(13, 110, 92, 0.14)",
                                                                                } as React.CSSProperties
                                                                            }
                                                                        >
                                                                            <span
                                                                                className={
                                                                                    styles.calendrierActiviteMoment
                                                                                }
                                                                            >
                                                                                {item.moment.nom}
                                                                            </span>
                                                                            <span
                                                                                className={
                                                                                    styles.calendrierActiviteNom
                                                                                }
                                                                            >
                                                                                {item.sortie.nom}
                                                                            </span>
                                                                            {plage ? (
                                                                                <span
                                                                                    className={
                                                                                        styles.calendrierActiviteLieu
                                                                                    }
                                                                                >
                                                                                    {plage}
                                                                                </span>
                                                                            ) : null}
                                                                        </CalendrierCarteEditionAvecSuppression>
                                                                    </div>
                                                                );
                                                            }
                                                            const cleConflit = `conflit-${item.sortie.id}-${item.moment.id}-${membre.tokenId}`;
                                                            const enCours =
                                                                conflitResolutionEnCours === cleConflit;
                                                            const plage = libellePlageHorairePrestataire(
                                                                item.sortie.heureDepart,
                                                                item.sortie.heureRetour,
                                                            );
                                                            return (
                                                                <div
                                                                    key={cleConflit}
                                                                    className={styles.calendrierCarteConflit}
                                                                >
                                                                    <p className={styles.calendrierConflitTitre}>
                                                                        Conflit — {item.moment.nom}
                                                                    </p>
                                                                    <p className={styles.calendrierConflitDetail}>
                                                                        Sortie : <strong>{item.sortie.nom}</strong>
                                                                        {plage ? ` (${plage})` : ""}
                                                                        <br />
                                                                        Activité :{" "}
                                                                        <strong>{item.activite.nom}</strong>
                                                                    </p>
                                                                    {peutResoudreConflitsPrestataires &&
                                                                    onResoudreConflitPrestataire ? (
                                                                        <div
                                                                            className={
                                                                                styles.calendrierConflitActions
                                                                            }
                                                                        >
                                                                            <Button
                                                                                color="primary"
                                                                                size="sm"
                                                                                disabled={enCours}
                                                                                onClick={() =>
                                                                                    onResoudreConflitPrestataire(
                                                                                        item,
                                                                                        membre.tokenId,
                                                                                        "sortie",
                                                                                    )
                                                                                }
                                                                            >
                                                                                Afficher la sortie
                                                                            </Button>
                                                                            <Button
                                                                                color="secondary"
                                                                                size="sm"
                                                                                disabled={enCours}
                                                                                onClick={() =>
                                                                                    onResoudreConflitPrestataire(
                                                                                        item,
                                                                                        membre.tokenId,
                                                                                        "activite",
                                                                                    )
                                                                                }
                                                                            >
                                                                                Garder l&apos;activité
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <p
                                                                            className={
                                                                                styles.calendrierConflitHint
                                                                            }
                                                                        >
                                                                            La direction doit trancher ce conflit.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {dansSejour &&
                                                        peutAjouterActivite &&
                                                        ligneEditableCalendrier &&
                                                        dansCellule.length > 0 ? (
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
                <p className={planningCal.footnote}>Période du calendrier indisponible.</p>
            )}
            {activitesCount === 0 && !calendrierFiltreExclutTousLesGroupes ? (
                <p className={planningCal.footnote}>
                    Aucune activité planifiée — cliquez dans une case (jour et animateur) pour en ajouter une.
                </p>
            ) : null}
        </div>
    );
}
