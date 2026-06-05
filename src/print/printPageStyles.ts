import { escapeCssContent } from "./escapeCssContent";
import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";
import type { PrintPageFormat } from "./types";

/** Marge interne du contenu lorsque @page margin vaut 0 (évite URL / numéro navigateur) */
export const PRINT_CONTENT_PADDING = "12mm";

function buildPageRules(format: PrintPageFormat, runningHeaderLabel?: string): string {
    const size = format === "landscape-a4" ? "size: A4 landscape;" : "size: A4;";

    if (runningHeaderLabel == null || runningHeaderLabel === "") {
        return `@page { ${size} margin: 0; }`;
    }

    const title = escapeCssContent(runningHeaderLabel);
    return `
        @page {
            ${size}
            /* marge basse à 0 : pas de bandeau ni pied de page navigateur (URL, date…) */
            margin: 14mm 12mm 0 12mm;
            @top-left {
                content: "${title} — " counter(page) " / " counter(pages);
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 9pt;
                font-weight: 600;
                color: #333;
                vertical-align: bottom;
                padding-bottom: 2mm;
                border-bottom: 0.5pt solid #ccc;
            }
            @bottom-left-corner { content: none; }
            @bottom-left { content: none; }
            @bottom-center { content: none; }
            @bottom-right { content: none; }
            @bottom-right-corner { content: none; }
        }
    `;
}

/**
 * Construit la feuille de styles injectée dans la fenêtre d'impression react-to-print.
 * Les classes globales `enjoy-print-*` sont définies ici pour garantir le rendu hors écran.
 */
export function buildPrintPageStyle(options?: {
    format?: PrintPageFormat;
    extra?: string;
    /** Titre répété en marge haute avec numérotation (Chrome 131+, Safari 18.2+) */
    runningHeaderLabel?: string;
}): string {
    const format = options?.format ?? "portrait-a4";
    const hasRunningHeader =
        options?.runningHeaderLabel != null && options.runningHeaderLabel !== "";

    return `
        ${buildPageRules(format, options?.runningHeaderLabel)}
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
            padding: ${hasRunningHeader ? "0" : PRINT_CONTENT_PADDING};
        }
        .${c.only} { display: block !important; }
        .${c.noPrint} { display: none !important; }
        .${c.documentHeader} {
            margin-bottom: 0.75rem;
            padding-bottom: 0.5rem;
            border-bottom: none;
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
            page-break-inside: avoid;
        }
        thead {
            display: table-header-group;
        }
        tbody {
            display: table-row-group;
        }
        .${c.listePrintTable} {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
        }
        .${c.listePrintTable} thead {
            display: table-header-group;
        }
        .${c.listePrintTable} tbody tr {
            break-inside: avoid;
            page-break-inside: avoid;
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
    /** Tableau Liste : masque le tableau écran ; styles du tableau print dédié */
    listeTable: `
        .enjoy-no-print { display: none !important; }
    `,
} as const;
