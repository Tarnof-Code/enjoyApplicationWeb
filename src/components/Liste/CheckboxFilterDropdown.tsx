import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "reactstrap";
import {
    libelleResumeMultiselectFilter,
    type MultiselectFilterOption,
} from "../../helpers/multiselectFilter";
import styles from "./CheckboxFilterDropdown.module.scss";

export type CheckboxFilterOption = MultiselectFilterOption;

export interface CheckboxFilterDropdownProps {
    options: CheckboxFilterOption[];
    selectedValues: Set<string>;
    onSelectedValuesChange: (values: Set<string>) => void;
    ariaLabel: string;
    summaryWhenEmpty?: string;
    deselectAllLabel?: string;
    className?: string;
    /** Variante compacte pour les filtres d'en-tête de tableau */
    compact?: boolean;
    /** Contenu additionnel dans le panneau (ex. groupes par type) */
    panelExtra?: React.ReactNode;
}

export function CheckboxFilterDropdown({
    options,
    selectedValues,
    onSelectedValuesChange,
    ariaLabel,
    summaryWhenEmpty = "Tous",
    deselectAllLabel = "Tout désélectionner",
    className,
    compact = false,
    panelExtra,
}: CheckboxFilterDropdownProps) {
    const [panelOpen, setPanelOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const summary = useMemo(
        () => libelleResumeMultiselectFilter(options, selectedValues, summaryWhenEmpty),
        [options, selectedValues, summaryWhenEmpty],
    );

    useEffect(() => {
        if (!panelOpen) return;
        const fermerSiExterieur = (e: MouseEvent) => {
            const cible = e.target as Node;
            if (rootRef.current && !rootRef.current.contains(cible)) {
                setPanelOpen(false);
            }
        };
        document.addEventListener("mousedown", fermerSiExterieur);
        return () => document.removeEventListener("mousedown", fermerSiExterieur);
    }, [panelOpen]);

    const toggleValue = (value: string) => {
        const next = new Set(selectedValues);
        if (next.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }
        onSelectedValuesChange(next);
    };

    const deselectAll = () => {
        onSelectedValuesChange(new Set());
    };

    return (
        <div
            ref={rootRef}
            className={[
                styles.root,
                compact ? styles.rootCompact : undefined,
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                type="button"
                className={styles.btn}
                aria-haspopup="listbox"
                aria-expanded={panelOpen}
                aria-label={`${ariaLabel} : ${summary}`}
                onClick={() => setPanelOpen((v) => !v)}
            >
                <span className={styles.btnText}>{summary}</span>
                <span className={styles.chevron} aria-hidden>
                    &#9660;
                </span>
            </button>
            {panelOpen ? (
                <div
                    className={styles.panel}
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label={ariaLabel}
                >
                    <div className={styles.bulk}>
                        <Button
                            type="button"
                            color="link"
                            size="sm"
                            className={styles.bulkBtn}
                            onClick={deselectAll}
                        >
                            {deselectAllLabel}
                        </Button>
                    </div>
                    {panelExtra}
                    {options.map((option) => (
                        <label key={option.value} className={styles.item}>
                            <Input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={selectedValues.has(option.value)}
                                onChange={() => toggleValue(option.value)}
                            />
                            <span className={styles.itemLabel}>{option.label}</span>
                        </label>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
