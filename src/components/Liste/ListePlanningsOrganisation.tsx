import { Fragment, useEffect, useMemo, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { FaEdit, FaGripVertical, FaTrashAlt } from "react-icons/fa";
import {
    Button,
    FormGroup,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from "reactstrap";
import type {
    DirecteurInfos,
    GroupeDto,
    HoraireDto,
    LieuDto,
    MomentDto,
    PlanningCelluleDto,
    PlanningCellulePayload,
    PlanningGrilleDetailDto,
    PlanningGrilleSummaryDto,
    PlanningLigneDto,
    PlanningLigneLibelleSource,
    ProfilUtilisateurDTO,
    SavePlanningLigneRequest,
} from "../../types/api";
import { sejourPlanningGrilleService } from "../../services/sejour-planning-grille.service";
import {
    PlanningLigneLibelleSourceLabels,
    planningLibelleLignesSourceOptions,
    planningLigneLibelleSourceOptions,
} from "../../enums/PlanningLigneLibelleSourceLabels";
import { enumererJoursSejour, normaliserJourPlanningPourCle } from "../../helpers/enumererJoursSejour";
import formaterDate from "../../helpers/formaterDate";
import { libelleJourCourtPourBouton, parseYmdVersDateLocale } from "./listeActivitesUtils";
import styles from "./ListePlanningsOrganisation.module.scss";

/** Même libellé de jour que le calendrier des activités (ex. « Lun 15 juil. »). */
function libelleJourCommeCalendrierActivites(ymd: string): string {
    const d = parseYmdVersDateLocale(ymd);
    return d ? libelleJourCourtPourBouton(d) : formaterDate(new Date(`${ymd}T12:00:00`));
}

export interface ListePlanningsOrganisationProps {
    sejourId: number;
    dateDebut: string | number;
    dateFin: string | number;
    grilles: PlanningGrilleSummaryDto[];
    moments: MomentDto[];
    horaires: HoraireDto[];
    groupes: GroupeDto[];
    lieux: LieuDto[];
    /** Membres du séjour (`sejour.equipe`) — sélection des cellules par `tokenId`. */
    membresEquipe?: ProfilUtilisateurDTO[];
    /** Directeur du séjour : ajouté en tête de liste s’il n’est pas déjà dans l’équipe. */
    directeur?: DirecteurInfos | null;
}

/** L’API n’expose plus de hiérarchie parent / enfant sur les lignes : profondeur d’indentation toujours nulle. */
function computeLineDepths(lignes: PlanningLigneDto[]): Map<number, number> {
    return new Map(lignes.map((l) => [l.id, 0]));
}

function cellulePourJour(ligne: PlanningLigneDto, jour: string): PlanningCelluleDto | undefined {
    const key = normaliserJourPlanningPourCle(jour);
    return ligne.cellules.find((c) => normaliserJourPlanningPourCle(c.jour) === key);
}

/** Valeurs renvoyées par l’API pour les cellules « membre » : en pratique des `tokenId` (parfois sérialisés autrement). */
function normaliserTokenIdsAnimateursCellule(raw: unknown): string[] {
    if (raw == null || !Array.isArray(raw)) return [];
    return raw.map((x) => String(x)).filter((s) => s.length > 0);
}

/** Directeur + équipe sans doublon de `tokenId`, tri nom puis prénom. */
function membresDirecteurEtEquipePourModal(
    directeur: DirecteurInfos | null | undefined,
    equipe: ProfilUtilisateurDTO[]
): { tokenId: string; nom: string; prenom: string }[] {
    const seen = new Set<string>();
    const rows: { tokenId: string; nom: string; prenom: string }[] = [];
    if (directeur?.tokenId) {
        const tid = directeur.tokenId.trim();
        if (tid) {
            seen.add(tid);
            rows.push({ tokenId: tid, nom: directeur.nom, prenom: directeur.prenom });
        }
    }
    for (const m of equipe) {
        const tid = (m.tokenId ?? "").trim();
        if (!tid || seen.has(tid)) continue;
        seen.add(tid);
        rows.push({ tokenId: tid, nom: m.nom, prenom: m.prenom });
    }
    return [...rows].sort((a, b) => {
        const c = a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" });
        return c !== 0 ? c : a.prenom.localeCompare(b.prenom, undefined, { sensitivity: "base" });
    });
}

function payloadCelluleVide(p: PlanningCellulePayload): boolean {
    const pasAnim = p.membreTokenIds == null || p.membreTokenIds.length === 0;
    const pasH = p.horaireId == null;
    const pasT = p.texteLibre == null || p.texteLibre.trim() === "";
    const pasM = p.momentId == null;
    const pasG = p.groupeId == null;
    const pasL = p.lieuId == null;
    return pasAnim && pasH && pasT && pasM && pasG && pasL;
}

type LigneEquipePourAffichage = { tokenId: string; nom: string; prenom: string };

function libelleCourtPersonne(m: LigneEquipePourAffichage): string {
    const t = [m.prenom, m.nom]
        .map((x) => (x ?? "").trim())
        .filter((x) => x !== "")
        .join(" ");
    return t || (m.nom ?? "").trim() || (m.prenom ?? "").trim() || "";
}

/** Affiche le texte d’une cellule : pour les `membreTokenIds`, résout les noms via l’équipe du séjour. */
function resumeCellule(
    c: PlanningCelluleDto | undefined,
    groupes: GroupeDto[],
    lieux: LieuDto[],
    horaires: HoraireDto[],
    moments: MomentDto[],
    equipeAvecNoms: LigneEquipePourAffichage[]
): string {
    if (!c) return "—";
    const parts: string[] = [];
    if (c.horaireLibelle) parts.push(c.horaireLibelle);
    else if (c.horaireId != null) {
        const h = horaires.find((x) => x.id === c.horaireId);
        if (h) parts.push(h.libelle);
    }
    if (c.texteLibre != null && c.texteLibre.trim() !== "") parts.push(c.texteLibre.trim());
    if (c.momentId != null) {
        const m = moments.find((x) => x.id === c.momentId);
        if (m) parts.push(m.nom);
    }
    if (c.groupeId != null) {
        const g = groupes.find((x) => x.id === c.groupeId);
        if (g) parts.push(g.nom);
    }
    if (c.lieuId != null) {
        const l = lieux.find((x) => x.id === c.lieuId);
        if (l) parts.push(l.nom);
    }
    const membreIds =
        c.membreTokenIds ??
        (c as { animateurIds?: string[] | null }).animateurIds ??
        [];
    if (Array.isArray(membreIds) && membreIds.length) {
        const byToken = new Map(
            equipeAvecNoms.map((m) => [m.tokenId.trim().toLowerCase(), m] as const)
        );
        for (const tid of membreIds) {
            const t = (tid ?? "").trim();
            if (!t) continue;
            const p = byToken.get(t.toLowerCase());
            if (p) {
                const label = libelleCourtPersonne(p);
                if (label) parts.push(label);
            } else {
                parts.push(t);
            }
        }
    }
    return parts.length ? parts.join(" · ") : "—";
}

/** Règles payload cellule / `sourceContenuCellules` (une seule référence métier selon le type). */
function erreurValidationCellulePourContenu(
    p: PlanningCellulePayload,
    src: PlanningLigneLibelleSource
): string | null {
    if (payloadCelluleVide(p)) return null;
    const refs =
        (p.horaireId != null ? 1 : 0) +
        (p.momentId != null ? 1 : 0) +
        (p.groupeId != null ? 1 : 0) +
        (p.lieuId != null ? 1 : 0);
    switch (src) {
        case "SAISIE_LIBRE":
            if (refs > 0) {
                return "En contenu « Saisie libre », ne renseignez pas d’horaire, moment, groupe ou lieu sur la cellule.";
            }
            if (p.membreTokenIds != null && p.membreTokenIds.length > 0) {
                return "En contenu « Saisie libre », ne renseignez pas de membres d'équipe sur la cellule.";
            }
            return null;
        case "HORAIRE":
            if (p.horaireId == null) return "Sélectionnez un horaire pour cette cellule.";
            if (refs > 1) return "Une seule référence métier par cellule.";
            if (p.texteLibre != null && p.texteLibre.trim() !== "") {
                return "Pour une cellule « Horaire », n'utilisez pas le texte libre.";
            }
            if (p.membreTokenIds != null && p.membreTokenIds.length > 0) {
                return "Pour une cellule « Horaire », ne renseignez pas de membres d'équipe.";
            }
            return null;
        case "MOMENT":
            if (p.momentId == null) return "Sélectionnez un moment pour cette cellule.";
            if (refs > 1) return "Une seule référence métier par cellule.";
            if (p.texteLibre != null && p.texteLibre.trim() !== "") {
                return "Pour une cellule « Moment », n'utilisez pas le texte libre.";
            }
            if (p.membreTokenIds != null && p.membreTokenIds.length > 0) {
                return "Pour une cellule « Moment », ne renseignez pas de membres d'équipe.";
            }
            return null;
        case "GROUPE":
            if (p.groupeId == null) return "Sélectionnez un groupe pour cette cellule.";
            if (refs > 1) return "Une seule référence métier par cellule.";
            if (p.texteLibre != null && p.texteLibre.trim() !== "") {
                return "Pour une cellule « Groupe », n'utilisez pas le texte libre.";
            }
            if (p.membreTokenIds != null && p.membreTokenIds.length > 0) {
                return "Pour une cellule « Groupe », ne renseignez pas de membres d'équipe.";
            }
            return null;
        case "LIEU":
            if (p.lieuId == null) return "Sélectionnez un lieu pour cette cellule.";
            if (refs > 1) return "Une seule référence métier par cellule.";
            if (p.texteLibre != null && p.texteLibre.trim() !== "") {
                return "Pour une cellule « Lieu », n'utilisez pas le texte libre.";
            }
            if (p.membreTokenIds != null && p.membreTokenIds.length > 0) {
                return "Pour une cellule « Lieu », ne renseignez pas de membres d'équipe.";
            }
            return null;
        case "MEMBRE_EQUIPE":
            if (refs > 0) {
                return "En contenu « Membre d'équipe », ne renseignez pas d'horaire, moment, groupe ou lieu sur la cellule.";
            }
            if (p.texteLibre != null && p.texteLibre.trim() !== "") {
                return "Pour une cellule « Membre d'équipe », n'utilisez pas le texte libre ; cochez uniquement des membres.";
            }
            if (p.membreTokenIds == null || p.membreTokenIds.length === 0) {
                return "Indiquez au moins un membre de l'équipe pour cette cellule.";
            }
            return null;
        default:
            return null;
    }
}

/** Pour chaque ligne : cellule libellé de regroupement (rowspan si bloc commun). */
interface RegroupementCellInfo {
    showLeadingCell: boolean;
    rowspan: number;
    libelleRegroupement: string | null;
}

function lignesTrieesParOrdre(lignes: PlanningLigneDto[]): PlanningLigneDto[] {
    return [...lignes].sort((a, b) => a.ordre - b.ordre);
}

/** Libellés de section distincts, dans l’ordre d’apparition dans le tableau. */
function sectionsDepuisLignes(
    lignes: PlanningLigneDto[]
): { libelle: string; ligneIds: number[] }[] {
    const tri = lignesTrieesParOrdre(lignes);
    const m = new Map<string, { libelle: string; ligneIds: number[]; first: number }>();
    tri.forEach((l, i) => {
        const key = l.libelleRegroupement;
        if (key == null || key === "") return;
        if (!m.has(key)) m.set(key, { libelle: key, ligneIds: [], first: i });
        m.get(key)!.ligneIds.push(l.id);
    });
    return [...m.values()].sort((a, b) => a.first - b.first);
}

/**
 * Ranges contigus du tableau : une section (même libellé de regroupement) ou une ligne « hors section ».
 * L’ordre des `lineIds` dans un bloc section est **l’ordre des lignes dans le planning** (inchangé lors d’un déplacement).
 */
type PlanningBlocOrdreLigne =
    | { kind: "section"; libelle: string; lineIds: number[] }
    | { kind: "hors"; lineIds: number[] };

function decomposerEnBlocsOrdre(lignes: PlanningLigneDto[]): PlanningBlocOrdreLigne[] {
    const tri = lignesTrieesParOrdre(lignes);
    const blocs: PlanningBlocOrdreLigne[] = [];
    let i = 0;
    while (i < tri.length) {
        const l = tri[i]!;
        const rg = l.libelleRegroupement;
        if (rg == null || rg.trim() === "") {
            blocs.push({ kind: "hors", lineIds: [l.id] });
            i += 1;
        } else {
            const lineIds: number[] = [l.id];
            let j = i + 1;
            while (j < tri.length && tri[j]!.libelleRegroupement === rg) {
                lineIds.push(tri[j]!.id);
                j += 1;
            }
            blocs.push({ kind: "section", libelle: rg, lineIds });
            i = j;
        }
    }
    return blocs;
}

function infosRegroupementParLigne(lignes: PlanningLigneDto[]): RegroupementCellInfo[] {
    const out: RegroupementCellInfo[] = [];
    let i = 0;
    while (i < lignes.length) {
        const ligne = lignes[i];
        const key = ligne.libelleRegroupement;
        if (key != null) {
            let j = i + 1;
            while (j < lignes.length && lignes[j].libelleRegroupement === key) {
                j++;
            }
            const n = j - i;
            for (let k = 0; k < n; k++) {
                out.push({
                    showLeadingCell: k === 0,
                    rowspan: n,
                    libelleRegroupement: key,
                });
            }
            i = j;
        } else {
            out.push({
                showLeadingCell: true,
                rowspan: 1,
                libelleRegroupement: null,
            });
            i++;
        }
    }
    return out;
}

function grilleAfficheColonneRegroupement(lignes: PlanningLigneDto[]): boolean {
    return lignes.some((l) => l.libelleRegroupement != null && l.libelleRegroupement.trim() !== "");
}

/**
 * Affiche la colonne dès qu’un type de libellé de ligne est choisi sur la grille
 * (sinon, avec Lieu / Groupe / Horaire / Moment, le texte n’est que dans les refs, pas dans `libelleSaisieLibre`.)
 */
function grilleAfficheColonneLibelleLigne(d: PlanningGrilleDetailDto): boolean {
    return d.sourceLibelleLignes != null;
}

/** État du formulaire ligne (UI) — converti en SavePlanningLigneRequest à l’envoi. Le type vient du planning. */
interface PlanningLigneFormState {
    libelleLibre: string;
    /** Conservé à l’édition : le regroupement se gère sur l’écran tableau, pas dans ce modal. */
    libelleRegroupementPreserve: string | null;
    entiteId: string;
}

const LINE_FORM_DEFAUT = (): PlanningLigneFormState => ({
    libelleLibre: "",
    libelleRegroupementPreserve: null,
    entiteId: "",
});

/** Libellé de section normalisé pour comparer des lignes du même bloc d’ordre. */
function cleRegroupementPourTri(libelleRegroupement: string | null): string | null {
    if (libelleRegroupement == null || libelleRegroupement === "") return null;
    return libelleRegroupement;
}

/** Indices dans `lignes` des lignes de la même section que `ligne` (ordre affiché = ordre API). */
function indicesMemeBlocOrdre(lignes: PlanningLigneDto[], ligne: PlanningLigneDto): number[] {
    const rg = cleRegroupementPourTri(ligne.libelleRegroupement);
    return lignes
        .map((l, i) => {
            const lrg = cleRegroupementPourTri(l.libelleRegroupement);
            return lrg === rg ? i : -1;
        })
        .filter((i) => i >= 0);
}

function sontMemeBlocOrdre(a: PlanningLigneDto, b: PlanningLigneDto): boolean {
    return cleRegroupementPourTri(a.libelleRegroupement) === cleRegroupementPourTri(b.libelleRegroupement);
}

/**
 * Réordonne la liste : déposer sur la ligne *cible* signifie que la ligne déplacée prend sa place
 * (au-dessus si on remonte, en dessous si on descend). Sans cela, glisser une ligne sur celle
 * juste en dessous ne changeait rien, car l’ancienne logique n’insérait jamais « après » la cible.
 */
function reorderIdsInList<T>(order: T[], dragged: T, target: T): T[] {
    if (dragged === target) return order;
    const draggedIdx = order.indexOf(dragged);
    const targetIdx = order.indexOf(target);
    if (draggedIdx === -1 || targetIdx === -1) return order;

    const next = order.filter((x) => x !== dragged);
    const newTargetIdx = next.indexOf(target);
    if (newTargetIdx === -1) return order;

    if (draggedIdx < targetIdx) {
        // Ligne qu’on fait descendre : se placer après la cible
        next.splice(newTargetIdx + 1, 0, dragged);
    } else {
        // Ligne qu’on fait remonter : se placer avant la cible
        next.splice(newTargetIdx, 0, dragged);
    }
    return next;
}

function reorderBlocsAvecCile(
    blocs: PlanningBlocOrdreLigne[],
    dragIndex: number,
    targetIndex: number
): PlanningBlocOrdreLigne[] {
    if (dragIndex === targetIndex) return blocs;
    const dragged = blocs[dragIndex]!;
    const target = blocs[targetIndex]!;
    return reorderIdsInList(blocs, dragged, target);
}

function prochainOrdreNouvelleLigne(lignes: PlanningLigneDto[], regroupementPreserve: string | null): number {
    const rg = cleRegroupementPourTri(regroupementPreserve);
    const peers = lignes.filter((l) => {
        const lrg = cleRegroupementPourTri(l.libelleRegroupement);
        return lrg === rg;
    });
    if (peers.length === 0) {
        // Aucune ligne existante n’a déjà ce regroupement (ex. nouvelle ligne « hors section »
        // alors que toutes les autres sont dans une section) : on place en fin de tableau,
        // pas en ordre 0 (évite un doublon d’`ordre` et un ordre d’affichage incohérent).
        if (lignes.length === 0) return 0;
        return Math.max(...lignes.map((l) => l.ordre), 0) + 1;
    }
    return Math.max(...peers.map((l) => l.ordre), 0) + 1;
}

/** Type de libellé des lignes (champ `sourceLibelleLignes` sur la grille) pour les formulaires : la saisie « membre » n’y est pas gérée. */
function sourceLibelleEffectifGrille(d: PlanningGrilleDetailDto): PlanningLigneLibelleSource {
    const s = d.sourceLibelleLignes ?? "SAISIE_LIBRE";
    return s === "MEMBRE_EQUIPE" ? "SAISIE_LIBRE" : s;
}

/** Type réel côté API (incl. `MEMBRE_EQUIPE`) pour reconstruire un `SavePlanningLigneRequest` à partir d’une ligne chargée. */
function sourceLibellePourApi(d: PlanningGrilleDetailDto): PlanningLigneLibelleSource {
    return d.sourceLibelleLignes ?? "SAISIE_LIBRE";
}

/** Grille créée avec « pas de libellé de ligne » (`sourceLibelleLignes` absent ou null côté API). */
function grilleLibelleLignesDesactive(d: PlanningGrilleDetailDto): boolean {
    return d.sourceLibelleLignes == null;
}

function sourceContenuCellulesEffectif(d: PlanningGrilleDetailDto): PlanningLigneLibelleSource {
    return d.sourceContenuCellules ?? "SAISIE_LIBRE";
}

function libelleEntiteAttendu(
    l: PlanningLigneDto,
    sourceLignes: PlanningLigneLibelleSource,
    groupes: GroupeDto[],
    lieux: LieuDto[],
    horaires: HoraireDto[],
    moments: MomentDto[]
): string {
    switch (sourceLignes) {
        case "GROUPE":
            return groupes.find((g) => g.id === l.libelleGroupeId)?.nom ?? "";
        case "LIEU":
            return lieux.find((x) => x.id === l.libelleLieuId)?.nom ?? "";
        case "HORAIRE":
            return horaires.find((h) => h.id === l.libelleHoraireId)?.libelle ?? "";
        case "MOMENT":
            return moments.find((m) => m.id === l.libelleMomentId)?.nom ?? "";
        case "MEMBRE_EQUIPE":
            return "";
        default:
            return "";
    }
}

function libelleLignePourAffichage(
    l: PlanningLigneDto,
    sourceLignes: PlanningLigneLibelleSource,
    groupes: GroupeDto[],
    lieux: LieuDto[],
    horaires: HoraireDto[],
    moments: MomentDto[],
    equipeAvecNoms: { tokenId: string; nom: string; prenom: string }[]
): string {
    const t = (l.libelleSaisieLibre ?? "").trim();
    if (t) return t;
    if (l.libelleUtilisateurTokenId) {
        const m = equipeAvecNoms.find((x) => x.tokenId === l.libelleUtilisateurTokenId);
        if (m) {
            const full = [m.prenom, m.nom].filter((x) => (x ?? "").trim() !== "").join(" ");
            if (full) return full;
        }
    }
    const ent = libelleEntiteAttendu(l, sourceLignes, groupes, lieux, horaires, moments);
    if (ent) return ent;
    return "";
}

function validateLineForm(
    form: PlanningLigneFormState,
    sourceLibelle: PlanningLigneLibelleSource
): string | null {
    if (sourceLibelle === "MEMBRE_EQUIPE") {
        return "Le type « Membre d'équipe » n'est pas autorisé pour le libellé des lignes. Corrigez le planning dans « Modifier infos ».";
    }
    if (sourceLibelle === "SAISIE_LIBRE") {
        return null;
    }
    if (!form.entiteId.trim() || Number.isNaN(parseInt(form.entiteId, 10))) {
        return "Sélectionnez l’entité correspondant au type de libellé de la ligne.";
    }
    return null;
}

function buildSaveLigneRequest(
    form: PlanningLigneFormState,
    sourceLibelle: PlanningLigneLibelleSource,
    ordre: number,
    sansLibelleLigneColonne?: boolean
): SavePlanningLigneRequest {
    const src = sourceLibelle;
    const base: SavePlanningLigneRequest = {
        ordre,
        libelleRegroupement: form.libelleRegroupementPreserve,
        libelleMomentId: null,
        libelleHoraireId: null,
        libelleGroupeId: null,
        libelleLieuId: null,
        libelleUtilisateurTokenId: null,
    };

    switch (src) {
        case "SAISIE_LIBRE": {
            if (sansLibelleLigneColonne) {
                return { ...base, libelleSaisieLibre: null };
            }
            const t = form.libelleLibre.trim();
            return { ...base, libelleSaisieLibre: t === "" ? null : t };
        }
        case "GROUPE":
            return {
                ...base,
                libelleGroupeId: parseInt(form.entiteId, 10),
                libelleSaisieLibre: null,
            };
        case "LIEU":
            return {
                ...base,
                libelleLieuId: parseInt(form.entiteId, 10),
                libelleSaisieLibre: null,
            };
        case "HORAIRE":
            return {
                ...base,
                libelleHoraireId: parseInt(form.entiteId, 10),
                libelleSaisieLibre: null,
            };
        case "MOMENT":
            return {
                ...base,
                libelleMomentId: parseInt(form.entiteId, 10),
                libelleSaisieLibre: null,
            };
        default:
            return { ...base, libelleSaisieLibre: null };
    }
}

/** Reconstruit un payload PUT à partir d’une ligne déjà chargée (ex. mise à jour du seul regroupement). */
function planningLigneDetailToSaveRequest(
    l: PlanningLigneDto,
    sourceLignes: PlanningLigneLibelleSource,
    groupes: GroupeDto[],
    lieux: LieuDto[],
    horaires: HoraireDto[],
    moments: MomentDto[],
    sansLibelleLigneColonne?: boolean
): SavePlanningLigneRequest {
    const attendu = libelleEntiteAttendu(l, sourceLignes, groupes, lieux, horaires, moments);
    const libelleTrim = (l.libelleSaisieLibre ?? "").trim();
    const base: SavePlanningLigneRequest = {
        ordre: l.ordre,
        libelleRegroupement: l.libelleRegroupement,
        libelleMomentId: null,
        libelleHoraireId: null,
        libelleGroupeId: null,
        libelleLieuId: null,
        libelleUtilisateurTokenId: null,
    };
    switch (sourceLignes) {
        case "SAISIE_LIBRE":
            return {
                ...base,
                libelleSaisieLibre: sansLibelleLigneColonne ? null : l.libelleSaisieLibre,
            };
        case "GROUPE": {
            if (l.libelleGroupeId == null) return { ...base, libelleSaisieLibre: l.libelleSaisieLibre };
            const libelleSaisieLibre =
                attendu && libelleTrim === attendu.trim() ? null : libelleTrim || null;
            return { ...base, libelleGroupeId: l.libelleGroupeId, libelleSaisieLibre };
        }
        case "LIEU": {
            if (l.libelleLieuId == null) return { ...base, libelleSaisieLibre: l.libelleSaisieLibre };
            const libelleSaisieLibre =
                attendu && libelleTrim === attendu.trim() ? null : libelleTrim || null;
            return { ...base, libelleLieuId: l.libelleLieuId, libelleSaisieLibre };
        }
        case "HORAIRE": {
            if (l.libelleHoraireId == null) return { ...base, libelleSaisieLibre: l.libelleSaisieLibre };
            const libelleSaisieLibre =
                attendu && libelleTrim === attendu.trim() ? null : libelleTrim || null;
            return { ...base, libelleHoraireId: l.libelleHoraireId, libelleSaisieLibre };
        }
        case "MOMENT": {
            if (l.libelleMomentId == null) return { ...base, libelleSaisieLibre: l.libelleSaisieLibre };
            const libelleSaisieLibre =
                attendu && libelleTrim === attendu.trim() ? null : libelleTrim || null;
            return { ...base, libelleMomentId: l.libelleMomentId, libelleSaisieLibre };
        }
        case "MEMBRE_EQUIPE": {
            if (l.libelleUtilisateurTokenId == null)
                return { ...base, libelleSaisieLibre: l.libelleSaisieLibre };
            const libelleSaisieLibre =
                attendu && libelleTrim === attendu.trim() ? null : libelleTrim || null;
            return {
                ...base,
                libelleUtilisateurTokenId: l.libelleUtilisateurTokenId,
                libelleSaisieLibre,
            };
        }
        default:
            return { ...base, libelleSaisieLibre: l.libelleSaisieLibre };
    }
}

function optionsPourSource(
    source: PlanningLigneLibelleSource | null,
    groupes: GroupeDto[],
    lieux: LieuDto[],
    horaires: HoraireDto[],
    moments: MomentDto[]
): { id: number; label: string }[] {
    if (source == null) return [];
    switch (source) {
        case "GROUPE":
            return groupes.map((g) => ({ id: g.id, label: g.nom }));
        case "LIEU":
            return lieux.map((x) => ({ id: x.id, label: x.nom }));
        case "HORAIRE":
            return horaires.map((h) => ({ id: h.id, label: h.libelle }));
        case "MOMENT":
            return moments.map((m) => ({ id: m.id, label: m.nom }));
        default:
            return [];
    }
}

function labelSelectEntite(source: PlanningLigneLibelleSource): string {
    if (source == null) return "Entité";
    switch (source) {
        case "GROUPE":
            return "Choisir un groupe";
        case "LIEU":
            return "Choisir un lieu";
        case "HORAIRE":
            return "Choisir un horaire";
        case "MOMENT":
            return "Choisir un moment";
        default:
            return "Entité";
    }
}

interface MetaFormState {
    titre: string;
    consigneGlobale: string | null;
    sourceLibelleLignes: PlanningLigneLibelleSource | null;
    sourceContenuCellules: PlanningLigneLibelleSource | null;
}

const META_VIDE: MetaFormState = {
    titre: "",
    consigneGlobale: null,
    sourceLibelleLignes: null,
    sourceContenuCellules: null,
};

function ListePlanningsOrganisation({
    sejourId,
    dateDebut,
    dateFin,
    grilles,
    moments,
    horaires,
    groupes,
    lieux,
    membresEquipe = [],
    directeur,
}: ListePlanningsOrganisationProps) {
    const revalidator = useRevalidator();
    const jours = enumererJoursSejour(dateDebut, dateFin);

    const membresPourCellulesModal = useMemo(
        () => membresDirecteurEtEquipePourModal(directeur, membresEquipe),
        [directeur, membresEquipe]
    );

    const grillesTriAlphabetique = useMemo(
        () =>
            [...grilles].sort((a, b) =>
                a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" })
            ),
        [grilles]
    );

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [metaModalOpen, setMetaModalOpen] = useState(false);
    const [metaSubmitting, setMetaSubmitting] = useState(false);
    const [metaError, setMetaError] = useState<string | null>(null);
    const [metaEditingId, setMetaEditingId] = useState<number | null>(null);
    const [metaForm, setMetaForm] = useState<MetaFormState>(META_VIDE);
    const [metaPlanningLigneCount, setMetaPlanningLigneCount] = useState(0);

    const [deleteGrilleModalOpen, setDeleteGrilleModalOpen] = useState(false);
    const [pendingDeleteGrilleId, setPendingDeleteGrilleId] = useState<number | null>(null);
    const [deletingGrille, setDeletingGrille] = useState(false);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editorGrilleId, setEditorGrilleId] = useState<number | null>(null);
    const [detail, setDetail] = useState<PlanningGrilleDetailDto | null>(null);
    const [editorLoading, setEditorLoading] = useState(false);
    const [editorError, setEditorError] = useState<string | null>(null);

    const [lineModalOpen, setLineModalOpen] = useState(false);
    const [lineSubmitting, setLineSubmitting] = useState(false);
    /** Création directe (sans modale) lorsqu’il n’y a pas de colonne libellé de ligne. */
    const [ligneRapideBusy, setLigneRapideBusy] = useState(false);
    const [lineError, setLineError] = useState<string | null>(null);
    const [lineEditingId, setLineEditingId] = useState<number | null>(null);
    const [lineForm, setLineForm] = useState<PlanningLigneFormState>(LINE_FORM_DEFAUT);
    const [lineReorderBusy, setLineReorderBusy] = useState(false);
    const [draggingPlanningLigneId, setDraggingPlanningLigneId] = useState<number | null>(null);
    const [dropTargetPlanningLigneId, setDropTargetPlanningLigneId] = useState<number | null>(null);

    const [draggingSectionBlocIndex, setDraggingSectionBlocIndex] = useState<number | null>(null);
    const [dropTargetSectionBlocIndex, setDropTargetSectionBlocIndex] = useState<number | null>(null);
    const [reordonnancementSectionBusy, setReordonnancementSectionBusy] = useState(false);

    const [deletingLine, setDeletingLine] = useState(false);

    const [cellModalOpen, setCellModalOpen] = useState(false);
    const [cellSubmitting, setCellSubmitting] = useState(false);
    const [cellError, setCellError] = useState<string | null>(null);
    const [cellLigneId, setCellLigneId] = useState<number | null>(null);
    const [cellJour, setCellJour] = useState<string | null>(null);
    const [cellHoraireId, setCellHoraireId] = useState<string>("");
    const [cellMomentId, setCellMomentId] = useState<string>("");
    const [cellGroupeId, setCellGroupeId] = useState<string>("");
    const [cellLieuId, setCellLieuId] = useState<string>("");
    const [cellTexte, setCellTexte] = useState("");
    const [cellMembresTokensSelection, setCellMembresTokensSelection] = useState<string[]>([]);

    const [sectionModalOpen, setSectionModalOpen] = useState(false);
    const [sectionModalError, setSectionModalError] = useState<string | null>(null);
    const [sectionBusy, setSectionBusy] = useState(false);
    const [newSectionLibelle, setNewSectionLibelle] = useState("");
    const [newSectionLineIds, setNewSectionLineIds] = useState<Set<number>>(() => new Set());
    /** Section en cours d’édition (libellé actuel côté API, clé stable jusqu’à enregistrement). */
    const [sectionEditTarget, setSectionEditTarget] = useState<string | null>(null);
    const [editSectionLibelleInput, setEditSectionLibelleInput] = useState("");
    const [editSectionLineIds, setEditSectionLineIds] = useState<Set<number>>(() => new Set());
    const [deletingSection, setDeletingSection] = useState<string | null>(null);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setSuccessModalOpen(true);
    };

    const refreshAfterMutation = () => {
        revalidator.revalidate();
    };

    useEffect(() => {
        if (!editorOpen || editorGrilleId == null) return;
        let cancelled = false;
        (async () => {
            setEditorLoading(true);
            setEditorError(null);
            try {
                const d = await sejourPlanningGrilleService.getGrilleDetail(sejourId, editorGrilleId);
                if (!cancelled) setDetail(d);
            } catch (e: unknown) {
                if (!cancelled)
                    setEditorError(e instanceof Error ? e.message : "Chargement impossible");
            } finally {
                if (!cancelled) setEditorLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [editorOpen, editorGrilleId, sejourId]);

    useEffect(() => {
        if (!editorOpen) setSectionModalOpen(false);
    }, [editorOpen]);

    const reloadDetail = async () => {
        if (editorGrilleId == null) return;
        const d = await sejourPlanningGrilleService.getGrilleDetail(sejourId, editorGrilleId);
        setDetail(d);
    };

    const appliquerDeplacementSectionEntreBlocs = async (fromBlocIdx: number, toBlocIdx: number) => {
        if (editorGrilleId == null || !detail || fromBlocIdx === toBlocIdx) return;
        const blocs = decomposerEnBlocsOrdre(lignesTrieesParOrdre(detail.lignes));
        const fromB = blocs[fromBlocIdx];
        const toB = blocs[toBlocIdx];
        if (!fromB || !toB || fromB.kind !== "section" || toB.kind !== "section") return;
        const reordered = reorderBlocsAvecCile(blocs, fromBlocIdx, toBlocIdx);
        const orderedIds = reordered.flatMap((b) => b.lineIds);
        setReordonnancementSectionBusy(true);
        setEditorError(null);
        try {
            for (let o = 0; o < orderedIds.length; o++) {
                const id = orderedIds[o]!;
                const ligne = detail.lignes.find((l) => l.id === id);
                if (!ligne || ligne.ordre === o) continue;
                const payload = planningLigneDetailToSaveRequest(
                    ligne,
                    sourceLibellePourApi(detail),
                    groupes,
                    lieux,
                    horaires,
                    moments,
                    grilleLibelleLignesDesactive(detail)
                );
                payload.ordre = o;
                await sejourPlanningGrilleService.modifierLigne(sejourId, editorGrilleId, id, payload);
            }
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setEditorError(e instanceof Error ? e.message : "Impossible de déplacer la section");
        } finally {
            setReordonnancementSectionBusy(false);
        }
    };

    const openCreateMeta = () => {
        setMetaError(null);
        setMetaEditingId(null);
        setMetaPlanningLigneCount(0);
        setMetaForm({ ...META_VIDE, titre: "", consigneGlobale: null });
        setMetaModalOpen(true);
    };

    const handleMetaSubmit = async () => {
        const titre = metaForm.titre.trim();
        if (!titre) {
            setMetaError("Le titre est obligatoire.");
            return;
        }
        if (metaForm.sourceLibelleLignes === "MEMBRE_EQUIPE") {
            setMetaError(
                "Le type « Membre d'équipe » est réservé au contenu des cellules, pas au libellé des lignes."
            );
            return;
        }
        setMetaError(null);
        setMetaSubmitting(true);
        try {
            if (metaEditingId == null) {
                const created = await sejourPlanningGrilleService.creerGrille(sejourId, {
                    titre,
                    consigneGlobale: metaForm.consigneGlobale?.trim() || null,
                    sourceLibelleLignes: metaForm.sourceLibelleLignes ?? null,
                    sourceContenuCellules: metaForm.sourceContenuCellules ?? null,
                });
                setMetaModalOpen(false);
                refreshAfterMutation();
                openConsultEditTable(created.id);
            } else {
                await sejourPlanningGrilleService.modifierGrille(sejourId, metaEditingId, {
                    titre,
                    consigneGlobale: metaForm.consigneGlobale?.trim() || null,
                    sourceLibelleLignes: metaForm.sourceLibelleLignes ?? null,
                    sourceContenuCellules: metaForm.sourceContenuCellules ?? null,
                });
                showSuccess("Planning mis à jour.");
                setMetaModalOpen(false);
                if (editorOpen && editorGrilleId != null && editorGrilleId === metaEditingId) {
                    const d = await sejourPlanningGrilleService.getGrilleDetail(sejourId, metaEditingId);
                    setDetail(d);
                }
                refreshAfterMutation();
            }
        } catch (e: unknown) {
            setMetaError(e instanceof Error ? e.message : "Enregistrement impossible");
        } finally {
            setMetaSubmitting(false);
        }
    };

    const loadMetaForEdit = async (grilleId: number) => {
        setMetaError(null);
        setMetaSubmitting(true);
        try {
            const d = await sejourPlanningGrilleService.getGrilleDetail(sejourId, grilleId);
            setMetaEditingId(grilleId);
            setMetaPlanningLigneCount(d.lignes.length);
            setMetaForm({
                titre: d.titre,
                consigneGlobale: d.consigneGlobale,
                sourceLibelleLignes:
                    d.sourceLibelleLignes === "MEMBRE_EQUIPE"
                        ? "SAISIE_LIBRE"
                        : (d.sourceLibelleLignes ?? null),
                sourceContenuCellules: d.sourceContenuCellules ?? null,
            });
            setMetaModalOpen(true);
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Chargement impossible");
        } finally {
            setMetaSubmitting(false);
        }
    };

    const requestDeleteGrille = (id: number) => {
        setPendingDeleteGrilleId(id);
        setDeleteGrilleModalOpen(true);
    };

    const confirmDeleteGrille = async () => {
        if (pendingDeleteGrilleId == null) return;
        const idSupprime = pendingDeleteGrilleId;
        setDeletingGrille(true);
        setErrorMessage(null);
        try {
            await sejourPlanningGrilleService.supprimerGrille(sejourId, idSupprime);
            setDeleteGrilleModalOpen(false);
            setPendingDeleteGrilleId(null);
            if (editorGrilleId === idSupprime) {
                setEditorOpen(false);
                setEditorGrilleId(null);
                setDetail(null);
            }
            showSuccess("Planning supprimé.");
            refreshAfterMutation();
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "Suppression impossible");
        } finally {
            setDeletingGrille(false);
        }
    };

    const openConsultEditTable = (grilleId: number) => {
        setEditorError(null);
        setEditorGrilleId(grilleId);
        setDetail(null);
        setEditorOpen(true);
    };

    const openSectionModal = () => {
        if (!detail) return;
        setSectionModalError(null);
        setNewSectionLibelle("");
        setNewSectionLineIds(new Set());
        setSectionEditTarget(null);
        setEditSectionLibelleInput("");
        setEditSectionLineIds(new Set());
        setDeletingSection(null);
        setSectionModalOpen(true);
    };

    const openEditSection = (libelle: string, ligneIds: number[]) => {
        setSectionModalError(null);
        setDeletingSection(null);
        setSectionEditTarget(libelle);
        setEditSectionLibelleInput(libelle);
        setEditSectionLineIds(new Set(ligneIds));
    };

    const cancelEditSection = () => {
        setSectionEditTarget(null);
        setEditSectionLibelleInput("");
        setEditSectionLineIds(new Set());
        setSectionModalError(null);
    };

    const appliquerLibelleRegroupementSurLignes = async (ligneIds: number[], libelle: string | null) => {
        if (editorGrilleId == null || !detail) return;
        for (const id of ligneIds) {
            const ligne = detail.lignes.find((x) => x.id === id);
            if (!ligne) continue;
            const payload = planningLigneDetailToSaveRequest(
                ligne,
                sourceLibellePourApi(detail),
                groupes,
                lieux,
                horaires,
                moments,
                grilleLibelleLignesDesactive(detail)
            );
            payload.libelleRegroupement = libelle;
            await sejourPlanningGrilleService.modifierLigne(sejourId, editorGrilleId, id, payload);
        }
    };

    const handleCreerSection = async () => {
        if (editorGrilleId == null || !detail) return;
        const lib = newSectionLibelle.trim();
        if (!lib) {
            setSectionModalError("Saisissez un libellé de section.");
            return;
        }
        const ids = [...newSectionLineIds];
        if (ids.length === 0) {
            setSectionModalError("Cochez au moins une ligne à rattacher à cette section.");
            return;
        }
        for (const id of ids) {
            const ligne = detail.lignes.find((l) => l.id === id);
            if (ligne?.libelleRegroupement != null && ligne.libelleRegroupement !== "") {
                setSectionModalError(
                    "Une ligne sélectionnée est déjà dans une section. Retirez-la de cette section avant de la rattacher ici."
                );
                return;
            }
        }
        setSectionModalError(null);
        setSectionBusy(true);
        try {
            await appliquerLibelleRegroupementSurLignes(ids, lib);
            setNewSectionLibelle("");
            setNewSectionLineIds(new Set());
            showSuccess("Section créée.");
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setSectionModalError(e instanceof Error ? e.message : "Enregistrement impossible");
        } finally {
            setSectionBusy(false);
        }
    };

    const handleEnregistrerModificationSection = async () => {
        if (editorGrilleId == null || !detail || sectionEditTarget == null) return;
        const newLibelle = editSectionLibelleInput.trim();
        if (!newLibelle) {
            setSectionModalError("Le libellé de la section ne peut pas être vide.");
            return;
        }
        if (editSectionLineIds.size === 0) {
            setSectionModalError("Gardez au moins une ligne dans la section, ou supprimez la section entière.");
            return;
        }
        const oldLibelle = sectionEditTarget;
        for (const id of editSectionLineIds) {
            const ligne = detail.lignes.find((l) => l.id === id);
            if (!ligne) continue;
            const rg = ligne.libelleRegroupement;
            if (rg != null && rg !== "" && rg !== oldLibelle) {
                setSectionModalError(
                    "Une ligne cochée appartient déjà à une autre section. Décochez-la ou retirez-la de l’autre section d’abord."
                );
                return;
            }
        }
        const prevIds = detail.lignes
            .filter((l) => l.libelleRegroupement === oldLibelle)
            .map((l) => l.id);
        const toRemove = prevIds.filter((id) => !editSectionLineIds.has(id));
        const toAssign = [...editSectionLineIds];
        setSectionModalError(null);
        setSectionBusy(true);
        try {
            if (toRemove.length) await appliquerLibelleRegroupementSurLignes(toRemove, null);
            if (toAssign.length) await appliquerLibelleRegroupementSurLignes(toAssign, newLibelle);
            cancelEditSection();
            showSuccess("Section mise à jour.");
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setSectionModalError(e instanceof Error ? e.message : "Enregistrement impossible");
        } finally {
            setSectionBusy(false);
        }
    };

    const handleSupprimerSectionConfirm = async () => {
        if (deletingSection == null || editorGrilleId == null || !detail) return;
        const ids = detail.lignes
            .filter((l) => l.libelleRegroupement === deletingSection)
            .map((l) => l.id);
        if (ids.length === 0) {
            setDeletingSection(null);
            return;
        }
        setSectionModalError(null);
        setSectionBusy(true);
        try {
            await appliquerLibelleRegroupementSurLignes(ids, null);
            setDeletingSection(null);
            showSuccess("Section supprimée.");
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setSectionModalError(e instanceof Error ? e.message : "Suppression impossible");
        } finally {
            setSectionBusy(false);
        }
    };

    const creerLigneSansModal = async () => {
        if (editorGrilleId == null || !detail) return;
        if (!grilleLibelleLignesDesactive(detail)) return;
        setEditorError(null);
        setLigneRapideBusy(true);
        try {
            const src = sourceLibelleEffectifGrille(detail);
            const errForm = validateLineForm(LINE_FORM_DEFAUT(), src);
            if (errForm) {
                setEditorError(errForm);
                return;
            }
            const ordre = prochainOrdreNouvelleLigne(
                lignesTrieesParOrdre(detail.lignes),
                null
            );
            const payload = buildSaveLigneRequest(
                LINE_FORM_DEFAUT(),
                src,
                ordre,
                true
            );
            await sejourPlanningGrilleService.creerLigne(sejourId, editorGrilleId, payload);
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setEditorError(
                e instanceof Error ? e.message : "Création de la ligne impossible"
            );
        } finally {
            setLigneRapideBusy(false);
        }
    };

    const openCreateLine = () => {
        if (editorGrilleId == null || !detail) return;
        if (grilleLibelleLignesDesactive(detail)) {
            void creerLigneSansModal();
            return;
        }
        setEditorError(null);
        setLineError(null);
        setLineEditingId(null);
        setLineForm(LINE_FORM_DEFAUT());
        setLineModalOpen(true);
    };

    const openEditLine = (l: PlanningLigneDto) => {
        if (!detail) return;
        setEditorError(null);
        setLineError(null);
        setLineEditingId(l.id);
        let entiteId = "";
        if (l.libelleGroupeId != null) entiteId = String(l.libelleGroupeId);
        else if (l.libelleLieuId != null) entiteId = String(l.libelleLieuId);
        else if (l.libelleHoraireId != null) entiteId = String(l.libelleHoraireId);
        else if (l.libelleMomentId != null) entiteId = String(l.libelleMomentId);
        else if (l.libelleUtilisateurTokenId) entiteId = l.libelleUtilisateurTokenId;

        const src = sourceLibelleEffectifGrille(detail);
        setLineForm({
            libelleLibre: src === "SAISIE_LIBRE" ? (l.libelleSaisieLibre ?? "") : "",
            libelleRegroupementPreserve: l.libelleRegroupement,
            entiteId,
        });
        setLineModalOpen(true);
    };

    const appliquerGlisserDeposerOrdreLignes = async (draggedId: number, targetId: number) => {
        if (editorGrilleId == null || !detail || draggedId === targetId) return;
        const lignesOrd = lignesTrieesParOrdre(detail.lignes);
        const dragged = lignesOrd.find((l) => l.id === draggedId);
        const target = lignesOrd.find((l) => l.id === targetId);
        if (!dragged || !target || !sontMemeBlocOrdre(dragged, target)) return;

        const peersIdx = indicesMemeBlocOrdre(lignesOrd, dragged);
        const ordered = peersIdx.map((i) => lignesOrd[i]!);
        const ids = ordered.map((l) => l.id);
        const newIds = reorderIdsInList(ids, draggedId, targetId);
        const newOrdered = newIds.map((id) => ordered.find((l) => l.id === id)!);
        const updates = newOrdered
            .map((l, newOrdre) => ({ l, newOrdre }))
            .filter(({ l, newOrdre }) => l.ordre !== newOrdre);
        if (updates.length === 0) return;

        setLineReorderBusy(true);
        setEditorError(null);
        try {
            for (const { l, newOrdre } of updates) {
                const payload = planningLigneDetailToSaveRequest(
                    l,
                    sourceLibellePourApi(detail),
                    groupes,
                    lieux,
                    horaires,
                    moments,
                    grilleLibelleLignesDesactive(detail)
                );
                payload.ordre = newOrdre;
                await sejourPlanningGrilleService.modifierLigne(sejourId, editorGrilleId, l.id, payload);
            }
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setEditorError(e instanceof Error ? e.message : "Impossible de modifier l’ordre");
        } finally {
            setLineReorderBusy(false);
        }
    };

    const handleLineSubmit = async () => {
        if (editorGrilleId == null || !detail) return;
        const src = sourceLibelleEffectifGrille(detail);
        const validation = validateLineForm(lineForm, src);
        if (validation) {
            setLineError(validation);
            return;
        }
        setLineError(null);
        setLineSubmitting(true);
        const ordrePourSauvegarde =
            lineEditingId == null
                ? prochainOrdreNouvelleLigne(
                      lignesTrieesParOrdre(detail.lignes),
                      lineForm.libelleRegroupementPreserve
                  )
                : (detail.lignes.find((l) => l.id === lineEditingId)?.ordre ?? 0);
        const payload = buildSaveLigneRequest(
            lineForm,
            src,
            ordrePourSauvegarde,
            grilleLibelleLignesDesactive(detail)
        );
        try {
            if (lineEditingId == null) {
                await sejourPlanningGrilleService.creerLigne(sejourId, editorGrilleId, payload);
            } else {
                await sejourPlanningGrilleService.modifierLigne(sejourId, editorGrilleId, lineEditingId, payload);
            }
            setLineModalOpen(false);
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setLineError(e instanceof Error ? e.message : "Enregistrement impossible");
        } finally {
            setLineSubmitting(false);
        }
    };

    const handleDeleteLine = async (ligneId: number) => {
        if (editorGrilleId == null) return;
        setEditorError(null);
        setDeletingLine(true);
        try {
            await sejourPlanningGrilleService.supprimerLigne(sejourId, editorGrilleId, ligneId);
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setEditorError(e instanceof Error ? e.message : "Suppression impossible");
        } finally {
            setDeletingLine(false);
        }
    };

    const openCellModal = (ligneId: number, jour: string) => {
        if (!detail) return;
        const ligne = detail.lignes.find((l) => l.id === ligneId);
        if (!ligne) return;
        const cell = cellulePourJour(ligne, jour);
        setCellError(null);
        setCellLigneId(ligneId);
        setCellJour(jour);
        setCellHoraireId(cell?.horaireId != null ? String(cell.horaireId) : "");
        setCellMomentId(cell?.momentId != null ? String(cell.momentId) : "");
        setCellGroupeId(cell?.groupeId != null ? String(cell.groupeId) : "");
        setCellLieuId(cell?.lieuId != null ? String(cell.lieuId) : "");
        setCellTexte(cell?.texteLibre ?? "");
        setCellMembresTokensSelection(
            normaliserTokenIdsAnimateursCellule(
                cell == null
                    ? undefined
                    : cell.membreTokenIds?.length
                      ? cell.membreTokenIds
                      : (cell as { animateurIds?: string[] | null }).animateurIds
            )
        );
        setCellModalOpen(true);
    };

    const toggleCellMembreToken = (tokenId: string) => {
        setCellMembresTokensSelection((prev) =>
            prev.includes(tokenId) ? prev.filter((x) => x !== tokenId) : [...prev, tokenId]
        );
    };

    const handleCellSubmit = async () => {
        if (cellLigneId == null || cellJour == null || editorGrilleId == null || !detail) return;
        const parseId = (raw: string) =>
            raw === "" || raw === "__none__" ? null : parseInt(raw, 10);
        const contenuSrc = sourceContenuCellulesEffectif(detail);

        let horaireId: number | null = null;
        let momentId: number | null = null;
        let groupeId: number | null = null;
        let lieuId: number | null = null;
        let texteLibre: string | null = null;
        let membreTokenIds: string[] | null = null;

        switch (contenuSrc) {
            case "SAISIE_LIBRE":
                texteLibre = cellTexte.trim() || null;
                break;
            case "MEMBRE_EQUIPE":
                membreTokenIds = cellMembresTokensSelection.length ? [...cellMembresTokensSelection] : null;
                break;
            case "HORAIRE": {
                const raw = parseId(cellHoraireId);
                horaireId = raw != null && !Number.isNaN(raw) ? raw : null;
                break;
            }
            case "MOMENT": {
                const raw = parseId(cellMomentId);
                momentId = raw != null && !Number.isNaN(raw) ? raw : null;
                break;
            }
            case "GROUPE": {
                const raw = parseId(cellGroupeId);
                groupeId = raw != null && !Number.isNaN(raw) ? raw : null;
                break;
            }
            case "LIEU": {
                const raw = parseId(cellLieuId);
                lieuId = raw != null && !Number.isNaN(raw) ? raw : null;
                break;
            }
            default:
                break;
        }

        const payload: PlanningCellulePayload = {
            jour: cellJour,
            membreTokenIds,
            horaireId,
            texteLibre,
            momentId,
            groupeId,
            lieuId,
        };
        const errContenu = erreurValidationCellulePourContenu(payload, contenuSrc);
        if (errContenu) {
            setCellError(errContenu);
            return;
        }
        setCellError(null);
        setCellSubmitting(true);
        try {
            await sejourPlanningGrilleService.remplacerCellules(sejourId, editorGrilleId, cellLigneId, {
                cellules: [payload],
            });
            setCellModalOpen(false);
            await reloadDetail();
            refreshAfterMutation();
        } catch (e: unknown) {
            setCellError(e instanceof Error ? e.message : "Enregistrement impossible");
        } finally {
            setCellSubmitting(false);
        }
    };

    const lignesTri = useMemo(
        () => (detail ? lignesTrieesParOrdre(detail.lignes) : []),
        [detail]
    );
    const blocsPlein = useMemo(
        () => (lignesTri.length ? decomposerEnBlocsOrdre(lignesTri) : []),
        [lignesTri]
    );
    const depths = detail ? computeLineDepths(detail.lignes) : new Map<number, number>();
    const sourceLibelleApiDetail = detail ? sourceLibellePourApi(detail) : "SAISIE_LIBRE";

    const ligneSourceEffectif =
        lineModalOpen && detail ? sourceLibelleEffectifGrille(detail) : null;
    const ligneSansColonneLibelle =
        lineModalOpen && detail ? grilleLibelleLignesDesactive(detail) : false;
    const entiteChoicesLigne = optionsPourSource(
        ligneSourceEffectif,
        groupes,
        lieux,
        horaires,
        moments
    );

    const regroupementCellInfos = detail ? infosRegroupementParLigne(lignesTri) : [];
    const sectionsListe = detail ? sectionsDepuisLignes(detail.lignes) : [];
    const contenuCellulesPourModal =
        cellModalOpen && detail ? sourceContenuCellulesEffectif(detail) : null;
    const afficherColonneRegroupement =
        detail != null ? grilleAfficheColonneRegroupement(detail.lignes) : false;
    const afficherColonneLibelleLigne = detail != null ? grilleAfficheColonneLibelleLigne(detail) : false;

    const renderLineDragHandle = (ligne: PlanningLigneDto, className: string) => (
        <div
            className={className}
            aria-label="Glisser pour réorganiser les lignes"
            title="Réorganiser"
            draggable={!lineReorderBusy && !reordonnancementSectionBusy}
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", `line:${ligne.id}`);
                e.dataTransfer.effectAllowed = "move";
                setDraggingPlanningLigneId(ligne.id);
            }}
            onDragEnd={() => {
                setDraggingPlanningLigneId(null);
                setDropTargetPlanningLigneId(null);
            }}
        >
            <FaGripVertical aria-hidden size={12} />
        </div>
    );

    return (
        <div>
            <div className={styles.actionsContainer}>
                <Button color="success" onClick={openCreateMeta}>
                    Créer un planning
                </Button>
            </div>
            {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

            {grilles.length === 0 ? (
                <p className={styles.empty}>Aucun planning n&apos;est encore défini.</p>
            ) : (
                <div className={styles.list}>
                    {grillesTriAlphabetique.map((g) => (
                        <article key={g.id} className={styles.card}>
                            <div className={styles.cardTitle}>{g.titre}</div>
                            <div className={styles.cardMeta}>
                                Dernière mise à jour : {formaterDate(new Date(g.miseAJour))}
                            </div>
                            <div className={styles.cardActions}>
                                <Button color="primary" size="sm" onClick={() => openConsultEditTable(g.id)}>
                                    Consulter / tableau
                                </Button>
                                <Button color="secondary" size="sm" onClick={() => loadMetaForEdit(g.id)}>
                                    Modifier infos
                                </Button>
                                <Button color="danger" size="sm" outline onClick={() => requestDeleteGrille(g.id)}>
                                    Supprimer
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal isOpen={metaModalOpen} toggle={() => !metaSubmitting && setMetaModalOpen(false)} size="lg">
                <ModalHeader toggle={() => !metaSubmitting && setMetaModalOpen(false)}>
                    {metaEditingId == null ? "Nouveau planning" : "Modifier le planning"}
                </ModalHeader>
                <ModalBody>
                    <FormGroup className={styles.modalField}>
                        <Label for="planning-titre">Titre</Label>
                        <Input
                            id="planning-titre"
                            value={metaForm.titre}
                            onChange={(e) => setMetaForm((f) => ({ ...f, titre: e.target.value }))}
                            disabled={metaSubmitting}
                            maxLength={200}
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="planning-consigne">Consigne globale</Label>
                        <Input
                            id="planning-consigne"
                            type="textarea"
                            rows={4}
                            value={metaForm.consigneGlobale ?? ""}
                            onChange={(e) =>
                                setMetaForm((f) => ({
                                    ...f,
                                    consigneGlobale: e.target.value || null,
                                }))
                            }
                            disabled={metaSubmitting}
                        />
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="planning-source-libelle">Type de libellé des lignes</Label>
                        <Input
                            id="planning-source-libelle"
                            type="select"
                            value={metaForm.sourceLibelleLignes ?? ""}
                            onChange={(e) => {
                                const v = e.target.value;
                                setMetaForm((f) => ({
                                    ...f,
                                    sourceLibelleLignes:
                                        v === "" ? null : (v as PlanningLigneLibelleSource),
                                }));
                            }}
                            disabled={
                                metaSubmitting ||
                                (metaEditingId != null && metaPlanningLigneCount > 0)
                            }
                        >
                            <option value="">— Pas de libellé de ligne —</option>
                            {planningLibelleLignesSourceOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Input>
                    </FormGroup>
                    <FormGroup className={styles.modalField}>
                        <Label for="planning-source-contenu-cellules">Type du contenu des cellules</Label>
                        <Input
                            id="planning-source-contenu-cellules"
                            type="select"
                            value={metaForm.sourceContenuCellules ?? ""}
                            onChange={(e) => {
                                const v = e.target.value;
                                setMetaForm((f) => ({
                                    ...f,
                                    sourceContenuCellules:
                                        v === "" ? null : (v as PlanningLigneLibelleSource),
                                }));
                            }}
                            disabled={
                                metaSubmitting ||
                                (metaEditingId != null && metaPlanningLigneCount > 0)
                            }
                        >
                            <option value="">— Saisie libre —</option>
                            {planningLigneLibelleSourceOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Input>
                    </FormGroup>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <div className={styles.modalFooterMessage}>
                        {metaError ? <span className={styles.modalFooterError}>{metaError}</span> : null}
                    </div>
                    <div className={styles.modalFooterActions}>
                        <Button color="secondary" onClick={() => setMetaModalOpen(false)} disabled={metaSubmitting}>
                            Annuler
                        </Button>
                        <Button color="primary" onClick={handleMetaSubmit} disabled={metaSubmitting}>
                            {metaSubmitting ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal
                isOpen={deleteGrilleModalOpen}
                toggle={() => !deletingGrille && setDeleteGrilleModalOpen(false)}
            >
                <ModalHeader toggle={() => !deletingGrille && setDeleteGrilleModalOpen(false)}>
                    Supprimer le planning
                </ModalHeader>
                <ModalBody>
                    Cette action supprime définitivement la grille, toutes ses lignes et cellules. Continuer ?
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setDeleteGrilleModalOpen(false)} disabled={deletingGrille}>
                        Annuler
                    </Button>
                    <Button color="danger" onClick={confirmDeleteGrille} disabled={deletingGrille}>
                        {deletingGrille ? "Suppression…" : "Supprimer"}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={editorOpen} toggle={() => setEditorOpen(false)} size="xl" scrollable>
                <ModalHeader toggle={() => setEditorOpen(false)}>
                    {detail?.titre ?? "Planning"}
                </ModalHeader>
                <ModalBody>
                    {editorLoading && <p>Chargement…</p>}
                    {editorError && <div className={styles.errorMessage}>{editorError}</div>}
                    {!editorLoading && detail && (
                        <>
                            {detail.consigneGlobale ? (
                                <div className={styles.editorConsigne}>
                                    <strong>Consigne :</strong> {detail.consigneGlobale}
                                </div>
                            ) : null}
                            <div className={styles.tableWrap}>
                                <div className={styles.tableToolbar}>
                                    <div className={styles.tableToolbarRow}>
                                        <Button
                                            color="success"
                                            size="sm"
                                            onClick={openCreateLine}
                                            disabled={ligneRapideBusy}
                                        >
                                            {ligneRapideBusy ? "Ajout…" : "Ajouter une ligne"}
                                        </Button>
                                        <Button color="secondary" size="sm" onClick={openSectionModal}>
                                            Libellés de section
                                        </Button>
                                    </div>  
                                </div>
                                <table className={styles.gridTable}>
                                    <thead>
                                        <tr>
                                            {afficherColonneRegroupement ? (
                                                <th
                                                    className={styles.regroupementColHead}
                                                    aria-label="Regroupement"
                                                >
                                                    {"\u00a0"}
                                                </th>
                                            ) : null}
                                            {afficherColonneLibelleLigne ? (
                                                <th
                                                    className={styles.rowLabelHead}
                                                    aria-label="Libellé de ligne"
                                                >
                                                    {"\u00a0"}
                                                </th>
                                            ) : null}
                                            {jours.map((j) => (
                                                <th key={j} className={styles.planningGridHead}>
                                                    {libelleJourCommeCalendrierActivites(j)}
                                                </th>
                                            ))}
                                            <th className={styles.lineActionsHead} scope="col">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lignesTri.map((ligne, idx) => {
                                            const indent = depths.get(ligne.id) ?? 0;
                                            const libelleCol = libelleLignePourAffichage(
                                                ligne,
                                                sourceLibelleApiDetail,
                                                groupes,
                                                lieux,
                                                horaires,
                                                moments,
                                                membresPourCellulesModal
                                            );
                                            const rgInfo = regroupementCellInfos[idx]!;
                                            const idxBlocTeteSection = blocsPlein.findIndex(
                                                (b) =>
                                                    b.kind === "section" && b.lineIds[0] === ligne.id
                                            );
                                            const auMoinsDeuxSections =
                                                blocsPlein.filter((b) => b.kind === "section")
                                                    .length >= 2;
                                            const afficherPoigneeDeplacerSection =
                                                afficherColonneRegroupement &&
                                                auMoinsDeuxSections &&
                                                idxBlocTeteSection >= 0 &&
                                                rgInfo.showLeadingCell &&
                                                !!rgInfo.libelleRegroupement;
                                            const cibleDeDepotSection =
                                                dropTargetSectionBlocIndex === idxBlocTeteSection &&
                                                idxBlocTeteSection >= 0 &&
                                                draggingSectionBlocIndex != null &&
                                                draggingSectionBlocIndex !== idxBlocTeteSection;
                                            const draggedRow =
                                                draggingPlanningLigneId != null
                                                    ? lignesTri.find(
                                                          (l) => l.id === draggingPlanningLigneId
                                                      )
                                                    : null;
                                            const isDropTargetRow =
                                                dropTargetPlanningLigneId === ligne.id &&
                                                draggingPlanningLigneId != null &&
                                                draggingPlanningLigneId !== ligne.id &&
                                                draggedRow != null &&
                                                sontMemeBlocOrdre(draggedRow, ligne);
                                            const rowDnDClass = [
                                                draggingPlanningLigneId === ligne.id
                                                    ? styles.planningLineRowDragging
                                                    : "",
                                                isDropTargetRow ? styles.planningLineRowDropTarget : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ");
                                            return (
                                                <Fragment key={ligne.id}>
                                                    <tr
                                                        className={rowDnDClass || undefined}
                                                        onDragOver={(e) => {
                                                            if (
                                                                lineReorderBusy ||
                                                                reordonnancementSectionBusy ||
                                                                draggingPlanningLigneId == null
                                                            )
                                                                return;
                                                            const dr = lignesTri.find(
                                                                (l) => l.id === draggingPlanningLigneId
                                                            );
                                                            if (!dr || !sontMemeBlocOrdre(dr, ligne)) {
                                                                e.dataTransfer.dropEffect = "none";
                                                                setDropTargetPlanningLigneId(null);
                                                                return;
                                                            }
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = "move";
                                                            setDropTargetPlanningLigneId(ligne.id);
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            const raw = e.dataTransfer.getData("text/plain");
                                                            if (raw.startsWith("section-bloc:")) {
                                                                return;
                                                            }
                                                            const draggedId = raw.startsWith("line:")
                                                                ? parseInt(raw.slice(5), 10)
                                                                : parseInt(raw, 10);
                                                            setDraggingPlanningLigneId(null);
                                                            setDropTargetPlanningLigneId(null);
                                                            if (Number.isNaN(draggedId)) return;
                                                            void appliquerGlisserDeposerOrdreLignes(
                                                                draggedId,
                                                                ligne.id
                                                            );
                                                        }}
                                                    >
                                                        {afficherColonneRegroupement && rgInfo.showLeadingCell ? (
                                                            <td
                                                                rowSpan={rgInfo.rowspan}
                                                                className={[
                                                                    styles.regroupementCellVertical,
                                                                    cibleDeDepotSection
                                                                        ? styles.regroupementCellVerticalSectionDrop
                                                                        : "",
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(" ")}
                                                                onDragOver={(e) => {
                                                                    if (reordonnancementSectionBusy) {
                                                                        return;
                                                                    }
                                                                    if (draggingSectionBlocIndex == null) {
                                                                        return;
                                                                    }
                                                                    if (idxBlocTeteSection < 0) {
                                                                        e.dataTransfer.dropEffect = "none";
                                                                        return;
                                                                    }
                                                                    const cible = blocsPlein[idxBlocTeteSection];
                                                                    if (!cible || cible.kind !== "section") {
                                                                        return;
                                                                    }
                                                                    if (idxBlocTeteSection === draggingSectionBlocIndex) {
                                                                        e.dataTransfer.dropEffect = "none";
                                                                        return;
                                                                    }
                                                                    e.preventDefault();
                                                                    e.dataTransfer.dropEffect = "move";
                                                                    setDropTargetSectionBlocIndex(idxBlocTeteSection);
                                                                }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (reordonnancementSectionBusy) return;
                                                                    const raw = e.dataTransfer.getData("text/plain");
                                                                    const m = /^section-bloc:(\d+)$/.exec(raw);
                                                                    const from = m
                                                                        ? parseInt(m[1]!, 10)
                                                                        : null;
                                                                    setDraggingSectionBlocIndex(null);
                                                                    setDropTargetSectionBlocIndex(null);
                                                                    if (from == null || Number.isNaN(from)) return;
                                                                    if (idxBlocTeteSection < 0) return;
                                                                    if (
                                                                        blocsPlein[idxBlocTeteSection]?.kind !==
                                                                        "section"
                                                                    )
                                                                        return;
                                                                    if (from === idxBlocTeteSection) return;
                                                                    void appliquerDeplacementSectionEntreBlocs(
                                                                        from,
                                                                        idxBlocTeteSection
                                                                    );
                                                                }}
                                                            >
                                                                <div
                                                                    className={[
                                                                        styles.regroupementCellInner,
                                                                        afficherPoigneeDeplacerSection
                                                                            ? styles.regroupementCellInnerRow
                                                                            : "",
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(" ")}
                                                                >
                                                                    {afficherPoigneeDeplacerSection ? (
                                                                        <div
                                                                            className={
                                                                                styles.regroupementSectionHandle
                                                                            }
                                                                            draggable={
                                                                                !reordonnancementSectionBusy
                                                                            }
                                                                            onDragStart={(e) => {
                                                                                e.dataTransfer.setData(
                                                                                    "text/plain",
                                                                                    `section-bloc:${idxBlocTeteSection}`
                                                                                );
                                                                                e.dataTransfer.effectAllowed =
                                                                                    "move";
                                                                                setDraggingSectionBlocIndex(
                                                                                    idxBlocTeteSection
                                                                                );
                                                                            }}
                                                                            onDragEnd={() => {
                                                                                setDraggingSectionBlocIndex(null);
                                                                                setDropTargetSectionBlocIndex(
                                                                                    null
                                                                                );
                                                                            }}
                                                                            aria-label="Déplacer toute la section"
                                                                            title="Déplacer la section (toutes les lignes groupées, sans modifier l’ordre interne)"
                                                                        >
                                                                            <FaGripVertical
                                                                                aria-hidden
                                                                                size={12}
                                                                            />
                                                                        </div>
                                                                    ) : null}
                                                                    {rgInfo.libelleRegroupement ? (
                                                                        <span
                                                                            className={styles.regroupementCellLabel}
                                                                        >
                                                                            {rgInfo.libelleRegroupement}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                        ) : null}
                                                        {afficherColonneLibelleLigne ? (
                                                            <td className={styles.rowLabel}>
                                                                <div className={styles.rowLabelRow}>
                                                                    {renderLineDragHandle(
                                                                        ligne,
                                                                        styles.lineDragHandle
                                                                    )}
                                                                    <span
                                                                        className={styles.rowLabelInner}
                                                                        style={{
                                                                            paddingLeft: `${indent * 12}px`,
                                                                        }}
                                                                    >
                                                                        {libelleCol.trim() !== "" ? (
                                                                            libelleCol
                                                                        ) : (
                                                                            <span className={styles.cellMuted}>
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        ) : null}
                                                        {jours.map((j) => {
                                                            const c = cellulePourJour(ligne, j);
                                                            const texteCellule = resumeCellule(
                                                                c,
                                                                groupes,
                                                                lieux,
                                                                horaires,
                                                                moments,
                                                                membresPourCellulesModal
                                                            );
                                                            return (
                                                                <td key={j} className={styles.planningGridCell}>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.cellButton}
                                                                        onClick={() => openCellModal(ligne.id, j)}
                                                                    >
                                                                        <span
                                                                            className={
                                                                                texteCellule === "—"
                                                                                    ? styles.cellMuted
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            {texteCellule}
                                                                        </span>
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={styles.lineActionsCell}>
                                                            <div className={styles.lineActionsButtons}>
                                                                {!afficherColonneLibelleLigne
                                                                    ? renderLineDragHandle(
                                                                          ligne,
                                                                          styles.lineDragHandleInActions
                                                                      )
                                                                    : null}
                                                                {!grilleLibelleLignesDesactive(detail) ? (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.lineActionIconHit}
                                                                        onClick={() => openEditLine(ligne)}
                                                                        aria-label="Modifier la ligne"
                                                                        title="Modifier"
                                                                    >
                                                                        <FaEdit
                                                                            aria-hidden
                                                                            className={styles.lineActionIcon}
                                                                            size={16}
                                                                        />
                                                                    </button>
                                                                ) : null}
                                                                <button
                                                                    type="button"
                                                                    className={`${styles.lineActionIconHit} ${styles.lineActionIconHitDanger}`}
                                                                    onClick={() => {
                                                                        void handleDeleteLine(ligne.id);
                                                                    }}
                                                                    disabled={deletingLine}
                                                                    aria-label="Supprimer la ligne"
                                                                    title="Supprimer"
                                                                >
                                                                    <FaTrashAlt
                                                                        aria-hidden
                                                                        className={styles.lineActionIcon}
                                                                        size={16}
                                                                    />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setEditorOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal
                isOpen={sectionModalOpen}
                toggle={() => {
                    if (sectionBusy) return;
                    cancelEditSection();
                    setDeletingSection(null);
                    setSectionModalOpen(false);
                }}
                size="lg"
                scrollable
            >
                <ModalHeader
                    toggle={() => {
                        if (sectionBusy) return;
                        cancelEditSection();
                        setDeletingSection(null);
                        setSectionModalOpen(false);
                    }}
                >
                    Libellé de section
                </ModalHeader>
                <ModalBody>
                    {sectionModalError ? (
                        <div className={styles.errorMessage}>{sectionModalError}</div>
                    ) : null}
                    {deletingSection ? (
                        <div className={styles.sectionDeleteBanner}>
                            <p className={styles.sectionDeleteBannerText}>
                                Supprimer la section « {deletingSection} » ? Les lignes restent dans le tableau, sans
                                libellé de regroupement.
                            </p>
                            <div className={styles.sectionDeleteBannerActions}>
                                <Button
                                    color="danger"
                                    size="sm"
                                    disabled={sectionBusy}
                                    onClick={handleSupprimerSectionConfirm}
                                >
                                    {sectionBusy ? "Suppression…" : "Confirmer la suppression"}
                                </Button>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    disabled={sectionBusy}
                                    onClick={() => setDeletingSection(null)}
                                >
                                    Annuler
                                </Button>
                            </div>
                        </div>
                    ) : null}
                    {detail ? (
                        <>
                            {sectionEditTarget ? (
                                <div className={styles.sectionEditPanel}>
                                    <div className={styles.sectionModalBlockTitle}>Modifier la section</div>
                                    <p className={styles.fieldHint}>
                                        Changez le libellé et/ou les lignes rattachées. Seules les lignes sans section ou
                                        déjà dans cette section sont sélectionnables.
                                    </p>
                                    <FormGroup className={styles.modalField}>
                                        <Label for="edit-section-libelle">Libellé de la section</Label>
                                        <Input
                                            id="edit-section-libelle"
                                            type="text"
                                            value={editSectionLibelleInput}
                                            onChange={(e) => setEditSectionLibelleInput(e.target.value)}
                                            disabled={sectionBusy}
                                            maxLength={200}
                                        />
                                    </FormGroup>
                                    <div className={styles.sectionModalBlockTitle}>Lignes de la section</div>
                                    <div className={styles.sectionLinesPick}>
                                        {detail.lignes.map((ligne) => {
                                            const ind = depths.get(ligne.id) ?? 0;
                                            const libellePick = libelleLignePourAffichage(
                                                ligne,
                                                sourceLibelleApiDetail,
                                                groupes,
                                                lieux,
                                                horaires,
                                                moments,
                                                membresPourCellulesModal
                                            );
                                            const libellePickOuId =
                                                libellePick.trim() !== "" ? libellePick : `Ligne ${ligne.id}`;
                                            const rg = ligne.libelleRegroupement;
                                            const inThis = rg === sectionEditTarget;
                                            const free = rg == null || rg === "";
                                            const inOther =
                                                rg != null && rg !== "" && rg !== sectionEditTarget;
                                            const canToggle = inThis || free;
                                            return (
                                                <div
                                                    key={ligne.id}
                                                    className={
                                                        inOther
                                                            ? `${styles.sectionLinePickRow} ${styles.sectionLinePickRowLocked}`
                                                            : styles.sectionLinePickRow
                                                    }
                                                >
                                                    <Input
                                                        type="checkbox"
                                                        className={styles.sectionLineCheckbox}
                                                        checked={editSectionLineIds.has(ligne.id)}
                                                        onChange={() => {
                                                            setEditSectionLineIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(ligne.id)) next.delete(ligne.id);
                                                                else next.add(ligne.id);
                                                                return next;
                                                            });
                                                        }}
                                                        disabled={sectionBusy || !canToggle}
                                                        aria-label={`Inclure dans la section : ${libellePickOuId}`}
                                                    />
                                                    <span
                                                        className={styles.sectionLinePickLabel}
                                                        style={{ paddingLeft: `${ind * 12}px` }}
                                                    >
                                                        {libellePick.trim() !== "" ? (
                                                            libellePick
                                                        ) : (
                                                            <span className={styles.cellMuted}>—</span>
                                                        )}
                                                    </span>
                                                    {inOther ? (
                                                        <span className={styles.sectionLineLockedHint}>
                                                            Section « {rg} »
                                                        </span>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className={styles.sectionEditActions}>
                                        <Button
                                            color="primary"
                                            size="sm"
                                            disabled={sectionBusy}
                                            onClick={handleEnregistrerModificationSection}
                                        >
                                            {sectionBusy ? "Enregistrement…" : "Enregistrer"}
                                        </Button>
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            outline
                                            disabled={sectionBusy}
                                            onClick={cancelEditSection}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            <div
                                className={
                                    sectionEditTarget ? `${styles.sectionModalBlock} ${styles.sectionModalBlockMuted}` : styles.sectionModalBlock
                                }
                            >
                                <div className={styles.sectionModalBlockTitle}>Créer une section</div>
                                <FormGroup className={styles.modalField}>
                                    <Label for="new-section-libelle">Libellé de la section</Label>
                                    <Input
                                        id="new-section-libelle"
                                        type="text"
                                        value={newSectionLibelle}
                                        onChange={(e) => setNewSectionLibelle(e.target.value)}
                                        disabled={
                                            sectionBusy ||
                                            deletingSection != null ||
                                            sectionEditTarget != null
                                        }
                                        placeholder="ex. Petit-déjeuner"
                                        maxLength={200}
                                    />
                                </FormGroup>
                                <div className={styles.sectionModalBlockTitle}>Lignes à rattacher</div>
                                <p className={styles.fieldHint}>
                                    Seules les lignes qui ne sont dans aucune section peuvent être cochées. Retirez une
                                    ligne de sa section actuelle pour pouvoir la rattacher ici.
                                </p>
                                <div className={styles.sectionLinesPick}>
                                    {detail.lignes.map((ligne) => {
                                        const ind = depths.get(ligne.id) ?? 0;
                                        const libellePick = libelleLignePourAffichage(
                                            ligne,
                                            sourceLibelleApiDetail,
                                            groupes,
                                            lieux,
                                            horaires,
                                            moments,
                                            membresPourCellulesModal
                                        );
                                        const libellePickOuId =
                                            libellePick.trim() !== "" ? libellePick : `Ligne ${ligne.id}`;
                                        const occupee =
                                            ligne.libelleRegroupement != null &&
                                            ligne.libelleRegroupement !== "";
                                        const disabledCreate =
                                            sectionBusy ||
                                            deletingSection != null ||
                                            sectionEditTarget != null ||
                                            occupee;
                                        return (
                                            <div
                                                key={ligne.id}
                                                className={
                                                    occupee
                                                        ? `${styles.sectionLinePickRow} ${styles.sectionLinePickRowLocked}`
                                                        : styles.sectionLinePickRow
                                                }
                                            >
                                                <Input
                                                    type="checkbox"
                                                    className={styles.sectionLineCheckbox}
                                                    checked={newSectionLineIds.has(ligne.id)}
                                                    onChange={() => {
                                                        setNewSectionLineIds((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(ligne.id)) next.delete(ligne.id);
                                                            else next.add(ligne.id);
                                                            return next;
                                                        });
                                                    }}
                                                    disabled={disabledCreate}
                                                    aria-label={`Rattacher à la nouvelle section : ${libellePickOuId}`}
                                                />
                                                <span
                                                    className={styles.sectionLinePickLabel}
                                                    style={{ paddingLeft: `${ind * 12}px` }}
                                                >
                                                    {libellePick.trim() !== "" ? (
                                                        libellePick
                                                    ) : (
                                                        <span className={styles.cellMuted}>—</span>
                                                    )}
                                                </span>
                                                {occupee ? (
                                                    <span className={styles.sectionLineLockedHint}>
                                                        Section « {ligne.libelleRegroupement} »
                                                    </span>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                                <Button
                                    color="primary"
                                    size="sm"
                                    className={styles.sectionCreateButton}
                                    onClick={handleCreerSection}
                                    disabled={
                                        sectionBusy ||
                                        deletingSection != null ||
                                        sectionEditTarget != null
                                    }
                                >
                                    {sectionBusy ? "Enregistrement…" : "Créer la section"}
                                </Button>
                            </div>

                            <div className={styles.sectionModalBlock}>
                                <div className={styles.sectionModalBlockTitle}>Sections existantes</div>
                                {sectionsListe.length === 0 ? (
                                    <p className={styles.sectionEmpty}>Aucune section pour ce planning.</p>
                                ) : (
                                    <table className={styles.sectionTable}>
                                        <thead>
                                            <tr>
                                                <th>Libellé</th>
                                                <th className={styles.sectionTableCount}>Lignes</th>
                                                <th className={styles.sectionTableActions}> </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sectionsListe.map((s) => (
                                                <tr key={s.libelle}>
                                                    <td>{s.libelle}</td>
                                                    <td className={styles.sectionTableCount}>{s.ligneIds.length}</td>
                                                    <td className={styles.sectionTableActions}>
                                                        <div className={styles.sectionRowActions}>
                                                            <button
                                                                type="button"
                                                                className={styles.lineActionIconHit}
                                                                disabled={
                                                                    sectionBusy ||
                                                                    deletingSection != null ||
                                                                    sectionEditTarget != null
                                                                }
                                                                onClick={() => {
                                                                    setSectionModalError(null);
                                                                    openEditSection(s.libelle, s.ligneIds);
                                                                }}
                                                                aria-label="Modifier la section"
                                                                title="Modifier"
                                                            >
                                                                <FaEdit
                                                                    aria-hidden
                                                                    className={styles.lineActionIcon}
                                                                    size={16}
                                                                />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`${styles.lineActionIconHit} ${styles.lineActionIconHitDanger}`}
                                                                disabled={
                                                                    sectionBusy ||
                                                                    deletingSection != null ||
                                                                    sectionEditTarget != null
                                                                }
                                                                onClick={() => {
                                                                    cancelEditSection();
                                                                    setDeletingSection(s.libelle);
                                                                    setSectionModalError(null);
                                                                }}
                                                                aria-label="Supprimer la section"
                                                                title="Supprimer"
                                                            >
                                                                <FaTrashAlt
                                                                    aria-hidden
                                                                    className={styles.lineActionIcon}
                                                                    size={16}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    ) : null}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="secondary"
                        disabled={sectionBusy}
                        onClick={() => {
                            cancelEditSection();
                            setDeletingSection(null);
                            setSectionModalOpen(false);
                        }}
                    >
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={lineModalOpen} toggle={() => !lineSubmitting && setLineModalOpen(false)} size="lg">
                <ModalHeader toggle={() => !lineSubmitting && setLineModalOpen(false)}>
                    {lineEditingId == null ? "Nouvelle ligne" : "Modifier la ligne"}
                </ModalHeader>
                <ModalBody>
                    {ligneSourceEffectif === "SAISIE_LIBRE" && !ligneSansColonneLibelle ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="ligne-libelle-libre">Libellé de la ligne</Label>
                            <Input
                                id="ligne-libelle-libre"
                                value={lineForm.libelleLibre}
                                onChange={(e) =>
                                    setLineForm((f) => ({ ...f, libelleLibre: e.target.value }))
                                }
                                disabled={lineSubmitting}
                                placeholder="Facultatif"
                            />
                            <p className={styles.fieldHint}>
                                Laissez vide si la ligne ne doit pas afficher de libellé dans la première colonne.
                            </p>
                        </FormGroup>
                    ) : null}
                    {ligneSourceEffectif != null && ligneSourceEffectif !== "SAISIE_LIBRE" ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="ligne-entite">{labelSelectEntite(ligneSourceEffectif)}</Label>
                            <Input
                                id="ligne-entite"
                                type="select"
                                value={lineForm.entiteId}
                                onChange={(e) =>
                                    setLineForm((f) => ({ ...f, entiteId: e.target.value }))
                                }
                                disabled={lineSubmitting}
                            >
                                <option value="">— Choisir —</option>
                                {entiteChoicesLigne.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.label}
                                    </option>
                                ))}
                            </Input>
                            {entiteChoicesLigne.length === 0 ? (
                                <p className={styles.fieldHintWarn}>
                                    Aucune entité de ce type pour ce séjour. Ajoutez-en depuis la vue générale du
                                    séjour.
                                </p>
                            ) : null}
                        </FormGroup>
                    ) : null}
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <div className={styles.modalFooterMessage}>
                        {lineError ? <span className={styles.modalFooterError}>{lineError}</span> : null}
                    </div>
                    <div className={styles.modalFooterActions}>
                        <Button color="secondary" onClick={() => setLineModalOpen(false)} disabled={lineSubmitting}>
                            Annuler
                        </Button>
                        <Button color="primary" onClick={handleLineSubmit} disabled={lineSubmitting}>
                            {lineSubmitting ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={cellModalOpen} toggle={() => !cellSubmitting && setCellModalOpen(false)}>
                <ModalHeader toggle={() => !cellSubmitting && setCellModalOpen(false)}>
                    Cellule — {cellJour ? libelleJourCommeCalendrierActivites(cellJour) : ""}
                </ModalHeader>
                <ModalBody>
                    {contenuCellulesPourModal != null ? (
                        <p className={styles.fieldHint}>
                            Type de contenu des cellules :{" "}
                            <strong>{PlanningLigneLibelleSourceLabels[contenuCellulesPourModal]}</strong>
                            {contenuCellulesPourModal === "SAISIE_LIBRE" ? (
                                <span> — saisissez le texte ci‑dessous (laisser vide pour effacer la cellule).</span>
                            ) : contenuCellulesPourModal === "MEMBRE_EQUIPE" ? (
                                <span>
                                    {" "}
                                    — cochez un ou plusieurs membres. Aucune case cochée pour effacer la cellule.
                                </span>
                            ) : (
                                <span> — choisissez une entrée dans la liste (vide pour effacer la cellule).</span>
                            )}
                        </p>
                    ) : null}
                    {contenuCellulesPourModal === "SAISIE_LIBRE" ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="cell-texte">Contenu</Label>
                            <Input
                                id="cell-texte"
                                type="textarea"
                                rows={4}
                                value={cellTexte}
                                onChange={(e) => setCellTexte(e.target.value)}
                                disabled={cellSubmitting}
                                placeholder="Texte affiché dans la cellule…"
                            />
                        </FormGroup>
                    ) : null}
                    {contenuCellulesPourModal === "MEMBRE_EQUIPE" ? (
                        <FormGroup className={styles.modalField}>
                            <Label>Membres de l’équipe</Label>
                            {membresPourCellulesModal.length === 0 ? (
                                <p className={styles.fieldHintWarn}>
                                    Aucun membre dans l’équipe de ce séjour (ou <code>tokenId</code> manquant sur les
                                    profils). Ajoutez des membres dans le bloc « Équipe » de la fiche séjour.
                                </p>
                            ) : (
                                <div className={styles.membresCheckboxes}>
                                    {membresPourCellulesModal.map((m) => (
                                        <FormGroup check key={m.tokenId} className={styles.membreCheckboxRow}>
                                            <Label check>
                                                <Input
                                                    type="checkbox"
                                                    checked={cellMembresTokensSelection.includes(m.tokenId)}
                                                    onChange={() => toggleCellMembreToken(m.tokenId)}
                                                    disabled={cellSubmitting}
                                                />{" "}
                                                <span className={styles.membreCheckboxLabel}>
                                                    {m.prenom} {m.nom}
                                                </span>
                                            </Label>
                                        </FormGroup>
                                    ))}
                                </div>
                            )}
                        </FormGroup>
                    ) : null}
                    {contenuCellulesPourModal === "HORAIRE" ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="cell-horaire">Horaire</Label>
                            <Input
                                id="cell-horaire"
                                type="select"
                                value={cellHoraireId === "" ? "__none__" : cellHoraireId}
                                onChange={(e) =>
                                    setCellHoraireId(e.target.value === "__none__" ? "" : e.target.value)
                                }
                                disabled={cellSubmitting}
                            >
                                <option value="__none__">— Aucun —</option>
                                {horaires.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.libelle}
                                    </option>
                                ))}
                            </Input>
                            {horaires.length === 0 ? (
                                <p className={styles.fieldHintWarn}>
                                    Aucun horaire pour ce séjour. Ajoutez-en dans la vue générale.
                                </p>
                            ) : null}
                        </FormGroup>
                    ) : null}
                    {contenuCellulesPourModal === "MOMENT" ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="cell-moment">Moment</Label>
                            <Input
                                id="cell-moment"
                                type="select"
                                value={cellMomentId === "" ? "__none__" : cellMomentId}
                                onChange={(e) =>
                                    setCellMomentId(e.target.value === "__none__" ? "" : e.target.value)
                                }
                                disabled={cellSubmitting}
                            >
                                <option value="__none__">— Aucun —</option>
                                {moments.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.nom}
                                    </option>
                                ))}
                            </Input>
                            {moments.length === 0 ? (
                                <p className={styles.fieldHintWarn}>
                                    Aucun moment pour ce séjour. Ajoutez-en dans la vue générale.
                                </p>
                            ) : null}
                        </FormGroup>
                    ) : null}
                    {contenuCellulesPourModal === "GROUPE" ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="cell-groupe">Groupe</Label>
                            <Input
                                id="cell-groupe"
                                type="select"
                                value={cellGroupeId === "" ? "__none__" : cellGroupeId}
                                onChange={(e) =>
                                    setCellGroupeId(e.target.value === "__none__" ? "" : e.target.value)
                                }
                                disabled={cellSubmitting}
                            >
                                <option value="__none__">— Aucun —</option>
                                {groupes.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.nom}
                                    </option>
                                ))}
                            </Input>
                            {groupes.length === 0 ? (
                                <p className={styles.fieldHintWarn}>
                                    Aucun groupe pour ce séjour. Ajoutez-en dans la vue générale.
                                </p>
                            ) : null}
                        </FormGroup>
                    ) : null}
                    {contenuCellulesPourModal === "LIEU" ? (
                        <FormGroup className={styles.modalField}>
                            <Label for="cell-lieu">Lieu</Label>
                            <Input
                                id="cell-lieu"
                                type="select"
                                value={cellLieuId === "" ? "__none__" : cellLieuId}
                                onChange={(e) =>
                                    setCellLieuId(e.target.value === "__none__" ? "" : e.target.value)
                                }
                                disabled={cellSubmitting}
                            >
                                <option value="__none__">— Aucun —</option>
                                {lieux.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.nom}
                                    </option>
                                ))}
                            </Input>
                            {lieux.length === 0 ? (
                                <p className={styles.fieldHintWarn}>
                                    Aucun lieu pour ce séjour. Ajoutez-en dans la vue générale.
                                </p>
                            ) : null}
                        </FormGroup>
                    ) : null}
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <div className={styles.modalFooterMessage}>
                        {cellError ? <span className={styles.modalFooterError}>{cellError}</span> : null}
                    </div>
                    <div className={styles.modalFooterActions}>
                        <Button color="secondary" onClick={() => setCellModalOpen(false)} disabled={cellSubmitting}>
                            Annuler
                        </Button>
                        <Button color="primary" onClick={handleCellSubmit} disabled={cellSubmitting}>
                            {cellSubmitting ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>

            <Modal isOpen={successModalOpen} toggle={() => setSuccessModalOpen(false)}>
                <ModalHeader toggle={() => setSuccessModalOpen(false)}>Succès</ModalHeader>
                <ModalBody>{successMessage}</ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => setSuccessModalOpen(false)}>
                        OK
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default ListePlanningsOrganisation;
