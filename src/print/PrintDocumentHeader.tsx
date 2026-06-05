import type { FC } from "react";
import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";
import type { PrintDocumentContext } from "./types";

/** Métadonnées d'impression (effectifs, filtres…) — première page uniquement */
export const PrintDocumentHeader: FC<{ context: PrintDocumentContext }> = ({ context }) => {
    const { meta } = context;
    if (meta == null || meta.length === 0) return null;

    return (
        <header className={`${c.only} ${c.documentHeader}`}>
            <div className={c.documentMeta}>
                {meta.map((row) => (
                    <p key={`${row.label}-${row.value}`} className={c.documentMetaRow}>
                        <strong>{row.label} :</strong> {row.value}
                    </p>
                ))}
            </div>
        </header>
    );
};
