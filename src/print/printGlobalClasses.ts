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
    listePrintWrap: "enjoy-liste-print-wrap",
    /** Cellule liste print : contenu sur une seule ligne (ex. email) */
    listePrintNoWrap: "enjoy-liste-print-nowrap",
    /** Grille planning organisation — styles dans `PRINT_STYLE_PRESETS.planningGrid` */
    planningPrintGrid: "enjoy-planning-print-grid",
    planningPrintTable: "enjoy-planning-print-table",
    planningPrintThSection: "enjoy-planning-print-th-section",
    planningPrintTdSection: "enjoy-planning-print-td-section",
    planningPrintThLigne: "enjoy-planning-print-th-ligne",
    planningPrintTdLigne: "enjoy-planning-print-td-ligne",
    planningPrintThJour: "enjoy-planning-print-th-jour",
    planningPrintTdJour: "enjoy-planning-print-td-jour",
    planningPrintCellMuted: "enjoy-planning-print-cell-muted",
    /** Grille menus (calendrier / liste) — styles dans `PRINT_STYLE_PRESETS.menusGrid` */
    menusPrintGrid: "enjoy-menus-print-grid",
    menusPrintTable: "enjoy-menus-print-table",
    menusPrintThJour: "enjoy-menus-print-th-jour",
    menusPrintThRepas: "enjoy-menus-print-th-repas",
    menusPrintThHorsSejour: "enjoy-menus-print-th-hors-sejour",
    menusPrintHorsSejourHint: "enjoy-menus-print-hors-sejour-hint",
    menusPrintCell: "enjoy-menus-print-cell",
    menusPrintCellInner: "enjoy-menus-print-cell-inner",
    menusPrintLigne: "enjoy-menus-print-ligne",
    menusPrintLigneLabel: "enjoy-menus-print-ligne-label",
    menusPrintLigneValeur: "enjoy-menus-print-ligne-valeur",
    menusPrintMeta: "enjoy-menus-print-meta",
    menusPrintCellEmpty: "enjoy-menus-print-cell-empty",
    menusPrintCellHorsSejour: "enjoy-menus-print-cell-hors-sejour",
    menusPrintRepasBadge: "enjoy-menus-print-repas-badge",
    menusPrintListeDate: "enjoy-menus-print-liste-date",
    menusPrintListeTable: "enjoy-menus-print-liste-table",
    menusPrintListeRowAlt: "enjoy-menus-print-liste-row-alt",
} as const;
