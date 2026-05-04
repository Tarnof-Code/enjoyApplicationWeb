import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";
import styles from "./PlanningCalendrier.module.scss";

export type CalendrierCarteEditionAvecSuppressionProps = {
    /** Contenu du bouton principal (édition) */
    children: React.ReactNode;
    onEdit: () => void;
    editDisabled?: boolean;
    editAriaLabel: string;
    /** Bouton principal (typiquement `--plan-cal-carte-bg` pour menus unis / activités par type) */
    mainButtonStyle?: React.CSSProperties;
    onDeleteClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    deleteAriaLabel: string;
    deleteTitle?: string;
    deleteDisabled?: boolean;
};

/** Carte cliquable + bouton suppression (pattern planning activités / menus). */
export function CalendrierCarteEditionAvecSuppression({
    children,
    onEdit,
    editDisabled,
    editAriaLabel,
    mainButtonStyle,
    onDeleteClick,
    deleteAriaLabel,
    deleteTitle = "Supprimer",
    deleteDisabled,
}: CalendrierCarteEditionAvecSuppressionProps) {
    return (
        <div className={styles.carteBloc}>
            <button
                type="button"
                className={styles.carteBtn}
                style={mainButtonStyle}
                onClick={onEdit}
                disabled={editDisabled}
                aria-label={editAriaLabel}
            >
                {children}
            </button>
            <button
                className={styles.carteDeleteBtn}
                type="button"
                aria-label={deleteAriaLabel}
                title={deleteTitle}
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(e);
                }}
                disabled={deleteDisabled}
            >
                <FontAwesomeIcon icon={faTrash} />
            </button>
        </div>
    );
}
