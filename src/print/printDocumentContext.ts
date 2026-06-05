import type { PrintDocumentContext } from "./types";

/** Construit un en-tête d'impression (titre du document + métadonnées optionnelles) */
export function buildPrintDocumentContext(
    documentLabel: string,
    meta?: PrintDocumentContext["meta"],
): PrintDocumentContext {
    return {
        documentLabel,
        meta,
    };
}
