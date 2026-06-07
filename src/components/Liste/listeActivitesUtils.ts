import formaterDate, { parseDate } from "../../helpers/formaterDate";
import { idsEnConflit } from "../../helpers/construireArbreMoments";
import { trierEnfantsParPrenom } from "../../helpers/trierUtilisateurs";
import type {
    ActiviteDto,
    EnfantDto,
    GroupeDto,
    LieuDto,
    MomentDto,
    SejourDTO,
    TypeActiviteDto,
    UpdateActiviteRequest,
} from "../../types/api";

export const JOURS_COURTS_FR: readonly string[] = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export const MOIS_COURTS_FR: readonly string[] = [
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

/** Largeur de la fenêtre calendrier (nombre de colonnes « jour »). */
export type CalendrierNombreJoursVue = 1 | 3 | 7;

export const CALENDRIER_NOMBRES_JOURS_VUE: readonly CalendrierNombreJoursVue[] = [1, 3, 7];

export const NB_JOURS_VUE_CALENDRIER_DEFAUT: CalendrierNombreJoursVue = 7;

export const EMPLACEMENT_FILTRE_TOUS_ACTIVITE = "" as const;

/** Valeur du select « lieu » pour n’afficher que les activités sans lieu */
export const FILTRE_LISTE_LIEU_SANS = "__sans_lieu__";

export function formatActiviteDateForDisplay(date: ActiviteDto["date"]): string {
    if (Array.isArray(date)) {
        const [y, m, d] = date as unknown as number[];
        if (y != null && m != null && d != null) {
            return formaterDate(new Date(y, m - 1, d));
        }
    }
    const parsed = parseDate(date as string);
    return parsed ? formaterDate(parsed) : String(date);
}

export function dateDuJourVersInputDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function sejourChampDateVersInput(value: string | number): string {
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

export function sejourDebutToInputDate(value: SejourDTO["dateDebut"]): string {
    return sejourChampDateVersInput(value);
}

export function parseYmdVersDateLocale(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
}

export function libelleJourCourtPourBouton(d: Date): string {
    const mois = MOIS_COURTS_FR[d.getMonth()] ?? "";
    return `${JOURS_COURTS_FR[d.getDay()]} ${d.getDate()} ${mois}`.trim();
}

export function dateLocaleVersYmd(d: Date): string {
    const y = d.getFullYear();
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDaysToYmd(ymd: string, deltaJours: number): string | null {
    const d = parseYmdVersDateLocale(ymd);
    if (!d) return null;
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + deltaJours);
    return dateLocaleVersYmd(x);
}

export function bornesDebutFenetreCalendrier(
    joursSejour: { ymd: string }[],
    nombreJoursFenetre: number
): { minStartYmd: string; maxStartYmd: string } | null {
    if (joursSejour.length === 0) return null;
    const n = Math.max(1, Math.floor(nombreJoursFenetre));
    const premier = parseYmdVersDateLocale(joursSejour[0].ymd);
    const dernier = parseYmdVersDateLocale(joursSejour[joursSejour.length - 1].ymd);
    if (!premier || !dernier) return null;
    const maxStart = new Date(dernier.getFullYear(), dernier.getMonth(), dernier.getDate());
    maxStart.setDate(maxStart.getDate() - (n - 1));
    const premierCl = new Date(premier.getFullYear(), premier.getMonth(), premier.getDate());
    if (maxStart < premierCl) {
        maxStart.setTime(premierCl.getTime());
    }
    return {
        minStartYmd: joursSejour[0].ymd,
        maxStartYmd: dateLocaleVersYmd(maxStart),
    };
}

export function clampYmdEntre(ymd: string, minYmd: string, maxYmd: string): string {
    if (ymd < minYmd) return minYmd;
    if (ymd > maxYmd) return maxYmd;
    return ymd;
}

export function enumererJoursDuSejour(sejour: SejourDTO): { ymd: string; label: string }[] {
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

export function activiteDateToInputDate(value: ActiviteDto["date"]): string {
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

export function trierLieuxParNom(lieux: LieuDto[]): LieuDto[] {
    return [...lieux].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" }));
}

export function resumePartageLieu(l: LieuDto): string {
    if (l.partageableEntreAnimateurs && l.nombreMaxActivitesSimultanees != null) {
        return `Jusqu'à ${l.nombreMaxActivitesSimultanees} activités.`;
    }
    return "Une seule activité à la fois.";
}

function formaterDateYmdPourMessage(ymd: string): string {
    const d = parseYmdVersDateLocale(ymd.trim());
    return d ? formaterDate(d) : ymd.trim();
}

/** Prénom nom + activité / créneau réel pour les messages de conflit lieu. */
function libelleOccupantsLieuPourMessage(activites: readonly ActiviteDto[]): string {
    const parts: string[] = [];
    for (const a of activites) {
        const animateurs = (a.membres ?? [])
            .map((m) => `${m.prenom} ${m.nom}`.trim())
            .filter((x) => x !== "");
        const momentNom = a.moment?.nom?.trim();
        const activiteNom = a.nom.trim();

        if (animateurs.length > 0) {
            const qui = animateurs.join(", ");
            if (activiteNom && momentNom) {
                parts.push(`${qui} (activité « ${activiteNom} », ${momentNom})`);
            } else if (activiteNom) {
                parts.push(`${qui} (activité « ${activiteNom} »)`);
            } else if (momentNom) {
                parts.push(`${qui} (${momentNom})`);
            } else {
                parts.push(qui);
            }
        } else if (activiteNom) {
            parts.push(
                momentNom ? `activité « ${activiteNom} » (${momentNom})` : `activité « ${activiteNom} »`,
            );
        }
    }
    return parts.join(" ; ");
}

export type ResultatDisponibiliteLieuActivite =
    | { ok: true; avertissement?: string }
    | { ok: false; message: string };

/**
 * Occupation d’un lieu le même jour : chevauchement hiérarchique des moments
 * (aligné sur ActiviteServiceImpl.verifierDisponibiliteLieuPourActivite).
 */
export function verifierDisponibiliteLieuActivite(
    activites: readonly ActiviteDto[],
    lieu: LieuDto,
    dateYmd: string,
    momentId: number,
    moments: readonly MomentDto[],
    excludeActiviteId?: number | null,
): ResultatDisponibiliteLieuActivite {
    const ymd = dateYmd.trim();
    if (!ymd || momentId <= 0) return { ok: true };

    const conflictIds = idsEnConflit(momentId, moments);
    const momentNom = moments.find((m) => m.id === momentId)?.nom ?? "—";
    const dateLabel = formaterDateYmdPourMessage(ymd);

    const autres = activites.filter((a) => {
        if (excludeActiviteId != null && a.id === excludeActiviteId) return false;
        if (activiteDateToFilterKey(a.date) !== ymd) return false;
        if (a.lieu?.id !== lieu.id) return false;
        const aMomentId = a.moment?.id;
        if (aMomentId == null || !conflictIds.has(aMomentId)) return false;
        return true;
    });

    if (autres.length === 0) return { ok: true };

    const occupantLabel = libelleOccupantsLieuPourMessage(autres);
    const detailOccupant = occupantLabel ? ` Occupé par : ${occupantLabel}.` : "";

    if (!lieu.partageableEntreAnimateurs) {
        return {
            ok: false,
            message:
                `Ce lieu est déjà utilisé par une autre activité le ${dateLabel} ` +
                `pour le moment « ${momentNom} ».${detailOccupant} ` +
                `Il n’est pas configuré pour être partagé entre animateurs.`,
        };
    }

    const max = lieu.nombreMaxActivitesSimultanees;
    if (max == null) {
        return {
            ok: false,
            message:
                "Lieu partageable sans nombre maximal d’activités simultanées : configuration invalide.",
        };
    }

    if (autres.length >= max) {
        return {
            ok: false,
            message:
                `Vous ne pouvez pas utiliser ce lieu le ${dateLabel} pour le moment « ${momentNom} » : ` +
                `la limite de partage (${max} activité(s) au maximum) est déjà atteinte.${detailOccupant}`,
        };
    }

    return {
        ok: true,
        avertissement:
            `Ce lieu est déjà affecté à ${autres.length} autre(s) activité(s) le ${dateLabel} ` +
            `pour le moment « ${momentNom} ».${detailOccupant} L’affectation est acceptée car le lieu autorise le partage ` +
            `et la limite n’est pas encore atteinte.`,
    };
}

/** Premier conflit animateur ↔ activité interne (hiérarchie des moments incluse). */
export function premierConflitAnimateurActiviteInterne(
    activites: readonly ActiviteDto[],
    membreTokenIds: Iterable<string>,
    dateYmd: string,
    momentId: number,
    moments: readonly MomentDto[],
    libelleMembre: (tokenId: string) => { prenom: string; nom: string },
    excludeActiviteId?: number | null,
): string | null {
    const ymd = dateYmd.trim();
    if (!ymd || momentId <= 0) return null;

    const conflictIds = idsEnConflit(momentId, moments);
    const momentDemandeNom = moments.find((m) => m.id === momentId)?.nom ?? "—";
    const dateLabel = formaterDateYmdPourMessage(ymd);

    for (const raw of membreTokenIds) {
        const tokenId = raw.trim();
        if (!tokenId) continue;

        const activite = activites.find((a) => {
            if (excludeActiviteId != null && a.id === excludeActiviteId) return false;
            if (activiteDateToFilterKey(a.date) !== ymd) return false;
            const aMomentId = a.moment?.id;
            if (aMomentId == null || !conflictIds.has(aMomentId)) return false;
            return (a.membres ?? []).some((m) => (m.tokenId ?? "").trim() === tokenId);
        });
        if (!activite) continue;

        const momentOccupe = activite.moment?.nom ?? "—";
        const chevauchement =
            momentOccupe === momentDemandeNom
                ? ""
                : ` (en chevauchement avec « ${momentDemandeNom} »)`;
        const { prenom, nom } = libelleMembre(tokenId);
        const prenomOuNom = prenom.trim() || nom.trim() || "Animateur";
        return (
            `${prenomOuNom} encadre déjà une autre activité le ${dateLabel} ` +
            `au moment « ${momentOccupe} »${chevauchement}.`
        );
    }

    return null;
}

/** Enfants déjà affectés à une autre activité sur le même jour et créneau (hiérarchie des moments incluse). */
export function idsEnfantsDejaAffectesAutreActivite(
    activites: readonly ActiviteDto[],
    dateYmd: string,
    momentId: number,
    moments: readonly MomentDto[],
    excludeActiviteId?: number | null,
): Map<number, { activiteNom: string; momentNom: string }> {
    const ymd = dateYmd.trim();
    if (!ymd || momentId <= 0) return new Map();

    const conflictIds = idsEnConflit(momentId, moments);
    const result = new Map<number, { activiteNom: string; momentNom: string }>();

    for (const a of activites) {
        if (excludeActiviteId != null && a.id === excludeActiviteId) continue;
        if (activiteDateToFilterKey(a.date) !== ymd) continue;
        const aMomentId = a.moment?.id;
        if (aMomentId == null || !conflictIds.has(aMomentId)) continue;
        for (const e of a.enfants ?? []) {
            result.set(e.id, {
                activiteNom: a.nom,
                momentNom: a.moment?.nom ?? "—",
            });
        }
    }

    return result;
}

/** Libellé « Prénom Nom » pour une liste d'enfants participants. */
export function libelleEnfantsParticipants(
    enfants: readonly { prenom: string; nom: string }[] | null | undefined,
): string {
    if (!enfants?.length) return "—";
    return enfants.map((e) => `${e.prenom} ${e.nom}`.trim()).join(", ");
}

/** Enfants des groupes rattachés à une activité (dédupliqués, triés par prénom). */
export function enfantsEligiblesPourGroupesActivite(
    groupes: readonly GroupeDto[],
    groupeIds: readonly number[],
): EnfantDto[] {
    const idsVu = new Set<number>();
    const result: EnfantDto[] = [];
    for (const gid of groupeIds) {
        const g = groupes.find((x) => x.id === gid);
        if (!g) continue;
        for (const e of g.enfants ?? []) {
            if (!idsVu.has(e.id)) {
                idsVu.add(e.id);
                result.push(e);
            }
        }
    }
    return trierEnfantsParPrenom(result);
}

/** Requête PUT complète à partir d'une activité existante (remplacement des champs fournis). */
export function activiteVersUpdateRequest(
    activite: ActiviteDto,
    overrides?: Partial<UpdateActiviteRequest>,
): UpdateActiviteRequest {
    return {
        date: activiteDateToInputDate(activite.date),
        nom: activite.nom,
        description: activite.description ?? null,
        membreTokenIds: (activite.membres ?? [])
            .map((m) => m.tokenId)
            .filter((id): id is string => Boolean(id?.trim())),
        groupeIds: [...(activite.groupeIds ?? [])].sort((a, b) => a - b),
        typeActiviteId: activite.typeActivite.id,
        lieuId: activite.lieu?.id ?? null,
        momentId: activite.moment?.id ?? null,
        enfantIds: (activite.enfants ?? []).map((e) => e.id).sort((a, b) => a - b),
        ...overrides,
    };
}

export function activiteDateToFilterKey(value: ActiviteDto["date"]): string {
    if (Array.isArray(value)) {
        const [y, m, d] = value as unknown as number[];
        if (y != null && m != null && d != null) {
            return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
    }
    return activiteDateToInputDate(value as string);
}

export function trierTypesParLibelle(a: TypeActiviteDto, b: TypeActiviteDto): number {
    return a.libelle.localeCompare(b.libelle, undefined, { sensitivity: "base" });
}

/** Met un membre d’équipe en tête si son `tokenId` correspond (liste / calendrier / formulaire). */
export function equipeAvecTokenEnTete<T extends { tokenId: string }>(membres: T[], tokenPrioritaire: string): T[] {
    const t = tokenPrioritaire.trim();
    if (!t) return membres;
    const idx = membres.findIndex((m) => (m.tokenId ?? "").trim() === t);
    if (idx <= 0) return membres;
    const copy = [...membres];
    const [premier] = copy.splice(idx, 1);
    return [premier, ...copy];
}

/** Groupes dont le membre d’équipe (token) est référent. */
export function groupeIdsReferentsPourToken(groupes: GroupeDto[], tokenId: string): Set<number> {
    const ids = new Set<number>();
    for (const g of groupes) {
        if ((g.referents ?? []).some((r) => r.tokenId === tokenId)) {
            ids.add(g.id);
        }
    }
    return ids;
}

/**
 * Tokens d’équipe associés aux groupes sélectionnés : référents de ces groupes
 * et membres d’au moins une activité rattachée à l’un de ces groupes.
 */
export function tokensEquipePourFiltreGroupesCalendrier(
    groupes: GroupeDto[],
    idsGroupesSelection: ReadonlySet<number>,
    activites: ActiviteDto[]
): Set<string> {
    const tokens = new Set<string>();
    for (const g of groupes) {
        if (!idsGroupesSelection.has(g.id)) continue;
        for (const r of g.referents ?? []) {
            tokens.add(r.tokenId);
        }
    }
    for (const a of activites) {
        if (!(a.groupeIds ?? []).some((gid) => idsGroupesSelection.has(gid))) continue;
        for (const m of a.membres ?? []) {
            tokens.add(m.tokenId);
        }
    }
    return tokens;
}

export function trierActivitesPourCelluleCalendrier(acts: ActiviteDto[], momentsOrdonnés: MomentDto[]): ActiviteDto[] {
    const ordreMoment = new Map(momentsOrdonnés.map((m, i) => [m.id, i]));
    return [...acts].sort((a, b) => {
        const ia = a.moment ? ordreMoment.get(a.moment.id) ?? 9999 : 9999;
        const ib = b.moment ? ordreMoment.get(b.moment.id) ?? 9999 : 9999;
        if (ia !== ib) return ia - ib;
        return a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" });
    });
}

/** Nombre de teintes espacées régulièrement (360° / N) : couleurs nettement différentes, pas des nuances proches. */
const CALENDRIER_TYPE_NB_TEINTES = 36;

/**
 * Fond en HSL : une teinte parmi {@link CALENDRIER_TYPE_NB_TEINTES} directions fixes sur le cercle (ex. 10° si 36).
 * Évite les verts (ou autres familles) presque identiques d’un HSL continu. Au-delà de N types, les teintes se réutilisent.
 */
export function couleurFondCalendrierPourTypeActivite(typeId: number | undefined): string {
    if (typeId == null || !Number.isFinite(typeId)) {
        return "#f5f6f8";
    }
    const idx = (Math.imul(typeId, 2654435761) >>> 0) % CALENDRIER_TYPE_NB_TEINTES;
    const h = idx * (360 / CALENDRIER_TYPE_NB_TEINTES);
    return `hsl(${h}, 50%, 87%)`;
}
