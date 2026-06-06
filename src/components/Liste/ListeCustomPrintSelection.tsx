import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
} from "reactstrap";
import {
    buildListePrintExtraStyle,
    PrintContentRoot,
    PrintDocumentHeader,
    usePrintContent,
    type PrintDocumentContext,
} from "../../print";
import type { ColumnConfig } from "./Liste";
import { ListePrintTable } from "./ListePrintTable";
import styles from "./Liste.module.scss";

export type ListeCustomPrintSelectionProps<T extends Record<string, unknown>> = {
    isOpen: boolean;
    onClose: () => void;
    data: T[];
    visibleColumns: ColumnConfig[];
    defaultTitle: string;
    printRowLabel: (item: T) => string;
    printRowKey?: (item: T) => string | number;
    renderPrintCell: (column: ColumnConfig, item: T) => string;
    emptySelectionMessage?: string;
};

function defaultPrintRowKey<T extends Record<string, unknown>>(item: T): string | number {
    if (item.id != null) return item.id as string | number;
    return JSON.stringify(item);
}

export function ListeCustomPrintSelection<T extends Record<string, unknown>>({
    isOpen,
    onClose,
    data,
    visibleColumns,
    defaultTitle,
    printRowLabel,
    printRowKey = defaultPrintRowKey,
    renderPrintCell,
    emptySelectionMessage = "Aucune ligne disponible pour l'impression.",
}: ListeCustomPrintSelectionProps<T>) {
    const [customTitle, setCustomTitle] = useState(defaultTitle);
    const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

    const { contentRef, print, fixedRunningHeaderLabel } = usePrintContent({
        documentTitle: customTitle.trim() || defaultTitle,
        extraPageStyle: buildListePrintExtraStyle(visibleColumns.length),
        ignoreGlobalStyles: true,
        runningHeaderLabel: customTitle.trim() || defaultTitle,
    });

    const selectedData = useMemo(
        () => data.filter((item) => selectedKeys.has(printRowKey(item))),
        [data, printRowKey, selectedKeys],
    );

    const printHeaderContext = useMemo((): PrintDocumentContext => ({
        meta: [
            {
                label: "Lignes sélectionnées",
                value: `${selectedData.length} sur ${data.length}`,
            },
        ],
    }), [data.length, selectedData.length]);

    const resetModalState = () => {
        setCustomTitle(defaultTitle);
        setSelectedKeys(new Set(data.map((item) => printRowKey(item))));
    };

    useEffect(() => {
        if (isOpen) {
            resetModalState();
        }
    }, [isOpen, defaultTitle, data, printRowKey]);

    const closeModal = () => onClose();

    const toggleRow = (key: string | number) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedKeys(new Set(data.map((item) => printRowKey(item))));
    };

    const deselectAll = () => {
        setSelectedKeys(new Set());
    };

    const handlePrint = () => {
        if (selectedKeys.size === 0 || !customTitle.trim()) return;
        print();
        closeModal();
    };

    const canSubmit = selectedKeys.size > 0 && customTitle.trim().length > 0;

    return (
        <>
            <Modal isOpen={isOpen} toggle={closeModal} size="lg">
                <ModalHeader toggle={closeModal}>Impression personnalisée</ModalHeader>
                <ModalBody>
                    <div className={styles.customPrintTitleField}>
                        <Label for="custom-print-title">Titre du document</Label>
                        <Input
                            id="custom-print-title"
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder={defaultTitle}
                            maxLength={120}
                        />
                    </div>

                    <div className={styles.customPrintSelectionToolbar}>
                        <span className={styles.customPrintSelectionCount}>
                            {selectedKeys.size} / {data.length} sélectionné(s)
                        </span>
                        <div className={styles.customPrintSelectionActions}>
                            <Button color="link" size="sm" type="button" onClick={selectAll}>
                                Tout sélectionner
                            </Button>
                            <Button color="link" size="sm" type="button" onClick={deselectAll}>
                                Tout désélectionner
                            </Button>
                        </div>
                    </div>

                    {data.length === 0 ? (
                        <p className={styles.customPrintEmpty}>{emptySelectionMessage}</p>
                    ) : (
                        <div className={styles.customPrintRowList} role="group" aria-label="Lignes à imprimer">
                            {data.map((item) => {
                                const key = printRowKey(item);
                                return (
                                    <label key={String(key)} className={styles.customPrintRow}>
                                        <input
                                            type="checkbox"
                                            checked={selectedKeys.has(key)}
                                            onChange={() => toggleRow(key)}
                                        />
                                        <span>{printRowLabel(item)}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" type="button" onClick={closeModal}>
                        Annuler
                    </Button>
                    <Button color="primary" type="button" onClick={handlePrint} disabled={!canSubmit}>
                        Imprimer
                    </Button>
                </ModalFooter>
            </Modal>

            <PrintContentRoot
                contentRef={contentRef}
                fixedRunningHeaderLabel={fixedRunningHeaderLabel}
            >
                <PrintDocumentHeader context={printHeaderContext} />
                <ListePrintTable
                    visibleColumns={visibleColumns}
                    rows={selectedData}
                    getRowKey={(item, index) => {
                        const key = printRowKey(item);
                        return key != null ? String(key) : `custom-print-${index}`;
                    }}
                    renderPrintCell={renderPrintCell}
                    emptyMessage={emptySelectionMessage}
                />
            </PrintContentRoot>
        </>
    );
}
