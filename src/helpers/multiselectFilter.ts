export type MultiselectFilterOption = { value: string; label: string };

export function parseMultiselectFilterValue(value: string): Set<string> {
    if (!value.trim()) return new Set();
    try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
            return new Set(parsed.filter((v): v is string => typeof v === "string" && v.length > 0));
        }
    } catch {
        /* valeur legacy ou invalide */
    }
    return new Set();
}

export function stringifyMultiselectFilterValue(selected: Set<string>): string {
    if (selected.size === 0) return "";
    return JSON.stringify([...selected]);
}

export function libelleResumeMultiselectFilter(
    options: MultiselectFilterOption[],
    selected: Set<string>,
    summaryWhenEmpty = "Tous",
): string {
    if (selected.size === 0) return summaryWhenEmpty;
    const labels = options.filter((o) => selected.has(o.value)).map((o) => o.label);
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.length} sélectionné${labels.length > 1 ? "s" : ""}`;
}
