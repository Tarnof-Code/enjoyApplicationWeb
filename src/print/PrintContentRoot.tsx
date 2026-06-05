import type { FC, ReactNode, RefObject } from "react";
import { PRINT_GLOBAL_CLASS } from "./printGlobalClasses";

/** Conteneur racine à lier au `contentRef` de `usePrintContent` */
export const PrintContentRoot: FC<{
    contentRef: RefObject<HTMLDivElement | null>;
    className?: string;
    children: ReactNode;
}> = ({ contentRef, className, children }) => (
    <div
        ref={contentRef}
        className={[PRINT_GLOBAL_CLASS.contentRoot, className].filter(Boolean).join(" ")}
    >
        {children}
    </div>
);
