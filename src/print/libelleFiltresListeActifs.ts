import {
    libelleResumeMultiselectFilter,
    parseMultiselectFilterValue,
} from "../helpers/multiselectFilter";

type ColonneFiltrable = {
    key: string;
    label: string;
    filterable?: boolean;
    filterType?: string;
    filterOptions?: { value: string; label: string }[];
};

/** Résumé textuel des filtres actifs pour l'en-tête d'impression */
export function libelleFiltresListeActifs(
    filters: Record<string, string>,
    columns: ColonneFiltrable[],
): string | undefined {
    const parties: string[] = [];

    for (const column of columns) {
        if (!column.filterable) continue;
        const raw = filters[`${column.key}Filter`]?.trim();
        if (!raw) continue;

        let libelleValeur = raw;
        if (column.filterType === "select" && column.filterOptions) {
            const opt = column.filterOptions.find((o) => o.value === raw);
            if (opt?.label) libelleValeur = opt.label;
        } else if (column.filterType === "multiselect" && column.filterOptions) {
            libelleValeur = libelleResumeMultiselectFilter(
                column.filterOptions,
                parseMultiselectFilterValue(raw),
            );
        }

        parties.push(`${column.label} : ${libelleValeur}`);
    }

    return parties.length > 0 ? parties.join(" · ") : undefined;
}
