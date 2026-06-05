import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { buildPrintPageStyle } from "./printPageStyles";
import type { UsePrintContentOptions } from "./types";

/**
 * Hook standard pour imprimer une zone React (react-to-print).
 *
 * Règle : un hook par instance — dans un `.map()`, encapsuler chaque ligne
 * dans un composant enfant dédié (voir `ReunionCompteRenduAccordionItem`).
 *
 * @example
 * const { contentRef, print } = usePrintContent({ documentTitle: "Liste enfants" });
 * return (
 *   <>
 *     <PrintContentRoot contentRef={contentRef}>…</PrintContentRoot>
 *     <PrintTrigger onPrint={print} />
 *   </>
 * );
 */
export function usePrintContent({
    documentTitle,
    format,
    extraPageStyle,
    onBeforePrint,
    onAfterPrint,
}: UsePrintContentOptions) {
    const contentRef = useRef<HTMLDivElement>(null);

    const print = useReactToPrint({
        contentRef,
        documentTitle,
        pageStyle: buildPrintPageStyle({ format, extra: extraPageStyle }),
        onBeforePrint: onBeforePrint ? () => Promise.resolve(onBeforePrint()) : undefined,
        onAfterPrint,
    });

    return { contentRef, print };
}

/** Impression de la page courante (navigation, listes pleine page) via le navigateur */
export function imprimerPageCourante(): void {
    window.print();
}
