import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";
import type { PrintPageFormat } from "./types";

/** Marge interne du contenu (remplace @page margin pour éviter URL / numéro de page du navigateur) */
export const PRINT_CONTENT_PADDING = "12mm";

const PAGE_RULES: Record<PrintPageFormat, string> = {
    /** margin: 0 — requis pour supprimer en-têtes/pieds de page Chrome (URL, 1/1, etc.) */
    "portrait-a4": "@page { size: A4; margin: 0; }",
    "landscape-a4": "@page { size: A4 landscape; margin: 0; }",
};

/**
 * Construit la feuille de styles injectée dans la fenêtre d'impression react-to-print.
 * Les classes globales `enjoy-print-*` sont définies ici pour garantir le rendu hors écran.
 */
export function buildPrintPageStyle(options?: {
    format?: PrintPageFormat;
    extra?: string;
}): string {
    const format = options?.format ?? "portrait-a4";
    return `
        ${PAGE_RULES[format]}
        html, body {
            margin: 0 !important;
            padding: 0 !important;
        }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1a1a1a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .${c.contentRoot} {
            box-sizing: border-box;
            padding: ${PRINT_CONTENT_PADDING};
        }
        .${c.only} { display: block !important; }
        .${c.noPrint} { display: none !important; }
        .${c.documentHeader} {
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #ccc;
        }
        .${c.documentTitle} {
            margin: 0 0 0.25rem;
            font-size: 1.15rem;
            font-weight: 600;
        }
        .${c.documentSubtitle} {
            margin: 0 0 0.35rem;
            font-size: 0.95rem;
            color: #444;
        }
        .${c.documentLabel} {
            margin: 0 0 0.5rem;
            font-size: 1.05rem;
            font-weight: 600;
        }
        .${c.documentMeta} {
            margin: 0.5rem 0 0;
            font-size: 0.9rem;
        }
        .${c.documentMetaRow} {
            margin: 0.15rem 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 0.35rem 0.5rem;
            text-align: left;
            vertical-align: top;
        }
        tr {
            break-inside: avoid;
        }
        ${options?.extra ?? ""}
    `;
}

/** Presets CSS pour cas fréquents (listes larges, plannings) */
export const PRINT_STYLE_PRESETS = {
    /** Tableaux étendus — évite la coupure agressive des cellules */
    wideTable: `
        table { font-size: 9pt; }
        th, td { padding: 0.25rem 0.35rem; }
    `,
    /** Grilles type planning — orientation paysage recommandée */
    planningGrid: `
        .planning-print-grid { width: 100%; }
    `,
} as const;
