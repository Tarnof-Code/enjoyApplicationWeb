/**
 * Module d'impression Enjoy — point d'entrée unique.
 *
 * Deux stratégies selon le cas d'usage :
 *
 * 1. **Zone ciblée** (`usePrintContent` + `PrintContentRoot`)
 *    Compte rendu, fiche, ligne de liste, extrait de planning.
 *    Un composant enfant par élément dans un `.map()` (un ref / hook par instance).
 *
 * 2. **Page entière** (`imprimerPageCourante`)
 *    Liste pleine page, vue dédiée `/impression`.
 *    Marquer filtres / boutons avec `PRINT_GLOBAL_CLASS.noPrint`.
 *
 * Plannings / tableaux larges : `PRINT_STYLE_PRESETS.wideTable` recommandé ; orientation
 * portrait / paysage via le dialogue d'impression (`format: "landscape-a4"` seulement si besoin explicite).
 */

export { PRINT_GLOBAL_CLASS } from "./printGlobalClasses";
export {
    buildListePrintExtraStyle,
    buildPrintPageStyle,
    PRINT_CONTENT_PADDING,
    PRINT_PAGE_MARGIN_BOTTOM,
    PRINT_STYLE_PRESETS,
} from "./printPageStyles";
export { buildPrintDocumentContext } from "./printDocumentContext";
export { libelleFiltresListeActifs } from "./libelleFiltresListeActifs";
export { usePrintContent, imprimerPageCourante } from "./usePrintContent";
export { PrintDocumentHeader } from "./PrintDocumentHeader";
export { PrintRunningHeader } from "./PrintRunningHeader";
export { PrintContentRoot } from "./PrintContentRoot";
export { supportsPageMarginBoxes } from "./detectPrintCapabilities";
export { PrintTrigger } from "./PrintTrigger";
export type {
    PrintDocumentContext,
    PrintPageFormat,
    UsePrintContentOptions,
} from "./types";
