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
    /** Grille menus séjour (calendrier repas × jours, vue liste) */
    menusGrid: `
        .enjoy-menus-print-grid { width: 100%; }
        .enjoy-menus-print-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #c8d0da;
            border-radius: 8px;
            overflow: hidden;
            font-size: 8.5pt;
            line-height: 1.35;
            table-layout: fixed;
        }
        .enjoy-menus-print-table th,
        .enjoy-menus-print-table td {
            border: 1px solid #e2e8ef;
            padding: 0.4rem 0.5rem;
            vertical-align: top;
        }
        .enjoy-menus-print-th-jour {
            background: #e8eef5 !important;
            text-align: center;
            font-weight: 700;
            font-size: 8pt;
            color: #1a3550;
            padding: 0.45rem 0.35rem !important;
        }
        .enjoy-menus-print-th-hors-sejour {
            background: #e4e4e4 !important;
            color: #777 !important;
        }
        .enjoy-menus-print-hors-sejour-hint {
            display: block;
            font-size: 7pt;
            font-weight: 500;
            color: #888;
            margin-top: 0.15rem;
        }
        .enjoy-menus-print-th-repas {
            background: #f6f8fb !important;
            font-weight: 700;
            font-size: 8pt;
            color: #2c3e50;
            width: 6.75rem;
            white-space: nowrap;
        }
        .enjoy-menus-print-cell {
            text-align: center;
            vertical-align: middle;
            background: #fff !important;
        }
        .enjoy-menus-print-cell-inner {
            text-align: center;
        }
        .enjoy-menus-print-ligne {
            margin: 0.08rem 0;
            text-align: center;
        }
        .enjoy-menus-print-ligne-label {
            font-weight: 600;
            color: #4a5568;
            font-size: 7.5pt;
            display: block;
            text-align: center;
        }
        .enjoy-menus-print-ligne-valeur {
            color: #1a1a1a;
            display: block;
            margin-bottom: 0.12rem;
            word-break: break-word;
            text-align: center;
        }
        .enjoy-menus-print-meta {
            display: block;
            margin-top: 0.2rem;
            padding-top: 0.2rem;
            border-top: 1px dashed #b8c4d0;
            font-size: 7pt;
            color: #5a6570;
            font-style: italic;
            line-height: 1.3;
            text-align: center;
        }
        .enjoy-menus-print-cell-empty {
            background: #f4f6f8 !important;
            color: #b0b8c0;
            text-align: center;
            font-style: italic;
            vertical-align: middle !important;
        }
        .enjoy-menus-print-cell-hors-sejour {
            background: #ececec !important;
            color: #999;
            text-align: center;
            vertical-align: middle !important;
        }
        .enjoy-menus-print-repas-badge {
            display: inline-block;
            padding: 0.12rem 0.4rem;
            border-radius: 4px;
            font-weight: 600;
            font-size: 8pt;
            color: #1a1a1a;
            background: transparent !important;
            border: 1px solid #c8d0da;
        }
        .enjoy-menus-print-liste-table .enjoy-menus-print-liste-date {
            font-weight: 600;
            background: #e8eef5 !important;
            white-space: nowrap;
            width: 6.5rem;
            vertical-align: top;
        }
        .enjoy-menus-print-liste-row-alt .enjoy-menus-print-liste-date {
            background: #eef2f6 !important;
        }
        .enjoy-menus-print-liste-row-alt .enjoy-menus-print-cell {
            background: #fff !important;
        }
    `,
    /** Tableau Liste : masque le tableau écran ; styles du tableau print dédié */
    listeTable: `
        .enjoy-no-print { display: none !important; }
    `,
} as const;
