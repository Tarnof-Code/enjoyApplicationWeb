/** Échappe une chaîne pour l'utiliser dans `content: "…"` (CSS généré à l'impression) */
export function escapeCssContent(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ").trim();
}
