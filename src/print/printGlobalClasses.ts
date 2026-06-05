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
    documentTitle: "enjoy-print-document-title",
    documentSubtitle: "enjoy-print-document-subtitle",
    documentLabel: "enjoy-print-document-label",
    documentMeta: "enjoy-print-document-meta",
    documentMetaRow: "enjoy-print-document-meta-row",
} as const;
