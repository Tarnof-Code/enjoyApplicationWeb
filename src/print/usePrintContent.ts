import { useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import { supportsPageMarginBoxes } from "./detectPrintCapabilities";
import { buildPrintPageStyle, type RunningHeaderMode } from "./printPageStyles";
import type { UsePrintContentOptions } from "./types";

function resolveRunningHeaderMode(runningHeaderLabel?: string): RunningHeaderMode | undefined {
    if (runningHeaderLabel == null || runningHeaderLabel === "") return undefined;
    return supportsPageMarginBoxes() ? "margin-box" : "fixed";
}

/**
 * Hook standard pour imprimer une zone React (react-to-print).
 *
 * Règle : un hook par instance — dans un `.map()`, encapsuler chaque ligne
 * dans un composant enfant dédié (voir `ReunionCompteRenduAccordionItem`).
 */
export function usePrintContent({
    documentTitle,
    format,
    runningHeaderLabel,
    runningHeaderLayout = "default",
    extraPageStyle,
    ignoreGlobalStyles,
    onBeforePrint,
    onAfterPrint,
}: UsePrintContentOptions) {
    const contentRef = useRef<HTMLDivElement>(null);
    const runningHeaderMode = resolveRunningHeaderMode(runningHeaderLabel);
    const fixedRunningHeader = runningHeaderMode === "fixed";

    const pageStyle = useMemo(
        () =>
            buildPrintPageStyle({
                format,
                extra: extraPageStyle,
                runningHeaderLabel,
                runningHeaderMode,
                runningHeaderLayout,
            }),
        [format, extraPageStyle, runningHeaderLabel, runningHeaderMode, runningHeaderLayout],
    );

    const print = useReactToPrint({
        contentRef,
        documentTitle,
        ignoreGlobalStyles,
        pageStyle,
        onBeforePrint: onBeforePrint ? () => Promise.resolve(onBeforePrint()) : undefined,
        onAfterPrint,
    });

    return {
        contentRef,
        print,
        fixedRunningHeaderLabel: fixedRunningHeader ? runningHeaderLabel : undefined,
    };
}

/** Impression de la page courante (navigation, listes pleine page) via le navigateur */
export function imprimerPageCourante(): void {
    window.print();
}
