import type { FC } from "react";
import { Button } from "reactstrap";
import type { ReunionDto } from "../../types/api";
import {
    PrintContentRoot,
    PrintTrigger,
    usePrintContent,
} from "../../print";
import { ReunionContenuRichText } from "./ReunionContenuRichText";
import styles from "./SectionReunionsSejour.module.scss";

export type ReunionCompteRenduAccordionItemProps = {
    reunion: ReunionDto;
    ouvert: boolean;
    dateFormatee: string;
    peutGererEcritures: boolean;
    onToggle: () => void;
    onModifier: () => void;
    onSupprimer: () => void;
};

export const ReunionCompteRenduAccordionItem: FC<ReunionCompteRenduAccordionItemProps> = ({
    reunion,
    ouvert,
    dateFormatee,
    peutGererEcritures,
    onToggle,
    onModifier,
    onSupprimer,
}) => {
    const { contentRef, print } = usePrintContent({
        documentTitle: `Compte rendu réunion — ${dateFormatee}`,
        runningHeaderLabel: `Compte rendu — ${dateFormatee}`,
    });

    const odj = reunion.ordreDuJour?.trim() ?? "";

    return (
        <div className={styles.reunionAccordionItem}>
            <button
                type="button"
                className={styles.reunionAccordionHeaderBtn}
                onClick={onToggle}
                aria-expanded={ouvert}
            >
                <span className={styles.reunionDateLine}>{dateFormatee}</span>
                {odj ? (
                    <>
                        <span className={styles.reunionHeaderSep} aria-hidden>
                            —
                        </span>
                        <span className={styles.reunionOdjLineHeader} title={odj}>
                            {odj}
                        </span>
                    </>
                ) : null}
            </button>
            {ouvert ? (
                <div className={styles.reunionBody}>
                    <PrintContentRoot contentRef={contentRef}>
                        {odj ? (
                            <div className={styles.reunionOdJDetail}>
                                <strong>Ordre du jour</strong>
                                {odj}
                            </div>
                        ) : null}
                        <ReunionContenuRichText
                            key={reunion.id}
                            editable={false}
                            value={reunion.contenu}
                        />
                    </PrintContentRoot>
                    {peutGererEcritures ? (
                        <div className={styles.detailActionsRow}>
                            <PrintTrigger
                                variant="button"
                                onPrint={() => print()}
                                label="Imprimer ce compte rendu"
                            />
                            <Button
                                color="secondary"
                                size="sm"
                                outline
                                onClick={onModifier}
                            >
                                Modifier
                            </Button>
                            <Button
                                color="danger"
                                size="sm"
                                outline
                                onClick={onSupprimer}
                            >
                                Supprimer
                            </Button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
