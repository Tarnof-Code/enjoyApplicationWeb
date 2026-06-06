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
    /** Force l'orientation en CSS ; si absent, le dialogue d'impression du navigateur s'applique. */
    format?: PrintPageFormat;
    /** Titre répété en marge haute à l'impression — ex. « Liste des enfants — 1/3 » */
    runningHeaderLabel?: string;
    /**
     * Mise en page de l'en-tête répété.
     * `title-page-split` : titre à gauche, numéro de page à droite (dossier enfant).
     */
    runningHeaderLayout?: "default" | "title-page-split";
    /** Règles CSS additionnelles injectées dans la fenêtre d'impression */
    extraPageStyle?: string;
    /** N'injecte que `pageStyle` (évite les largeurs de colonnes héritées du tableau écran) */
    ignoreGlobalStyles?: boolean;
    onBeforePrint?: () => void | Promise<void>;
    onAfterPrint?: () => void;
};
