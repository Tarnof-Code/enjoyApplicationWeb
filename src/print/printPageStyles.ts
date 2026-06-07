import { escapeCssContent } from "./escapeCssContent";
import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";
import type { PrintPageFormat } from "./types";

/** Marge interne du contenu lorsque @page margin vaut 0 (évite URL / numéro navigateur) */
export const PRINT_CONTENT_PADDING = "12mm";
/** Marge bas de page (souvent plus large pour éviter rognage / numéros navigateur) */
export const PRINT_PAGE_MARGIN_BOTTOM = "20mm";
export const PRINT_RUNNING_HEADER_HEIGHT = "12mm";

export type RunningHeaderMode = "margin-box" | "fixed";
export type RunningHeaderLayout = "default" | "title-page-split";

/** Bloque les en-têtes/pieds navigateur (URL, date…) tout en conservant les marges @page */
function buildBrowserMarginBoxReset(): string {
    const empty = "content: '';";
    return `
            @top-left-corner { ${empty} }
            @top-center { ${empty} }
            @top-right { ${empty} }
            @top-right-corner { ${empty} }
            @bottom-left-corner { ${empty} }
            @bottom-left { ${empty} }
            @bottom-center { ${empty} }
            @bottom-right { ${empty} }
            @bottom-right-corner { ${empty} }
    `;
}

function buildPageRules(
    format: PrintPageFormat | undefined,
    runningHeaderLabel?: string,
    runningHeaderMode?: RunningHeaderMode,
    runningHeaderLayout: RunningHeaderLayout = "default",
): string {
    /** Sans `size` explicite : le dialogue d'impression (portrait / paysage) reste effectif. */
    const sizeDecl =
        format === "landscape-a4"
            ? "size: A4 landscape;"
            : format === "portrait-a4"
              ? "size: A4;"
              : "";

    const bottom = PRINT_PAGE_MARGIN_BOTTOM;

    if (runningHeaderLabel == null || runningHeaderLabel === "") {
        return `
        @page {
            ${sizeDecl}
            margin: 0 0 ${bottom} 0;
            ${buildBrowserMarginBoxReset()}
        }
        `;
    }

    if (runningHeaderMode === "fixed") {
        return `
        @page {
            ${sizeDecl}
            margin: 0 0 ${bottom} 0;
            ${buildBrowserMarginBoxReset()}
        }
        `;
    }

    const title = escapeCssContent(runningHeaderLabel);

    if (runningHeaderLayout === "title-page-split") {
        const runningHeaderMarginBox = `
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13pt;
                font-weight: 700;
                color: #1a1a1a;
                vertical-align: bottom;
                padding-top: 3mm;
                padding-bottom: 2mm;
                border-bottom: 0.5pt solid #ccc;
        `;
        return `
        @page {
            ${sizeDecl}
            margin: 16mm 12mm ${bottom} 12mm;
            @top-left {
                content: "${title}";
                ${runningHeaderMarginBox}
            }
            ${buildBrowserMarginBoxReset()}
            @top-right {
                content: counter(page) " / " counter(pages);
                ${runningHeaderMarginBox}
                text-align: right;
            }
        }
        `;
    }

    return `
        @page {
            ${sizeDecl}
            margin: 14mm 12mm ${bottom} 12mm;
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
            ${buildBrowserMarginBoxReset()}
        }
    `;
}

function buildFixedRunningHeaderStyles(runningHeaderLayout: RunningHeaderLayout = "default"): string {
    const splitLayout = runningHeaderLayout === "title-page-split";
    return `
        .${c.withRunningHeader} {
            padding: calc(${PRINT_RUNNING_HEADER_HEIGHT} + 4mm) ${PRINT_CONTENT_PADDING} 0 ${PRINT_CONTENT_PADDING} !important;
        }
        .${c.runningHeader} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            ${splitLayout ? "display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem;" : ""}
            padding: ${splitLayout ? "4mm" : "2.5mm"} ${PRINT_CONTENT_PADDING} 2mm;
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
    runningHeaderLayout?: RunningHeaderLayout;
}): string {
    const hasRunningHeader =
        options?.runningHeaderLabel != null && options.runningHeaderLabel !== "";
    const fixedRunningHeader = options?.runningHeaderMode === "fixed";
    const runningHeaderLayout = options?.runningHeaderLayout ?? "default";

    return `
        ${buildPageRules(options?.format, options?.runningHeaderLabel, options?.runningHeaderMode, runningHeaderLayout)}
        ${fixedRunningHeader ? buildFixedRunningHeaderStyles(runningHeaderLayout) : ""}
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
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
            width: 100% !important;
            max-width: 100%;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: ${hasRunningHeader
                ? "0"
                : `${PRINT_CONTENT_PADDING} ${PRINT_CONTENT_PADDING} 0 ${PRINT_CONTENT_PADDING}`};
        }
        .${c.only} {
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        }
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
            display: table !important;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse;
            page-break-inside: auto;
            border: 1px solid #d0d7de;
        }
        .${c.listePrintTable} thead { display: table-header-group !important; }
        .${c.listePrintTable} tbody { display: table-row-group !important; }
        .${c.listePrintTable} tr { display: table-row !important; }
        .${c.listePrintTable} th,
        .${c.listePrintTable} td { display: table-cell !important; }
        .${c.listePrintTable} .${c.listePrintNoWrap} {
            white-space: nowrap !important;
            word-break: keep-all !important;
            overflow-wrap: normal !important;
            hyphens: none !important;
        }
        .${c.listePrintTable} th,
        .${c.listePrintTable} td {
            border: 1px solid #e2e8ef;
            overflow-wrap: anywhere;
            word-break: break-word;
            white-space: normal;
            hyphens: auto;
            max-width: none !important;
            min-width: 0 !important;
            vertical-align: middle;
        }
        .${c.listePrintTable} thead th {
            background: #f4f6f8;
            font-weight: 600;
            border-color: #d0d7de;
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
    /** Grille planning organisation */
    planningGrid: `
        .enjoy-planning-print-grid {
            width: 100%;
            max-width: 100%;
        }
        .enjoy-planning-print-table {
            width: 100%;
            max-width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            font-size: 8pt;
            line-height: 1.3;
        }
        .enjoy-planning-print-table th,
        .enjoy-planning-print-table td {
            border: 1px solid #ccc;
            padding: 0.3rem 0.35rem;
            vertical-align: top;
            overflow-wrap: anywhere;
            word-break: break-word;
            white-space: normal;
            hyphens: auto;
        }
        .enjoy-planning-print-th-section,
        .enjoy-planning-print-td-section {
            width: 10%;
            font-weight: 600;
            background: #f4f6f8;
        }
        .enjoy-planning-print-th-ligne,
        .enjoy-planning-print-td-ligne {
            width: 12%;
            font-weight: 600;
            background: #fafbfc;
        }
        .enjoy-planning-print-th-jour {
            text-align: center;
            font-weight: 600;
            background: #eef2f6;
            font-size: 7.5pt;
        }
        .enjoy-planning-print-td-jour {
            text-align: center;
            vertical-align: middle;
        }
        .enjoy-planning-print-cell-muted {
            color: #aaa;
            font-style: italic;
        }
        @media print and (orientation: portrait) {
            .enjoy-planning-print-table {
                font-size: 6.5pt;
            }
            .enjoy-planning-print-table th,
            .enjoy-planning-print-table td {
                padding: 0.15rem 0.2rem;
            }
            .enjoy-planning-print-th-jour {
                font-size: 6pt;
            }
        }
        .enjoy-planning-print-section {
            display: block;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .enjoy-planning-print-section:first-child {
            margin-top: 0.75rem;
        }
        .enjoy-planning-print-section:not(:first-child) {
            margin-top: 1.25rem;
            padding-top: 0.75rem;
        }
        .enjoy-planning-print-section-title,
        .enjoy-planning-print-section-consigne {
            break-after: avoid;
            page-break-after: avoid;
        }
        .enjoy-planning-print-grid {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .enjoy-planning-print-table {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .enjoy-planning-print-table thead {
            display: table-header-group;
        }
        .enjoy-planning-print-section-title {
            font-size: 13pt;
            font-weight: 600;
            margin: 0 0 0.4rem;
            break-after: avoid;
            page-break-after: avoid;
        }
        .enjoy-planning-print-section-consigne {
            font-size: 9pt;
            margin: 0 0 0.65rem;
            line-height: 1.35;
            break-after: avoid;
            page-break-after: avoid;
        }
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
            vertical-align: middle !important;
        }
        .enjoy-menus-print-cell {
            text-align: center;
            vertical-align: middle;
            background: #fff !important;
        }
        .enjoy-menus-print-cell-color {
            background: var(--enjoy-menus-print-cell-bg, #fff) !important;
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
        .enjoy-menus-print-repas-badge-color {
            background: var(--enjoy-menus-print-cell-bg, #fff) !important;
            border-color: #aeb8c4;
        }
        .enjoy-menus-print-liste-table .enjoy-menus-print-liste-date {
            font-weight: 600;
            background: #e8eef5 !important;
            white-space: nowrap;
            width: 6.5rem;
            vertical-align: middle;
        }
        .enjoy-menus-print-liste-table td:has(.enjoy-menus-print-repas-badge) {
            vertical-align: middle;
            text-align: center;
        }
        .enjoy-menus-print-liste-row-alt .enjoy-menus-print-liste-date {
            background: #eef2f6 !important;
        }
        .enjoy-menus-print-liste-row-alt .enjoy-menus-print-cell {
            background: #fff !important;
        }
    `,
    /** Planning d'activités — vue calendrier */
    activitesCalendarGrid: `
        .enjoy-activites-print-grid {
            width: 100%;
            max-width: 100%;
        }
        .enjoy-activites-print-table {
            width: 100%;
            max-width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            border: 1px solid #c8d0da;
            font-size: 7.5pt;
            line-height: 1.28;
        }
        .enjoy-activites-print-table th,
        .enjoy-activites-print-table td {
            border: 1px solid #d7dee8;
            padding: 0.28rem 0.32rem;
            vertical-align: top;
            overflow-wrap: anywhere;
            word-break: break-word;
            white-space: normal;
        }
        .enjoy-activites-print-th-animateur {
            width: 7.5rem;
            background: #f6f8fb !important;
            color: #2c3e50;
            font-weight: 700;
        }
        .enjoy-activites-print-th-jour {
            background: #e8eef5 !important;
            color: #1a3550;
            text-align: center;
            font-weight: 700;
        }
        .enjoy-activites-print-cell {
            background: #fff !important;
            min-height: 2.8rem;
        }
        .enjoy-activites-print-cell-hors-sejour {
            background: #f0f0f0 !important;
            color: #999;
        }
        .enjoy-activites-print-animateur-name {
            display: block;
            font-weight: 700;
            line-height: 1.2;
        }
        .enjoy-activites-print-animateur-groupes {
            display: block;
            margin-top: 0.16rem;
            color: #555;
            font-size: 6.8pt;
            line-height: 1.2;
            font-weight: 500;
        }
        .enjoy-activites-print-card {
            margin: 0 0 0.18rem;
            padding: 0.24rem 0.3rem;
            border: 1px solid #aeb8c4;
            border-radius: 4px;
            background: #fff !important;
            color: #1a1a1a;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .enjoy-activites-print-card-color {
            background: var(--enjoy-activites-print-card-bg, #fff) !important;
        }
        .enjoy-activites-print-card-moment {
            display: block;
            color: #555;
            font-size: 6.8pt;
            line-height: 1.15;
        }
        .enjoy-activites-print-card-title {
            display: block;
            margin-top: 0.04rem;
            font-weight: 700;
            line-height: 1.18;
        }
        .enjoy-activites-print-card-meta {
            display: block;
            margin-top: 0.08rem;
            color: #555;
            font-size: 6.8pt;
            line-height: 1.18;
        }
        .enjoy-activites-print-conflict {
            border-color: #b7791f;
            background: #fff8e8 !important;
        }
        @media print and (orientation: portrait) {
            .enjoy-activites-print-table {
                font-size: 6.5pt;
            }
            .enjoy-activites-print-table th,
            .enjoy-activites-print-table td {
                padding: 0.18rem 0.2rem;
            }
            .enjoy-activites-print-th-animateur {
                width: 6.2rem;
            }
        }
    `,
    /** Tableau Liste : masque le tableau écran ; adaptation portrait */
    listeTable: `
        .enjoy-no-print { display: none !important; }
        .enjoy-liste-filter-row { display: none !important; }
        .enjoy-liste-print-table .enjoy-sanitaire-col-groupes {
            min-width: 11rem !important;
        }
        .enjoy-liste-print-table thead tr > th:empty,
        .enjoy-liste-print-table tbody tr > td:empty {
            display: none !important;
            width: 0 !important;
            padding: 0 !important;
            border: none !important;
        }
        @media print and (orientation: portrait) {
            .enjoy-liste-print-table {
                font-size: 7.5pt;
            }
            .enjoy-liste-print-table th,
            .enjoy-liste-print-table td {
                padding: 0.2rem 0.25rem;
            }
        }
    `,
} as const;

/** Preset liste : filtres masqués (largeurs colonnes = auto, table 100 % de la page) */
export function buildListePrintExtraStyle(_columnCount: number): string {
    return PRINT_STYLE_PRESETS.listeTable;
}
