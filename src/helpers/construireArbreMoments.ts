import type { MomentDto } from "../types/api";

export interface MomentArbreNode extends MomentDto {
    enfants: MomentArbreNode[];
}

export type MomentAplat = MomentDto & { profondeur: number };

function trierMomentsParOrdre(a: MomentDto, b: MomentDto): number {
    const oa = a.ordre ?? a.id;
    const ob = b.ordre ?? b.id;
    if (oa !== ob) return oa - ob;
    return a.id - b.id;
}

/** Reconstitue l'arbre à partir de la liste plate renvoyée par l'API. */
export function construireArbreMoments(moments: MomentDto[]): MomentArbreNode[] {
    const parId = new Map<number, MomentArbreNode>(
        moments.map((m) => [m.id, { ...m, enfants: [] }]),
    );
    const racines: MomentArbreNode[] = [];
    for (const m of parId.values()) {
        if (m.parentId == null) {
            racines.push(m);
        } else {
            parId.get(m.parentId)?.enfants.push(m);
        }
    }
    const triParOrdre = (list: MomentArbreNode[]) => {
        list.sort(trierMomentsParOrdre);
        list.forEach((n) => triParOrdre(n.enfants));
    };
    triParOrdre(racines);
    return racines;
}

/** Parcours profondeur d'abord : ordre d'affichage hiérarchique. */
export function aplatirMomentsHierarchiquement(moments: MomentDto[]): MomentAplat[] {
    const racines = construireArbreMoments(moments);
    const result: MomentAplat[] = [];
    const walk = (nodes: MomentArbreNode[], profondeur: number) => {
        for (const { enfants, ...m } of nodes) {
            result.push({ ...m, profondeur });
            walk(enfants, profondeur + 1);
        }
    };
    walk(racines, 0);
    return result;
}

export function libelleMomentIndenté(moment: Pick<MomentAplat, "nom" | "profondeur">): string {
    if (moment.profondeur <= 0) return moment.nom;
    return `${"\u00a0\u00a0".repeat(moment.profondeur)}${moment.nom}`;
}

/** Ids du sous-arbre (nœud + descendants), en parcours profondeur d'abord. */
export function idsSousArbreMoment(moments: MomentDto[], racineId: number): number[] {
    const ids = [racineId];
    const enfants = moments.filter((m) => m.parentId === racineId).sort(trierMomentsParOrdre);
    for (const e of enfants) {
        ids.push(...idsSousArbreMoment(moments, e.id));
    }
    return ids;
}

/** Ancêtres directs et indirects d'un moment (ids des parents remontés). */
export function ancetresMomentIds(moments: MomentDto[], momentId: number): number[] {
    const ids: number[] = [];
    let courant = moments.find((m) => m.id === momentId);
    while (courant?.parentId != null) {
        ids.push(courant.parentId);
        courant = moments.find((m) => m.id === courant!.parentId);
    }
    return ids;
}

/**
 * Ensemble des moments en conflit hiérarchique avec un moment donné :
 * le moment lui-même + tous ses ancêtres + tous ses descendants.
 * Utilisé pour la règle : un animateur ne peut pas être affecté à deux activités
 * le même jour si leurs moments se chevauchent dans la hiérarchie.
 */
export function idsEnConflit(momentId: number, moments: MomentDto[]): Set<number> {
    const ids = new Set<number>();
    for (const id of idsSousArbreMoment(moments, momentId)) ids.add(id);
    for (const id of ancetresMomentIds(moments, momentId)) ids.add(id);
    return ids;
}

/** Moments éligibles comme parent d'un moment (exclut le moment et ses descendants). */
export function parentsEligiblesPourMoment(
    moments: MomentDto[],
    momentId: number | null,
): MomentDto[] {
    const exclus = new Set<number>();
    if (momentId != null) {
        exclus.add(momentId);
        for (const id of idsSousArbreMoment(moments, momentId)) {
            exclus.add(id);
        }
    }
    return aplatirMomentsHierarchiquement(moments.filter((m) => !exclus.has(m.id)));
}

/** Moments éligibles comme enfant rattaché à un moment (exclut le moment, ses descendants, et les ancêtres du parent choisi). */
export function enfantsEligiblesPourMoment(
    moments: MomentDto[],
    momentId: number | null,
    parentId: number | null,
): MomentDto[] {
    const exclus = new Set<number>();
    if (momentId != null) {
        exclus.add(momentId);
        for (const id of idsSousArbreMoment(moments, momentId)) {
            exclus.add(id);
        }
    }
    if (parentId != null) {
        exclus.add(parentId);
        for (const id of ancetresMomentIds(moments, parentId)) {
            exclus.add(id);
        }
    }
    return aplatirMomentsHierarchiquement(moments.filter((m) => !exclus.has(m.id)));
}

/** Liste des moments proposés comme enfants (éligibles + enfants déjà rattachés en édition). */
export function optionsEnfantsPourFormulaire(
    moments: MomentDto[],
    momentId: number | null,
    parentId: number | null,
): MomentDto[] {
    const parId = new Map(
        enfantsEligiblesPourMoment(moments, momentId, parentId).map((m) => [m.id, m] as const),
    );
    if (momentId != null) {
        for (const enfant of moments.filter((m) => m.parentId === momentId)) {
            parId.set(enfant.id, enfant);
        }
    }
    if (parentId != null) {
        parId.delete(parentId);
    }
    return aplatirMomentsHierarchiquement([...parId.values()]);
}

/** Enfants directs d'un moment, triés par ordre. */
export function enfantsDirectsMoment(moments: MomentDto[], momentId: number): MomentDto[] {
    return moments
        .filter((m) => m.parentId === momentId)
        .sort(trierMomentsParOrdre);
}

/** Nombre de descendants stricts (hors le moment lui-même). */
export function nombreDescendantsMoment(moments: MomentDto[], momentId: number): number {
    return idsSousArbreMoment(moments, momentId).length - 1;
}

/**
 * Options affichées dans la modale : masque les petits-enfants lorsque leur parent est déjà listé.
 */
export function optionsEnfantsAffichables(
    moments: MomentDto[],
    momentId: number | null,
    parentId: number | null,
): MomentDto[] {
    const tous = optionsEnfantsPourFormulaire(moments, momentId, parentId);
    const ids = new Set(tous.map((m) => m.id));
    return tous.filter((m) => m.parentId == null || !ids.has(m.parentId));
}

/** Racines d'une sélection (ignore les descendants déjà couverts par un parent coché). */
export function idsRacinesSelectionEnfants(
    enfantIds: Iterable<number>,
    moments: MomentDto[],
): number[] {
    const set = new Set(enfantIds);
    return [...set].filter((id) => {
        const m = moments.find((x) => x.id === id);
        if (!m) return false;
        return m.parentId == null || !set.has(m.parentId);
    });
}

/** Valide la cohérence parent / enfants avant enregistrement. */
export function validerLiensParentEnfants(
    moments: MomentDto[],
    options: {
        momentId: number | null;
        parentId: number | null;
        enfantIds: number[];
    },
): string | null {
    const { momentId, parentId } = options;
    const enfantIds = idsRacinesSelectionEnfants(options.enfantIds, moments);
    if (parentId != null && enfantIds.includes(parentId)) {
        return "Le parent ne peut pas aussi être sélectionné comme enfant.";
    }
    if (parentId != null && momentId != null && idsSousArbreMoment(moments, momentId).includes(parentId)) {
        return "Le parent ne peut pas être un descendant de ce moment.";
    }
    for (const enfantId of enfantIds) {
        if (momentId != null && enfantId === momentId) {
            return "Un moment ne peut pas être son propre enfant.";
        }
        // Cycle : l'enfant choisi est un ancêtre du moment → l'attacher créerait une boucle.
        if (momentId != null && ancetresMomentIds(moments, momentId).includes(enfantId)) {
            return "Un moment ne peut pas avoir l'un de ses ancêtres comme enfant.";
        }
        if (parentId != null) {
            const ancetresDuParent = ancetresMomentIds(moments, parentId);
            if (ancetresDuParent.includes(enfantId)) {
                return "Un enfant ne peut pas être un ancêtre du parent.";
            }
        }
    }
    return null;
}

/**
 * Déplace un moment parmi ses frères (monter / descendre) et renvoie la liste complète
 * des ids dans le nouvel ordre global, prête pour PUT /reorder.
 */
export function idsApresDeplacementMomentFrere(
    moments: MomentDto[],
    momentId: number,
    direction: "up" | "down",
): number[] | null {
    const flat = aplatirMomentsHierarchiquement(moments).map((m) => m.id);
    const moment = moments.find((m) => m.id === momentId);
    if (!moment) return null;

    const freres = moments.filter((m) => m.parentId === moment.parentId).sort(trierMomentsParOrdre);
    const idx = freres.findIndex((s) => s.id === momentId);
    const cibleIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || cibleIdx < 0 || cibleIdx >= freres.length) return null;

    const bloc = idsSousArbreMoment(moments, momentId);
    const blocCible = idsSousArbreMoment(moments, freres[cibleIdx].id);
    const setBloc = new Set(bloc);
    const sansBloc = flat.filter((id) => !setBloc.has(id));

    const insertAt =
        direction === "up"
            ? sansBloc.indexOf(blocCible[0])
            : sansBloc.indexOf(blocCible[blocCible.length - 1]) + 1;
    if (insertAt < 0) return null;

    return [...sansBloc.slice(0, insertAt), ...bloc, ...sansBloc.slice(insertAt)];
}
