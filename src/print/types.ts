/** Format de page pour les documents imprimés */
export type PrintPageFormat = "portrait-a4" | "landscape-a4";

/** En-tête contextuel affiché uniquement à l'impression (séjour, titre de liste, etc.) */
export type PrintDocumentContext = {
    /** Titre principal — ex. nom / description du séjour */
    titre?: string;
    /** Sous-titre — ex. lieu, période */
    sousTitre?: string;
    /** Intitulé du document — ex. « Compte rendu — 12/06/2026 » */
    documentLabel?: string;
    /** Paires label / valeur optionnelles (dates, effectifs, etc.) */
    meta?: ReadonlyArray<{ label: string; value: string }>;
};

/** Contexte séjour réutilisable pour les impressions liées à un séjour */
export type SejourPrintContext = {
    description?: string | null;
    lieu?: string | null;
    dateDebut?: string | number | null;
    dateFin?: string | number | null;
};

export type UsePrintContentOptions = {
    documentTitle: string;
    format?: PrintPageFormat;
    /** Règles CSS additionnelles injectées dans la fenêtre d'impression */
    extraPageStyle?: string;
    onBeforePrint?: () => void | Promise<void>;
    onAfterPrint?: () => void;
};
