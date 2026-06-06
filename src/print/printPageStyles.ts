import { escapeCssContent } from "./escapeCssContent";
import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";
import type { PrintPageFormat } from "./types";

/** Marge interne du contenu lorsque @page margin vaut 0 (évite URL / numéro navigateur) */
export const PRINT_CONTENT_PADDING = "12mm";
export const PRINT_RUNNING_HEADER_HEIGHT = "12mm";

export type RunningHeaderMode = "margin-box" | "fixed";

function buildPageRules(
    format: PrintPageFormat | undefined,
    runningHeaderLabel?: string,
    runningHeaderMode?: RunningHeaderMode,
): string {
    /** Sans `size` explicite : le dialogue d'impression (portrait / paysage) reste effectif. */
    const sizeDecl =
        format === "landscape-a4"
            ? "size: A4 landscape;"
            : format === "portrait-a4"
              ? "size: A4;"
              : "";

    if (runningHeaderLabel == null || runningHeaderLabel === "") {
        return `@page { ${sizeDecl} margin: 0; }`;
    }

    if (runningHeaderMode === "fixed") {
        return `@page { ${sizeDecl} margin: 0; }`;
    }

    const title = escapeCssContent(runningHeaderLabel);
    return `
        @page {
            ${sizeDecl}
            margin: 14mm 12mm 0 12mm;
            @top-left {
                content: "${title} — " counter(page) " / " counter(pages);
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13pt;
                font-weight: 700;
                color: #1a1a1a;
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

function buildFixedRunningHeaderStyles(): string {
    return `
        .${c.withRunningHeader} {
            padding: calc(${PRINT_RUNNING_HEADER_HEIGHT} + 4mm) ${PRINT_CONTENT_PADDING} ${PRINT_CONTENT_PADDING} ${PRINT_CONTENT_PADDING} !important;
        }
        .${c.runningHeader} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            padding: 2.5mm ${PRINT_CONTENT_PADDING} 2mm;
            font-size: 13pt;
            line-height: 1.3;
            font-weight: 700;
            color: #1a1a1a;
            background: #fff;
            border-bottom: 1px solid #ccc;
        }
        .${c.runningHeaderTitle} {
            font-size: 13pt;
            font-weight: 700;
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
    runningHeaderLabel?: string;
    /** `margin-box` (Chromium / Safari) ou `fixed` (Firefox) */
    runningHeaderMode?: RunningHeaderMode;
}): string {
    const hasRunningHeader =
        options?.runningHeaderLabel != null && options.runningHeaderLabel !== "";
    const fixedRunningHeader = options?.runningHeaderMode === "fixed";

    return `
        ${buildPageRules(options?.format, options?.runningHeaderLabel, options?.runningHeaderMode)}
        ${fixedRunningHeader ? buildFixedRunningHeaderStyles() : ""}
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
            margin: 0 0 0.65rem;
            font-size: 1.45rem;
            font-weight: 700;
            line-height: 1.25;
            color: #1a1a1a;
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
