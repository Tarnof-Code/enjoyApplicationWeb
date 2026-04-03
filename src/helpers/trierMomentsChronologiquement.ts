import type { MomentDto } from "../types/api";

/**
 * Même logique que le backend : ORDER BY COALESCE(ordre, id), id ASC.
 */
export function trierMomentsChronologiquement(moments: MomentDto[]): MomentDto[] {
    return [...moments].sort((a, b) => {
        const oa = a.ordre ?? a.id;
        const ob = b.ordre ?? b.id;
        if (oa !== ob) return oa - ob;
        return a.id - b.id;
    });
}
