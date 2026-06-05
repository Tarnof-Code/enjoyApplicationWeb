import type { FC, ReactNode, RefObject } from "react";
import { PrintRunningHeader } from "./PrintRunningHeader";
import { PRINT_GLOBAL_CLASS } from "./printGlobalClasses";

/** Conteneur racine à lier au `contentRef` de `usePrintContent` */
export const PrintContentRoot: FC<{
    contentRef: RefObject<HTMLDivElement | null>;
    className?: string;
    children: ReactNode;
    /** En-tête fixe (Firefox) — ne pas combiner avec margin boxes Chromium */
    fixedRunningHeaderLabel?: string;
}> = ({ contentRef, className, children, fixedRunningHeaderLabel }) => (
    <div
        ref={contentRef}
        className={[
            PRINT_GLOBAL_CLASS.contentRoot,
            fixedRunningHeaderLabel ? PRINT_GLOBAL_CLASS.withRunningHeader : undefined,
            className,
        ]
            .filter(Boolean)
            .join(" ")}
    >
        {fixedRunningHeaderLabel ? (
            <PrintRunningHeader label={fixedRunningHeaderLabel} />
        ) : null}
        {children}
    </div>
);
