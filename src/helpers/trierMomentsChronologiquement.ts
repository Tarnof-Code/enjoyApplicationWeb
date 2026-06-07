import type { MomentDto } from "../types/api";
import { aplatirMomentsHierarchiquement } from "./construireArbreMoments";

/**
 * Ordre d'affichage des moments : hiérarchique (parcours profondeur d'abord) si parentId est utilisé,
 * sinon tri par ordre global (aligné backend COALESCE(ordre, id)).
 */
export function trierMomentsChronologiquement(moments: MomentDto[]): MomentDto[] {
    if (moments.some((m) => m.parentId != null)) {
        return aplatirMomentsHierarchiquement(moments).map(({ profondeur: _p, ...m }) => m);
    }
    return [...moments].sort((a, b) => {
        const oa = a.ordre ?? a.id;
        const ob = b.ordre ?? b.id;
        if (oa !== ob) return oa - ob;
        return a.id - b.id;
    });
}
