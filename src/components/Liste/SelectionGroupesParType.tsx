import { FormGroup, Input, Label } from "reactstrap";
import type { GroupeDto } from "../../types/api";
import { groupesParSectionsType } from "../../helpers/groupesParType";
import styles from "./SelectionGroupesParType.module.scss";

export type SelectionGroupesParTypeProps = {
    groupes: GroupeDto[];
    isSelected: (groupeId: number) => boolean;
    onToggle: (groupeId: number) => void;
    disabled?: boolean;
    idPrefix?: string;
    emptyMessage?: string;
    /** `picker` : liste encadrée ; `inline` : cases reactstrap ; `planning` : cases planning organisation */
    appearance?: "picker" | "inline" | "planning";
};

export function SelectionGroupesParType({
    groupes,
    isSelected,
    onToggle,
    disabled = false,
    idPrefix = "grp",
    emptyMessage = "Aucun groupe sur ce séjour.",
    appearance = "picker",
}: SelectionGroupesParTypeProps) {
    const sections = groupesParSectionsType(groupes);
    if (sections.length === 0) {
        return <p className={styles.empty}>{emptyMessage}</p>;
    }

    if (appearance === "planning") {
        return (
            <div className={styles.planningSections}>
                {sections.map((section) => (
                    <div key={section.type} className={styles.planningSection}>
                        <div className={`${styles.sectionTitle} ${styles.planningSectionTitle}`}>
                            {section.label}
                        </div>
                        {section.groupes.map((g) => (
                            <FormGroup check key={g.id} className={styles.planningRow}>
                                <Label check>
                                    <Input
                                        type="checkbox"
                                        checked={isSelected(g.id)}
                                        onChange={() => onToggle(g.id)}
                                        disabled={disabled}
                                    />{" "}
                                    <span>{g.nom}</span>
                                </Label>
                            </FormGroup>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (appearance === "inline") {
        return (
            <div className={styles.inlineSections}>
                {sections.map((section) => (
                    <div key={section.type} className={styles.inlineSection}>
                        <div className={styles.sectionTitle}>{section.label}</div>
                        {section.groupes.map((g) => (
                            <div key={g.id} className={styles.inlineRow}>
                                <Input
                                    type="checkbox"
                                    id={`${idPrefix}-${g.id}`}
                                    checked={isSelected(g.id)}
                                    onChange={() => onToggle(g.id)}
                                    disabled={disabled}
                                />
                                <Label for={`${idPrefix}-${g.id}`} className="mb-0">
                                    {g.nom}
                                </Label>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.sections}>
            {sections.map((section) => (
                <section key={section.type} className={styles.section}>
                    <h3 className={styles.sectionTitle}>{section.label}</h3>
                    <ul className={styles.list}>
                        {section.groupes.map((g) => (
                            <li key={g.id} className={styles.row}>
                                <label className={styles.label}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={isSelected(g.id)}
                                        onChange={() => onToggle(g.id)}
                                        disabled={disabled}
                                    />
                                    <span>{g.nom}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

export type GroupesSelectOptionsProps = {
    groupes: GroupeDto[];
};

export function GroupesSelectOptions({ groupes }: GroupesSelectOptionsProps) {
    const sections = groupesParSectionsType(groupes);
    return (
        <>
            {sections.map((section) => (
                <optgroup key={section.type} label={section.label}>
                    {section.groupes.map((g) => (
                        <option key={g.id} value={String(g.id)}>
                            {g.nom}
                        </option>
                    ))}
                </optgroup>
            ))}
        </>
    );
}

export type GroupesFilterDropdownItemsProps = {
    groupes: GroupeDto[];
    isSelected: (groupeId: number) => boolean;
    onToggle: (groupeId: number) => void;
    itemClassName: string;
    checkboxClassName: string;
    labelClassName: string;
};

/** Cases à cocher groupées par type (filtres déroulants). */
export function GroupesFilterDropdownItems({
    groupes,
    isSelected,
    onToggle,
    itemClassName,
    checkboxClassName,
    labelClassName,
}: GroupesFilterDropdownItemsProps) {
    const sections = groupesParSectionsType(groupes);
    return (
        <>
            {sections.map((section) => (
                <div key={section.type}>
                    <div className={styles.filterSectionTitle}>{section.label}</div>
                    {section.groupes.map((g) => (
                        <label key={g.id} className={itemClassName}>
                            <Input
                                type="checkbox"
                                className={checkboxClassName}
                                checked={isSelected(g.id)}
                                onChange={() => onToggle(g.id)}
                            />
                            <span className={labelClassName}>{g.nom}</span>
                        </label>
                    ))}
                </div>
            ))}
        </>
    );
}
