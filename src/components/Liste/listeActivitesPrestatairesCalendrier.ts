import type {
    ActiviteDto,
    ActivitePrestataireDto,
    GroupeDto,
    MomentDto,
    NonParticipationPrestataireDto,
    SaveActivitePrestataireRequest,
} from "../../types/api";
import { trierMomentsChronologiquement } from "../../helpers/trierMomentsChronologiquement";
import { comparerParPrenomPuisNom } from "../../helpers/trierUtilisateurs";
import { activiteDateToFilterKey, formatActiviteDateForDisplay } from "./listeActivitesUtils";

export type ConflitCalendrierPrestataire = {
    tokenId: string;
    animateurNom: string;
    animateurPrenom: string;
    momentId: number;
    momentNom: string;
    activiteId: number;
    activiteNom: string;
};

/** Conflit lors de la création / modification d’une activité interne alors qu’une sortie occupe le créneau. */
export type ConflitActiviteAvecSortie = {
    tokenId: string;
    animateurNom: string;
    animateurPrenom: string;
    momentId: number;
    momentNom: string;
    sortieId: number;
    sortieNom: string;
};

export type EntreeSortieCalendrier = {
    sortie: ActivitePrestataireDto;
    moment: MomentDto;
};

export type CalendrierCelluleItem =
    | { kind: "activite"; activite: ActiviteDto; ordreMoment: number }
    | { kind: "prestataire"; sortie: ActivitePrestataireDto; moment: MomentDto; ordreMoment: number }
    | {
          kind: "conflit";
          sortie: ActivitePrestataireDto;
          moment: MomentDto;
          activite: ActiviteDto;
          ordreMoment: number;
      };

export function libellePlageHorairePrestataire(
    depart: string | null,
    retour: string | null,
): string | null {
    const d = (depart ?? "").trim();
    const r = (retour ?? "").trim();
    if (d && r) return `${d} – ${r}`;
    if (d) return `Départ ${d}`;
    if (r) return `Retour ${r}`;
    return null;
}

export function datePrestataireVersYmd(date: ActivitePrestataireDto["date"]): string {
    return activiteDateToFilterKey(date as ActiviteDto["date"]);
}

/** Doublon date × moment × groupe avec une autre sortie (hors sortie en cours d’édition). */
export function messageDoublonSortiePrestataire(
    payload: Pick<SaveActivitePrestataireRequest, "date" | "momentIds" | "groupeIds">,
    sortiesExistantes: ActivitePrestataireDto[],
    groupes: GroupeDto[],
    moments: MomentDto[],
    options?: { exclureSortieId?: number | null },
): string | null {
    const ymd = payload.date.trim();
    const groupeIds = payload.groupeIds ?? [];
    if (!ymd || groupeIds.length === 0 || payload.momentIds.length === 0) {
        return null;
    }

    const momentsPayload = new Set(payload.momentIds);
    const momentParId = new Map(moments.map((m) => [m.id, m]));
    const groupeParId = new Map(groupes.map((g) => [g.id, g]));
    const dateAffichee = formatActiviteDateForDisplay(ymd as ActiviteDto["date"]);

    for (const sortie of sortiesExistantes) {
        if (options?.exclureSortieId != null && sortie.id === options.exclureSortieId) {
            continue;
        }
        if (datePrestataireVersYmd(sortie.date) !== ymd) continue;

        const groupesSortie = new Set(sortie.groupeIds ?? []);
        if (groupesSortie.size === 0) continue;

        for (const moment of sortie.moments ?? []) {
            if (!momentsPayload.has(moment.id)) continue;
            for (const groupeId of groupeIds) {
                if (!groupesSortie.has(groupeId)) continue;
                const nomGroupe = groupeParId.get(groupeId)?.nom ?? "—";
                const nomMoment =
                    momentParId.get(moment.id)?.nom ?? moment.nom?.trim() ?? "—";
                return `Une sortie est déjà planifiée pour le groupe « ${nomGroupe} » le ${dateAffichee} au moment « ${nomMoment} ».`;
            }
        }
    }
    return null;
}

/** Référents des groupes dont l’id est dans `groupeIds`. */
export function tokensReferentsConcernesParGroupeIds(
    groupes: GroupeDto[],
    groupeIds: number[],
): Set<string> {
    const ids = new Set(groupeIds);
    const tokens = new Set<string>();
    if (ids.size === 0) return tokens;
    for (const g of groupes) {
        if (!ids.has(g.id)) continue;
        for (const r of g.referents ?? []) {
            const t = (r.tokenId ?? "").trim();
            if (t) tokens.add(t);
        }
    }
    return tokens;
}

export function estNonParticipation(
    nonParticipations: NonParticipationPrestataireDto[] | undefined,
    tokenId: string,
    momentId: number,
): boolean {
    const t = tokenId.trim();
    return (nonParticipations ?? []).some(
        (np) => np.tokenId.trim() === t && np.momentId === momentId,
    );
}

export function activiteInternePourTokenMomentDate(
    activitesInternes: ActiviteDto[],
    tokenId: string,
    ymd: string,
    momentId: number,
): ActiviteDto | undefined {
    const t = tokenId.trim();
    return activitesInternes.find((a) => {
        if (activiteDateToFilterKey(a.date) !== ymd) return false;
        if (a.moment?.id !== momentId) return false;
        return (a.membres ?? []).some((m) => (m.tokenId ?? "").trim() === t);
    });
}

function libelleAnimateur(groupes: GroupeDto[], tokenId: string): { nom: string; prenom: string } {
    const t = tokenId.trim();
    for (const g of groupes) {
        const r = (g.referents ?? []).find((x) => (x.tokenId ?? "").trim() === t);
        if (r) return { nom: r.nom, prenom: r.prenom };
    }
    return { nom: "", prenom: "" };
}

export type PayloadConflitSortie = {
    date: string;
    momentIds: number[];
    groupeIds: number[];
    nonParticipations?: NonParticipationPrestataireDto[];
};

/** Sortie visible sur le calendrier d’un référent pour une date et un moment donnés. */
export function sortieVisiblePourTokenMomentDate(
    prestataires: ActivitePrestataireDto[],
    groupes: GroupeDto[],
    tokenId: string,
    ymd: string,
    momentId: number,
): ActivitePrestataireDto | undefined {
    const t = tokenId.trim();
    for (const sortie of prestataires) {
        if (datePrestataireVersYmd(sortie.date) !== ymd) continue;
        const groupeIds = sortie.groupeIds ?? [];
        if (groupeIds.length === 0) continue;
        const concernes = tokensReferentsConcernesParGroupeIds(groupes, groupeIds);
        if (!concernes.has(t)) continue;
        if (!(sortie.moments ?? []).some((m) => m.id === momentId)) continue;
        if (estNonParticipation(sortie.nonParticipations, t, momentId)) continue;
        return sortie;
    }
    return undefined;
}

/** Conflits entre une activité interne (brouillon) et les sorties déjà visibles sur le calendrier. */
export function listerConflitsActiviteInterneAvecSortie(
    dateYmd: string,
    momentId: number,
    membreTokenIds: string[],
    prestataires: ActivitePrestataireDto[],
    groupes: GroupeDto[],
    moments: MomentDto[],
    activitesInternes: ActiviteDto[],
    options?: { exclureActiviteId?: number | null },
): ConflitActiviteAvecSortie[] {
    const ymd = dateYmd.trim();
    if (!ymd || momentId <= 0) return [];

    const momentNom = moments.find((m) => m.id === momentId)?.nom ?? "—";
    const tokensVus = new Set<string>();
    const out: ConflitActiviteAvecSortie[] = [];

    for (const raw of membreTokenIds) {
        const tokenId = raw.trim();
        if (!tokenId || tokensVus.has(tokenId)) continue;
        tokensVus.add(tokenId);

        const activiteExistante = activiteInternePourTokenMomentDate(
            activitesInternes,
            tokenId,
            ymd,
            momentId,
        );
        if (activiteExistante && activiteExistante.id !== options?.exclureActiviteId) continue;

        const sortie = sortieVisiblePourTokenMomentDate(
            prestataires,
            groupes,
            tokenId,
            ymd,
            momentId,
        );
        if (!sortie) continue;

        const { nom, prenom } = libelleAnimateur(groupes, tokenId);
        out.push({
            tokenId,
            animateurNom: nom,
            animateurPrenom: prenom,
            momentId,
            momentNom,
            sortieId: sortie.id,
            sortieNom: sortie.nom,
        });
    }
    return out;
}

/** Conflits entre une sortie (brouillon ou enregistrée) et les activités internes. */
export function listerConflitsCalendrierPrestataire(
    payload: PayloadConflitSortie,
    activitesInternes: ActiviteDto[],
    groupes: GroupeDto[],
    moments: MomentDto[],
): ConflitCalendrierPrestataire[] {
    const ymd = payload.date.trim();
    const groupeIds = payload.groupeIds ?? [];
    if (!ymd || groupeIds.length === 0) return [];

    const concernes = tokensReferentsConcernesParGroupeIds(groupes, groupeIds);
    const nonParts = payload.nonParticipations ?? [];
    const momentParId = new Map(moments.map((m) => [m.id, m]));
    const out: ConflitCalendrierPrestataire[] = [];

    for (const tokenId of concernes) {
        for (const momentId of payload.momentIds) {
            if (estNonParticipation(nonParts, tokenId, momentId)) continue;
            const activite = activiteInternePourTokenMomentDate(activitesInternes, tokenId, ymd, momentId);
            if (!activite) continue;
            const { nom, prenom } = libelleAnimateur(groupes, tokenId);
            out.push({
                tokenId,
                animateurNom: nom,
                animateurPrenom: prenom,
                momentId,
                momentNom: momentParId.get(momentId)?.nom ?? activite.moment?.nom ?? "—",
                activiteId: activite.id,
                activiteNom: activite.nom,
            });
        }
    }
    return out;
}

export function construireSortiesParAnimateurEtDate(
    prestataires: ActivitePrestataireDto[],
    groupes: GroupeDto[],
): Map<string, Map<string, EntreeSortieCalendrier[]>> {
    const map = new Map<string, Map<string, EntreeSortieCalendrier[]>>();
    for (const sortie of prestataires) {
        const ymd = datePrestataireVersYmd(sortie.date);
        const groupeIds = sortie.groupeIds ?? [];
        if (groupeIds.length === 0) continue;
        const concernes = tokensReferentsConcernesParGroupeIds(groupes, groupeIds);
        for (const tokenId of concernes) {
            for (const moment of sortie.moments ?? []) {
                if (estNonParticipation(sortie.nonParticipations, tokenId, moment.id)) continue;
                let inner = map.get(tokenId);
                if (!inner) {
                    inner = new Map();
                    map.set(tokenId, inner);
                }
                const prev = inner.get(ymd) ?? [];
                inner.set(ymd, [...prev, { sortie, moment }]);
            }
        }
    }
    return map;
}

export function fusionnerItemsCelluleCalendrier(
    activites: ActiviteDto[],
    sorties: EntreeSortieCalendrier[],
    momentsOrdonnes: MomentDto[],
    options: { afficherConflitsNonResolus: boolean },
): CalendrierCelluleItem[] {
    const ordreMoment = new Map(momentsOrdonnes.map((m, i) => [m.id, i]));
    const items: CalendrierCelluleItem[] = [];
    const momentsEnConflit = new Set<number>();

    for (const { sortie, moment } of sorties) {
        const om = ordreMoment.get(moment.id) ?? 9999;
        const conflitActivite = activites.find((a) => a.moment?.id === moment.id);
        if (conflitActivite && options.afficherConflitsNonResolus) {
            momentsEnConflit.add(moment.id);
            items.push({
                kind: "conflit",
                sortie,
                moment,
                activite: conflitActivite,
                ordreMoment: om,
            });
        } else if (!conflitActivite) {
            items.push({ kind: "prestataire", sortie, moment, ordreMoment: om });
        }
    }

    for (const a of activites) {
        if (a.moment && momentsEnConflit.has(a.moment.id)) continue;
        const om = a.moment ? (ordreMoment.get(a.moment.id) ?? 9999) : 9999;
        items.push({ kind: "activite", activite: a, ordreMoment: om });
    }

    return items.sort((x, y) => {
        if (x.ordreMoment !== y.ordreMoment) return x.ordreMoment - y.ordreMoment;
        const nx =
            x.kind === "activite"
                ? x.activite.nom
                : x.kind === "prestataire"
                  ? x.sortie.nom
                  : x.sortie.nom;
        const ny =
            y.kind === "activite"
                ? y.activite.nom
                : y.kind === "prestataire"
                  ? y.sortie.nom
                  : y.sortie.nom;
        return nx.localeCompare(ny, undefined, { sensitivity: "base" });
    });
}

export function construireCellulesPlanningParAnimateurEtDate(
    activitesParAnimateurEtDate: Map<string, Map<string, ActiviteDto[]>>,
    sortiesParAnimateurEtDate: Map<string, Map<string, EntreeSortieCalendrier[]>>,
    momentsOrdonnes: MomentDto[],
    afficherConflitsNonResolus: boolean,
): Map<string, Map<string, CalendrierCelluleItem[]>> {
    const out = new Map<string, Map<string, CalendrierCelluleItem[]>>();
    const tokens = new Set<string>([
        ...activitesParAnimateurEtDate.keys(),
        ...sortiesParAnimateurEtDate.keys(),
    ]);

    for (const tokenId of tokens) {
        const innerAct = activitesParAnimateurEtDate.get(tokenId);
        const innerSort = sortiesParAnimateurEtDate.get(tokenId);
        const ymds = new Set<string>([...(innerAct?.keys() ?? []), ...(innerSort?.keys() ?? [])]);
        const innerOut = new Map<string, CalendrierCelluleItem[]>();
        for (const ymd of ymds) {
            const acts = innerAct?.get(ymd) ?? [];
            const sorts = innerSort?.get(ymd) ?? [];
            innerOut.set(
                ymd,
                fusionnerItemsCelluleCalendrier(acts, sorts, momentsOrdonnes, {
                    afficherConflitsNonResolus,
                }),
            );
        }
        out.set(tokenId, innerOut);
    }
    return out;
}

export function cleNonParticipation(tokenId: string, momentId: number): string {
    return `${tokenId.trim()}:${momentId}`;
}

export function conflitsSansChoixResolution<T extends { tokenId: string; momentId: number }>(
    conflits: T[],
    choixParCle: Map<string, string>,
): T[] {
    return conflits.filter(
        (c) => !choixParCle.has(cleNonParticipation(c.tokenId, c.momentId)),
    );
}

/** Entrées présentes dans `nouvelles` mais pas dans `anciennes`. */
export function nonParticipationsAjoutees(
    anciennes: NonParticipationPrestataireDto[],
    nouvelles: NonParticipationPrestataireDto[],
): NonParticipationPrestataireDto[] {
    const clesAnciennes = new Set(
        anciennes.map((np) => cleNonParticipation(np.tokenId, np.momentId)),
    );
    return nouvelles.filter(
        (np) => !clesAnciennes.has(cleNonParticipation(np.tokenId, np.momentId)),
    );
}

/** Activités internes à supprimer pour des non-participations nouvellement ajoutées (hors « garder l’activité »). */
export function idsActivitesInternesASupprimerPourNonParticipations(
    dateYmd: string,
    ajoutees: NonParticipationPrestataireDto[],
    activitesInternes: ActiviteDto[],
    conserverSiGarderActivite: Set<string>,
): number[] {
    const ids = new Set<number>();
    const ymd = dateYmd.trim();
    for (const np of ajoutees) {
        const cle = cleNonParticipation(np.tokenId, np.momentId);
        if (conserverSiGarderActivite.has(cle)) continue;
        const activite = activiteInternePourTokenMomentDate(
            activitesInternes,
            np.tokenId,
            ymd,
            np.momentId,
        );
        if (activite) ids.add(activite.id);
    }
    return [...ids];
}

export function cleRetraitSortieCalendrier(
    sortieId: number,
    momentId: number,
    tokenId: string,
): string {
    return `presta-${sortieId}-${momentId}-${tokenId.trim()}`;
}

/** Libellés « Prénom Nom (Moment) » pour l’affichage sur la fiche sortie. */
export type LigneParticipationSortieFormulaire = {
    tokenId: string;
    momentId: number;
    nom: string;
    prenom: string;
    momentNom: string;
};

/** Animateur + moments (ordre paramétrage) pour le formulaire sortie. */
export type GroupeMomentsAnimateurParticipation = {
    tokenId: string;
    nom: string;
    prenom: string;
    moments: { momentId: number; momentNom: string }[];
};

function indexMomentsParametrage(moments: MomentDto[]): Map<number, number> {
    return new Map(trierMomentsChronologiquement(moments).map((m, i) => [m.id, i]));
}

function idsMomentsDansOrdreParametrage(momentIds: Iterable<number>, moments: MomentDto[]): number[] {
    const set = new Set(momentIds);
    return trierMomentsChronologiquement(moments)
        .filter((m) => set.has(m.id))
        .map((m) => m.id);
}

function comparerPersonnePuisMomentParametrage<
    T extends { prenom: string; nom: string; momentId: number },
>(a: T, b: T, ordreMoment: Map<number, number>): number {
    const cmpPersonne = comparerParPrenomPuisNom(a, b);
    if (cmpPersonne !== 0) return cmpPersonne;
    return (ordreMoment.get(a.momentId) ?? 0) - (ordreMoment.get(b.momentId) ?? 0);
}

/** Non-participations triées : animateur (A→Z), puis moments dans l’ordre du paramétrage. */
export function triNonParticipationsParPersonneEtMoment(
    nonParticipations: NonParticipationPrestataireDto[],
    groupes: GroupeDto[],
    moments: MomentDto[],
): NonParticipationPrestataireDto[] {
    const ordreMoment = indexMomentsParametrage(moments);
    return [...nonParticipations].sort((a, b) => {
        const la = libelleAnimateur(groupes, a.tokenId);
        const lb = libelleAnimateur(groupes, b.tokenId);
        return comparerPersonnePuisMomentParametrage(
            { ...la, momentId: a.momentId },
            { ...lb, momentId: b.momentId },
            ordreMoment,
        );
    });
}

/** Une ligne par couple référent × moment sélectionné (formulaire sortie). */
export function lignesParticipationSortieFormulaire(
    groupes: GroupeDto[],
    groupeIds: number[],
    momentIds: Iterable<number>,
    moments: MomentDto[],
): LigneParticipationSortieFormulaire[] {
    const idsMoments = idsMomentsDansOrdreParametrage(momentIds, moments);
    if (groupeIds.length === 0 || idsMoments.length === 0) return [];

    const momentParId = new Map(moments.map((m) => [m.id, m.nom]));
    const ordreMoment = indexMomentsParametrage(moments);
    const concernes = [...tokensReferentsConcernesParGroupeIds(groupes, groupeIds)].sort();
    const lignes: LigneParticipationSortieFormulaire[] = [];

    for (const tokenId of concernes) {
        const { nom, prenom } = libelleAnimateur(groupes, tokenId);
        for (const momentId of idsMoments) {
            lignes.push({
                tokenId,
                momentId,
                nom,
                prenom,
                momentNom: momentParId.get(momentId)?.trim() || "—",
            });
        }
    }

    return lignes.sort((a, b) => comparerPersonnePuisMomentParametrage(a, b, ordreMoment));
}

function grouperLignesParAnimateurToken<
    T extends { tokenId: string; nom: string; prenom: string; momentId: number; momentNom: string },
>(lignes: T[]): GroupeMomentsAnimateurParticipation[] {
    const ordre: string[] = [];
    const map = new Map<string, GroupeMomentsAnimateurParticipation>();
    for (const ligne of lignes) {
        let groupe = map.get(ligne.tokenId);
        if (!groupe) {
            ordre.push(ligne.tokenId);
            groupe = {
                tokenId: ligne.tokenId,
                nom: ligne.nom,
                prenom: ligne.prenom,
                moments: [],
            };
            map.set(ligne.tokenId, groupe);
        }
        groupe.moments.push({ momentId: ligne.momentId, momentNom: ligne.momentNom });
    }
    return ordre.map((tokenId) => map.get(tokenId)!);
}

export function grouperLignesParticipationParAnimateur(
    lignes: LigneParticipationSortieFormulaire[],
): GroupeMomentsAnimateurParticipation[] {
    return grouperLignesParAnimateurToken(lignes);
}

export function grouperNonParticipationsParAnimateur(
    nonParticipations: NonParticipationPrestataireDto[],
    groupes: GroupeDto[],
    moments: MomentDto[],
): GroupeMomentsAnimateurParticipation[] {
    const momentParId = new Map(moments.map((m) => [m.id, m.nom]));
    const lignes = triNonParticipationsParPersonneEtMoment(nonParticipations, groupes, moments).map(
        (np) => {
            const { nom, prenom } = libelleAnimateur(groupes, np.tokenId);
            return {
                tokenId: np.tokenId,
                nom,
                prenom,
                momentId: np.momentId,
                momentNom: momentParId.get(np.momentId)?.trim() || "—",
            };
        },
    );
    return grouperLignesParAnimateurToken(lignes);
}

/** Un libellé par animateur : `Prénom Nom (Matin 1, Matin 2, …)`. */
export function libellesNonParticipationsSortie(
    nonParticipations: NonParticipationPrestataireDto[] | undefined,
    groupes: GroupeDto[],
    moments: MomentDto[],
): string[] {
    return grouperNonParticipationsParAnimateur(nonParticipations ?? [], groupes, moments).map(
        (groupe) => {
            const personne = `${groupe.prenom} ${groupe.nom}`.trim() || groupe.tokenId.trim();
            const momentsStr = groupe.moments.map((m) => m.momentNom).join(", ");
            return `${personne} (${momentsStr})`;
        },
    );
}

export function sortieVersSaveRequest(
    sortie: ActivitePrestataireDto,
    nonParticipations: NonParticipationPrestataireDto[],
): SaveActivitePrestataireRequest {
    return {
        nom: sortie.nom,
        date: datePrestataireVersYmd(sortie.date),
        momentIds: (sortie.moments ?? []).map((m) => m.id),
        heureDepart: sortie.heureDepart,
        heureRetour: sortie.heureRetour,
        informations: sortie.informations,
        telephone: sortie.telephone,
        groupeIds: sortie.groupeIds ?? [],
        nonParticipations,
    };
}

export function fusionnerNonParticipationsApresChoix(
    existantes: NonParticipationPrestataireDto[],
    ajouts: NonParticipationPrestataireDto[],
    retraits: { tokenId: string; momentId: number }[],
): NonParticipationPrestataireDto[] {
    const map = new Map<string, NonParticipationPrestataireDto>();
    for (const np of existantes) {
        map.set(cleNonParticipation(np.tokenId, np.momentId), np);
    }
    for (const np of ajouts) {
        map.set(cleNonParticipation(np.tokenId, np.momentId), np);
    }
    for (const r of retraits) {
        map.delete(cleNonParticipation(r.tokenId, r.momentId));
    }
    return [...map.values()];
}
