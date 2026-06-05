/** Format de page pour les documents imprimés */
export type PrintPageFormat = "portrait-a4" | "landscape-a4";

/** En-tête contextuel affiché uniquement à l'impression */
export type PrintDocumentContext = {
    /** Intitulé du document — ex. « Liste des enfants », « Compte rendu — 12/06/2026 » */
    documentLabel?: string;
    /** Paires label / valeur optionnelles (effectifs, filtres, etc.) */
    meta?: ReadonlyArray<{ label: string; value: string }>;
};

export type UsePrintContentOptions = {
    documentTitle: string;
    format?: PrintPageFormat;
    /** Titre répété en marge haute à l'impression — ex. « Liste des enfants — 1/3 » */
    runningHeaderLabel?: string;
    /** Règles CSS additionnelles injectées dans la fenêtre d'impression */
    extraPageStyle?: string;
    onBeforePrint?: () => void | Promise<void>;
    onAfterPrint?: () => void;
};
