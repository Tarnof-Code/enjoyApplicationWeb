import { parseDate } from "./formaterDate";
import type { HistoriqueModificationAction } from "../types/api";

export function libelleActionHistorique(action: HistoriqueModificationAction): string {
    switch (action) {
        case "CREATION":
            return "Création";
        case "MODIFICATION":
            return "Modification";
        case "SUPPRESSION":
            return "Suppression";
        default:
            return String(action);
    }
}

export function formatDateHeureHistorique(value: string | number): string {
    const d = parseDate(value);
    if (!d) {
        return typeof value === "string" ? value : String(value);
    }
    return d.toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

export function formatNomModificateurHistorique(prenom: string | null, nom: string | null): string {
    const p = (prenom ?? "").trim();
    const n = (nom ?? "").trim();
    const full = `${p} ${n}`.trim();
    return full !== "" ? full : "—";
}

/** Domaine pour interpréter le format snapshot documenté dans `documentation-api-rest.md`. */
export type HistoriqueSnapshotDomaine = "activite" | "planning_cellule";

const CHAMPS_SNAPSHOT_ACTIVITE = [
    "Date",
    "Nom",
    "Description",
    "Lieu",
    "Moment",
    "Type d’activité",
    "Membres",
    "Groupes",
] as const;

const CHAMPS_SNAPSHOT_CELLULE = [
    "Texte libre",
    "Animateurs",
    "Horaires",
    "Moments",
    "Groupes",
    "Lieux",
] as const;

function parseSnapshotPipe(
    valeur: string | null | undefined,
    domaine: HistoriqueSnapshotDomaine
): { labels: readonly string[]; parts: string[] } | null {
    if (valeur == null) return null;
    const t = valeur.trim();
    if (t === "") return null;
    const c0 = t[0];
    if (c0 === "{" || c0 === "[") return null;
    const parts = t.split("|");
    const labels = domaine === "activite" ? CHAMPS_SNAPSHOT_ACTIVITE : CHAMPS_SNAPSHOT_CELLULE;
    if (parts.length !== labels.length) return null;
    return { labels, parts };
}

/** Vide « métier » : chaîne vide ou tableau JSON `[]` (listes non renseignées côté API). */
function normaliserSegmentSnapshotPourComparaison(segment: string): string {
    const t = segment.trim();
    if (t === "") return "";
    if (/^\[\s*\]$/.test(t)) return "";
    return t;
}

function segmentsSnapshotIdentiques(va: string, vn: string): boolean {
    return (
        normaliserSegmentSnapshotPourComparaison(va) ===
        normaliserSegmentSnapshotPourComparaison(vn)
    );
}

/**
 * Compare ancienne / nouvelle valeur pour affichage lisible : **`champ : ancien → nouveau`** par ligne
 * (snapshots pipe-separated doc API), ou blocs JSON / texte sinon.
 */
export function formaterComparaisonHistoriqueSnapshots(
    ancienneValeur: string | null | undefined,
    nouvelleValeur: string | null | undefined,
    domaine: HistoriqueSnapshotDomaine
): string | null {
    const aRaw = (ancienneValeur ?? "").trim();
    const nRaw = (nouvelleValeur ?? "").trim();
    if (aRaw === "" && nRaw === "") return null;

    const parsedA = parseSnapshotPipe(ancienneValeur, domaine);
    const parsedN = parseSnapshotPipe(nouvelleValeur, domaine);

    if (parsedA ?? parsedN) {
        const labels = parsedA?.labels ?? parsedN?.labels ?? [];
        const lines: string[] = [];
        for (let i = 0; i < labels.length; i++) {
            const va = (parsedA?.parts[i] ?? "").trim();
            const vn = (parsedN?.parts[i] ?? "").trim();
            if (segmentsSnapshotIdentiques(va, vn)) continue;
            const affA = normaliserSegmentSnapshotPourComparaison(va) === "" ? "Vide" : va;
            const affN = normaliserSegmentSnapshotPourComparaison(vn) === "" ? "Vide" : vn;
            lines.push(`${labels[i]} : ${affA} → ${affN}`);
        }
        return lines.length > 0 ? lines.join("\n") : null;
    }

    const fmtBloc = (s: string, titre: string): string => {
        const c0 = s[0];
        if (c0 === "{" || c0 === "[") {
            try {
                return `${titre}\n${JSON.stringify(JSON.parse(s), null, 2)}`;
            } catch {
                return `${titre}\n${s}`;
            }
        }
        return `${titre}\n${s}`;
    };

    if (aRaw && nRaw) {
        if (aRaw === nRaw) return null;
        return `${fmtBloc(aRaw, "Ancienne valeur")}\n\n→\n\n${fmtBloc(nRaw, "Nouvelle valeur")}`;
    }
    if (aRaw) return fmtBloc(aRaw, "Ancienne valeur");
    if (nRaw) return fmtBloc(nRaw, "Nouvelle valeur");
    return null;
}

/**
 * Formate une seule valeur d’historique (aperçu isolé).
 *
 * Activité : `date|nom|description|lieuId|momentId|typeId|membreIds|groupeIds`
 * Cellule : `texteLibre|membreTokenIds|horaireIds|momentIds|groupeIds|lieuIds`
 */
export function formaterValeurHistoriquePourAffichage(
    valeur: string | null | undefined,
    domaine: HistoriqueSnapshotDomaine
): string | null {
    if (valeur == null) return null;
    const t = valeur.trim();
    if (t === "") return null;

    const pipe = parseSnapshotPipe(valeur, domaine);
    if (pipe) {
        return pipe.parts.map((segment, i) => `${pipe.labels[i]} : ${segment}`).join("\n");
    }

    const c0 = t[0];
    if (c0 === "{" || c0 === "[") {
        try {
            return JSON.stringify(JSON.parse(t), null, 2);
        } catch {
            return t;
        }
    }

    return t;
}

/** @deprecated Utiliser `formaterValeurHistoriquePourAffichage` avec le bon domaine. */
export function formaterSnapshotHistoriqueJson(json: string | null | undefined): string | null {
    return formaterValeurHistoriquePourAffichage(json, "activite");
}
