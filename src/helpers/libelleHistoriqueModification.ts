import { parseDate } from "./formaterDate";
import type { HistoriqueModificationAction, TypeSoinInfirmerie } from "../types/api";
import { LIBELLE_SOIN, ORDRE_SOINS } from "../constants/cahierInfirmerieLabels";

/** Remplace les instants ISO 8601 dans un snapshot historique par une date/heure locale lisible. */
export function formaterInstantsIsoDansTexteHistorique(text: string): string {
    return text.replace(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g,
        (m) => {
            const d = parseDate(m);
            if (!d) return m;
            return d.toLocaleString("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
            });
        },
    );
}

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
export type HistoriqueSnapshotDomaine = "activite" | "planning_cellule" | "cahier_infi";

const CHAMPS_SNAPSHOT_ACTIVITE = [
    "Date",
    "Nom",
    "Description",
    "Lieu",
    "Moment",
    "Type d’activité",
    "Animateurs",
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
    if (domaine === "cahier_infi") return null;
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

/** Colonne « Date » du snapshot activité : `yyyy-MM-dd` ou ISO → affichage `jj/mm/aaaa`. */
function formaterSegmentDateSnapshotActivite(segment: string): string {
    const t = segment.trim();
    if (t === "") return t;
    const d = parseDate(t);
    if (!d) return t;
    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/** Aligné sur `CahierInfirmerieServiceImpl.libelleEntreePourHistorique` (séparateur ` | `). Segment « Temp. … °C » optionnel. */
const RE_SNAPSHOT_CAHIER_INFIRMERIE =
    /^Enfant:\s*(.+?)\s*\|\s*Date\/heure:\s*(.+?)\s*\|\s*Description:\s*(.*?)\s*\|\s*Localisation:\s*(.+?)\s*\|\s*Soins:\s*(.+?)(?:\s*\|\s*Temp\.\s*([\d.]+)\s*°C)?\s*\|\s*Appels:\s*(.+?)\s*\|\s*Soigneur:\s*(.+)$/s;

const CLES_CAHIER_INFIRMERIE = [
    "Enfant",
    "Date/heure",
    "Description",
    "Localisation",
    "Soins",
    "Température (°C)",
    "Appels",
    "Soigneur",
] as const;

type EntreeCahierInfirmerieHistorique = Record<(typeof CLES_CAHIER_INFIRMERIE)[number], string>;

function parserSnapshotCahierInfirmerie(text: string): EntreeCahierInfirmerieHistorique | null {
    const m = text.trim().match(RE_SNAPSHOT_CAHIER_INFIRMERIE);
    if (!m) return null;
    return {
        Enfant: m[1].trim(),
        "Date/heure": m[2].trim(),
        Description: m[3].trim(),
        Localisation: m[4].trim(),
        Soins: m[5].trim(),
        "Température (°C)": (m[6] ?? "").trim(),
        Appels: m[7].trim(),
        Soigneur: m[8].trim(),
    };
}

/** Suffixe `(autre: …)` produit côté API dans le libellé snapshot « Soins ». */
function extrairePrecisionAutreSnapshot(soinsBrut: string): { nu: string; precision: string } {
    const m = /\s*\(autre:\s*([^)]+)\)\s*$/i.exec(soinsBrut.trim());
    if (!m) return { nu: soinsBrut.trim(), precision: "" };
    const nu = soinsBrut.slice(0, m.index).trim().replace(/,\s*$/, "");
    return { nu, precision: m[1].trim() };
}

function tokensDepuisSoinsSnapshot(nu: string): string[] {
    return nu
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}

/**
 * Affichage « Soins » historique : pour `AUTRE`, seule la précision ; sinon libellés FR ; température sur « Prise de température ».
 * `soinsBrut` / `tempCelsius` = segments tels que dans le snapshot API.
 */
function libelleSoinsSnapshotPourHistorique(soinsBrut: string, tempCelsius: string): string {
    const { nu, precision } = extrairePrecisionAutreSnapshot(soinsBrut);
    const tokens = tokensDepuisSoinsSnapshot(nu);
    const ordre = new Set<TypeSoinInfirmerie>(ORDRE_SOINS);
    const parts: string[] = [];
    const temp = tempCelsius.trim();
    for (const type of ORDRE_SOINS) {
        if (!tokens.includes(type)) continue;
        if (type === "AUTRE") {
            parts.push(precision.trim() !== "" ? precision : LIBELLE_SOIN.AUTRE);
            continue;
        }
        let lib = LIBELLE_SOIN[type];
        if (type === "PRISE_TEMPERATURE" && temp !== "") {
            const n = Number(temp.replace(",", "."));
            const aff = Number.isFinite(n)
                ? n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })
                : temp;
            lib = `${lib} (${aff} °C)`;
        }
        parts.push(lib);
    }
    for (const t of tokens) {
        if (ordre.has(t as TypeSoinInfirmerie)) continue;
        parts.push(t);
    }
    return parts.length > 0 ? parts.join(", ") : "—";
}

/** Une ligne « Soins » lisible ; la température n’est plus un champ séparé. */
function entreePourAffichageHistorique(e: EntreeCahierInfirmerieHistorique): EntreeCahierInfirmerieHistorique {
    return {
        ...e,
        Soins: libelleSoinsSnapshotPourHistorique(e.Soins, e["Température (°C)"]),
        "Température (°C)": "",
    };
}

function champsSnapshotCahierEgaux(a: string, b: string): boolean {
    const ta = a.trim();
    const tb = b.trim();
    if (ta === tb) return true;
    const da = parseDate(ta);
    const db = parseDate(tb);
    if (da && db && da.getTime() === db.getTime()) return true;
    return false;
}

/** Comparaison / affichage création-suppression pour snapshots cahier d’infirmerie (`Enfant: … | …`). */
function formaterComparaisonHistoriqueCahierInfirmerie(
    ancienneValeur: string | null | undefined,
    nouvelleValeur: string | null | undefined,
): string | null {
    const aRaw = (ancienneValeur ?? "").trim();
    const nRaw = (nouvelleValeur ?? "").trim();
    if (aRaw === "" && nRaw === "") return null;

    const fmtInst = (s: string) => formaterInstantsIsoDansTexteHistorique(s);

    const cahierA = aRaw ? parserSnapshotCahierInfirmerie(aRaw) : null;
    const cahierN = nRaw ? parserSnapshotCahierInfirmerie(nRaw) : null;

    if (cahierA && cahierN) {
        const lignes = differEnregistrementsCahierInfirmerie(cahierA, cahierN);
        if (lignes.length > 0) return fmtInst(lignes.join("\n"));
        return null;
    }

    if (!cahierA && cahierN) {
        const aff = entreePourAffichageHistorique(cahierN);
        const lines: string[] = [];
        for (const cle of CLES_CAHIER_INFIRMERIE) {
            if (cle === "Température (°C)") continue;
            const vn = aff[cle].trim();
            if (vn === "" || vn === "—") continue;
            lines.push(`${cle} : ${vn}`);
        }
        return lines.length > 0 ? fmtInst(lines.join("\n")) : null;
    }

    if (cahierA && !cahierN) {
        const aff = entreePourAffichageHistorique(cahierA);
        const lines: string[] = [];
        for (const cle of CLES_CAHIER_INFIRMERIE) {
            if (cle === "Température (°C)") continue;
            const va = aff[cle].trim();
            if (va === "" || va === "—") continue;
            lines.push(`${cle} : ${va} → Vide`);
        }
        return lines.length > 0 ? fmtInst(lines.join("\n")) : null;
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
        return fmtInst(`${fmtBloc(aRaw, "Ancienne valeur")}\n\n→\n\n${fmtBloc(nRaw, "Nouvelle valeur")}`);
    }
    if (aRaw) return fmtInst(fmtBloc(aRaw, "Ancienne valeur"));
    if (nRaw) return fmtInst(fmtBloc(nRaw, "Nouvelle valeur"));
    return null;
}

/** Lignes `Champ : ancien → nouveau` pour les seuls champs modifiés (Soins inclut température et précision « autre »). */
function differEnregistrementsCahierInfirmerie(
    avant: EntreeCahierInfirmerieHistorique,
    apres: EntreeCahierInfirmerieHistorique,
): string[] {
    const a = entreePourAffichageHistorique(avant);
    const b = entreePourAffichageHistorique(apres);
    const lines: string[] = [];
    for (const cle of CLES_CAHIER_INFIRMERIE) {
        if (cle === "Température (°C)") continue;
        const va = a[cle];
        const vn = b[cle];
        if (champsSnapshotCahierEgaux(va, vn)) continue;
        const affA = va.trim() === "" ? "Vide" : va;
        const affN = vn.trim() === "" ? "Vide" : vn;
        lines.push(`${cle} : ${affA} → ${affN}`);
    }
    return lines;
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
    if (domaine === "cahier_infi") {
        return formaterComparaisonHistoriqueCahierInfirmerie(ancienneValeur, nouvelleValeur);
    }

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
            let affA = normaliserSegmentSnapshotPourComparaison(va) === "" ? "Vide" : va;
            let affN = normaliserSegmentSnapshotPourComparaison(vn) === "" ? "Vide" : vn;
            if (domaine === "activite" && labels[i] === "Date") {
                if (affA !== "Vide") affA = formaterSegmentDateSnapshotActivite(affA);
                if (affN !== "Vide") affN = formaterSegmentDateSnapshotActivite(affN);
            }
            lines.push(`${labels[i]} : ${affA} → ${affN}`);
        }
        if (lines.length === 0) return null;
        return formaterInstantsIsoDansTexteHistorique(lines.join("\n"));
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
        return formaterInstantsIsoDansTexteHistorique(
            `${fmtBloc(aRaw, "Ancienne valeur")}\n\n→\n\n${fmtBloc(nRaw, "Nouvelle valeur")}`,
        );
    }
    if (aRaw) return formaterInstantsIsoDansTexteHistorique(fmtBloc(aRaw, "Ancienne valeur"));
    if (nRaw) return formaterInstantsIsoDansTexteHistorique(fmtBloc(nRaw, "Nouvelle valeur"));
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

    if (domaine === "cahier_infi") {
        const cahier = parserSnapshotCahierInfirmerie(t);
        if (cahier) {
            const aff = entreePourAffichageHistorique(cahier);
            return CLES_CAHIER_INFIRMERIE.map((cle) => {
                if (cle === "Température (°C)") return null;
                const v = aff[cle].trim();
                if (v === "" || v === "—") return null;
                return `${cle} : ${v}`;
            })
                .filter((l): l is string => l != null)
                .join("\n");
        }
    }

    const pipe = parseSnapshotPipe(valeur, domaine);
    if (pipe) {
        return pipe.parts
            .map((segment, i) => {
                const label = pipe.labels[i];
                const display =
                    domaine === "activite" && label === "Date"
                        ? formaterSegmentDateSnapshotActivite(segment)
                        : segment;
                return `${label} : ${display}`;
            })
            .join("\n");
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
