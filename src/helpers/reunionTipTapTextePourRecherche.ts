import type { ReunionContenuTipTapJson } from "../types/api";

function collectTexteTipTapRecursive(node: unknown, parts: string[]): void {
    if (node === null || node === undefined) return;
    if (typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.text === "string" && n.text.length > 0) parts.push(n.text);
    const content = n.content;
    if (Array.isArray(content)) {
        for (const child of content) collectTexteTipTapRecursive(child, parts);
    }
}

/** Concaténation brute des nœuds `text` (TipTap / ProseMirror) pour recherche locale. */
export function extraireTexteBrutDepuisTipTapJson(contenu: ReunionContenuTipTapJson | null | undefined): string {
    if (!contenu || typeof contenu !== "object") return "";
    const parts: string[] = [];
    collectTexteTipTapRecursive(contenu, parts);
    return parts.join(" ").replace(/\s+/g, " ").trim();
}
