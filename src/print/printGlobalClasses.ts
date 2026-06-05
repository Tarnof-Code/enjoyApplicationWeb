/**
 * Classes CSS globales stables pour l'impression.
 * Réutilisées dans les feuilles SCSS et injectées dans `pageStyle` (react-to-print).
 */
export const PRINT_GLOBAL_CLASS = {
    /** Visible uniquement dans la fenêtre d'impression */
    only: "enjoy-print-only",
    /** Masqué à l'impression (boutons, filtres, navigation) */
    noPrint: "enjoy-no-print",
    /** Conteneur racine cloné par react-to-print */
    contentRoot: "enjoy-print-content-root",
    documentHeader: "enjoy-print-document-header",
    documentLabel: "enjoy-print-document-label",
    documentMeta: "enjoy-print-document-meta",
    documentMetaRow: "enjoy-print-document-meta-row",
    runningHeader: "enjoy-print-running-header",
    runningHeaderTitle: "enjoy-print-running-header-title",
    withRunningHeader: "enjoy-print-with-running-header",
    /** Tableau liste dédié à l'impression (pagination multi-pages) */
    listePrintTable: "enjoy-liste-print-table",
} as const;
