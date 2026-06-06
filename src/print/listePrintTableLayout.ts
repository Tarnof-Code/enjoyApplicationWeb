import type { CSSProperties } from "react";

/** Largeur de colonne liste à l'impression — pleine page, colonnes réparties à parts égales */
export function listePrintColumnWidthStyle(columnCount: number): CSSProperties {
    const count = Math.max(1, columnCount);
    return { width: `${100 / count}%` };
}
