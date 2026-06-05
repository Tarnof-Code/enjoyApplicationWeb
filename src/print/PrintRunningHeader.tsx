import type { FC } from "react";
import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";

/**
 * En-tête fixe répété à l'impression (Firefox et navigateurs sans margin boxes).
 * La numérotation page/total est gérée via `@page` sur Chromium.
 */
export const PrintRunningHeader: FC<{ label: string }> = ({ label }) => (
    <div className={`${c.only} ${c.runningHeader}`} aria-hidden>
        <span className={c.runningHeaderTitle}>{label}</span>
    </div>
);
