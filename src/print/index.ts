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
 * Plannings / tableaux larges : `format: "landscape-a4"` pour forcer le paysage en CSS
 * (+ `PRINT_STYLE_PRESETS.wideTable`). Sinon, portrait / paysage via le dialogue d'impression.
 */

export { PRINT_GLOBAL_CLASS } from "./printGlobalClasses";
export { buildPrintPageStyle, PRINT_CONTENT_PADDING, PRINT_STYLE_PRESETS } from "./printPageStyles";
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
