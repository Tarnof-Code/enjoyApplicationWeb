import { useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { PrintTrigger } from "../../print";
import { ListeCustomPrintSelection } from "./ListeCustomPrintSelection";
import type { ColumnConfig } from "./Liste";
import styles from "./Liste.module.scss";

export type ListePrintActionsProps<T extends Record<string, unknown>> = {
    canPrintFiltered: boolean;
    canPrintCustom: boolean;
    onPrintFiltered: () => void;
    filteredCount: number;
    data: T[];
    visibleColumns: ColumnConfig[];
    defaultTitle: string;
    printRowLabel: (item: T) => string;
    printRowKey?: (item: T) => string | number;
    renderPrintCell: (column: ColumnConfig, item: T) => string;
    printTriggerClassName?: string;
};

export function ListePrintActions<T extends Record<string, unknown>>({
    canPrintFiltered,
    canPrintCustom,
    onPrintFiltered,
    filteredCount,
    data,
    visibleColumns,
    defaultTitle,
    printRowLabel,
    printRowKey,
    renderPrintCell,
    printTriggerClassName,
}: ListePrintActionsProps<T>) {
    const [choiceModalOpen, setChoiceModalOpen] = useState(false);
    const [customModalOpen, setCustomModalOpen] = useState(false);

    const openCustomModal = () => {
        setCustomModalOpen(true);
    };

    const closeCustomModal = () => {
        setCustomModalOpen(false);
    };

    const handlePrintClick = () => {
        if (canPrintFiltered && canPrintCustom) {
            setChoiceModalOpen(true);
            return;
        }
        if (canPrintCustom) {
            openCustomModal();
            return;
        }
        onPrintFiltered();
    };

    const chooseFiltered = () => {
        setChoiceModalOpen(false);
        onPrintFiltered();
    };

    const chooseCustom = () => {
        setChoiceModalOpen(false);
        openCustomModal();
    };

    return (
        <>
            <PrintTrigger
                variant="button"
                onPrint={handlePrintClick}
                label="Imprimer"
                buttonText="Imprimer"
                className={printTriggerClassName}
            />

            {canPrintFiltered && canPrintCustom ? (
                <Modal isOpen={choiceModalOpen} toggle={() => setChoiceModalOpen(false)}>
                    <ModalHeader toggle={() => setChoiceModalOpen(false)}>Imprimer</ModalHeader>
                    <ModalBody>
                        <p className={styles.printChoiceIntro}>Comment souhaitez-vous imprimer ?</p>
                        <div className={styles.printChoiceOptions}>
                            <Button
                                color="outline-secondary"
                                type="button"
                                className={styles.printChoiceOption}
                                onClick={chooseFiltered}
                            >
                                <span className={styles.printChoiceOptionTitle}>Liste filtrée</span>
                                <span className={styles.printChoiceOptionDesc}>
                                    Imprimer les {filteredCount} résultat(s) visibles avec les colonnes
                                    sélectionnées.
                                </span>
                            </Button>
                            <Button
                                color="outline-secondary"
                                type="button"
                                className={styles.printChoiceOption}
                                onClick={chooseCustom}
                            >
                                <span className={styles.printChoiceOptionTitle}>Sélection personnalisée</span>
                                <span className={styles.printChoiceOptionDesc}>
                                    Choisir les lignes à imprimer et définir un titre personnalisé.
                                </span>
                            </Button>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" type="button" onClick={() => setChoiceModalOpen(false)}>
                            Annuler
                        </Button>
                    </ModalFooter>
                </Modal>
            ) : null}

            {canPrintCustom ? (
                <ListeCustomPrintSelection
                    isOpen={customModalOpen}
                    onClose={closeCustomModal}
                    data={data}
                    visibleColumns={visibleColumns}
                    defaultTitle={defaultTitle}
                    printRowLabel={printRowLabel}
                    printRowKey={printRowKey}
                    renderPrintCell={renderPrintCell}
                />
            ) : null}
        </>
    );
}
