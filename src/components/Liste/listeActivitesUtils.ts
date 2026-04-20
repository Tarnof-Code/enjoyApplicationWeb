import formaterDate, { parseDate } from "../../helpers/formaterDate";
import type { ActiviteDto, GroupeDto, LieuDto, MomentDto, SejourDTO, TypeActiviteDto } from "../../types/api";

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

export const NB_JOURS_VUE_CALENDRIER = 7;

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
    joursSejour: { ymd: string }[]
): { minStartYmd: string; maxStartYmd: string } | null {
    if (joursSejour.length === 0) return null;
    const premier = parseYmdVersDateLocale(joursSejour[0].ymd);
    const dernier = parseYmdVersDateLocale(joursSejour[joursSejour.length - 1].ymd);
    if (!premier || !dernier) return null;
    const maxStart = new Date(dernier.getFullYear(), dernier.getMonth(), dernier.getDate());
    maxStart.setDate(maxStart.getDate() - (NB_JOURS_VUE_CALENDRIER - 1));
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
