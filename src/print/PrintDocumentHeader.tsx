import type { FC } from "react";
import { PRINT_GLOBAL_CLASS as c } from "./printGlobalClasses";
import type { PrintDocumentContext } from "./types";

/** En-tête contextuel visible uniquement dans le document imprimé */
export const PrintDocumentHeader: FC<{ context: PrintDocumentContext }> = ({ context }) => {
    const { titre, sousTitre, documentLabel, meta } = context;
    const hasContent =
        Boolean(titre?.trim()) ||
        Boolean(sousTitre?.trim()) ||
        Boolean(documentLabel?.trim()) ||
        (meta != null && meta.length > 0);

    if (!hasContent) return null;

    return (
        <header className={`${c.only} ${c.documentHeader}`}>
            {titre?.trim() ? <p className={c.documentTitle}>{titre.trim()}</p> : null}
            {sousTitre?.trim() ? <p className={c.documentSubtitle}>{sousTitre.trim()}</p> : null}
            {documentLabel?.trim() ? <h2 className={c.documentLabel}>{documentLabel.trim()}</h2> : null}
            {meta != null && meta.length > 0 ? (
                <div className={c.documentMeta}>
                    {meta.map((row) => (
                        <p key={`${row.label}-${row.value}`} className={c.documentMetaRow}>
                            <strong>{row.label} :</strong> {row.value}
                        </p>
                    ))}
                </div>
            ) : null}
        </header>
    );
};
