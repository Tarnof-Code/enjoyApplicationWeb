/** Firefox ne prend pas en charge les margin boxes `@page` (titres / numéros de page). */
export function supportsPageMarginBoxes(): boolean {
    if (typeof navigator === "undefined") return true;
    return !/firefox/i.test(navigator.userAgent);
}
