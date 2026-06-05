import type { PrintDocumentContext, SejourPrintContext } from "./types";

/** Construit un en-tête d'impression à partir du contexte séjour + libellé du document */
export function buildSejourPrintDocumentContext(
    sejour: SejourPrintContext,
    documentLabel: string,
    meta?: PrintDocumentContext["meta"],
): PrintDocumentContext {
    return {
        titre: sejour.description?.trim() || undefined,
        sousTitre: sejour.lieu?.trim() || undefined,
        documentLabel,
        meta,
    };
}
