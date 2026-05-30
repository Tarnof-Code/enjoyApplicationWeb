import { faClockRotateLeft, faTrash } from "@fortawesome/free-solid-svg-icons";
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
    /** Affichage seul : pas d’édition ni suppression */
    lectureSeule?: boolean;
    /** Contenu non cliquable ; le bouton supprimer reste actif si la ligne est éditable */
    carteNonCliquable?: boolean;
    /** Consulter l’historique des modifications (toujours hors du clic principal). */
    onHistoriqueClick?: () => void;
    historiqueAriaLabel?: string;
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
    lectureSeule,
    carteNonCliquable = false,
    onHistoriqueClick,
    historiqueAriaLabel = "Voir l'historique des modifications",
}: CalendrierCarteEditionAvecSuppressionProps) {
    const boutonPrincipalClass = [
        styles.carteBtn,
        lectureSeule || carteNonCliquable ? styles.carteBtnLectureSeule : "",
        (lectureSeule || carteNonCliquable) && onHistoriqueClick ? styles.carteBtnIcons : "",
        !lectureSeule && !carteNonCliquable && onHistoriqueClick ? styles.carteBtnAvecHistorique : "",
    ]
        .filter(Boolean)
        .join(" ");

    if (carteNonCliquable && !lectureSeule) {
        return (
            <div className={styles.carteBloc}>
                <div className={styles.carteSideActions}>
                    <button
                        className={`${styles.carteIconBtn} ${styles.carteIconBtnDanger}`}
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
                <div
                    className={boutonPrincipalClass}
                    style={mainButtonStyle}
                    role="group"
                    aria-label={editAriaLabel}
                >
                    {children}
                </div>
            </div>
        );
    }

    if (lectureSeule) {
        return (
            <div className={styles.carteBloc}>
                {onHistoriqueClick ? (
                    <div className={styles.carteSideActions}>
                        <button
                            type="button"
                            className={styles.carteIconBtn}
                            aria-label={historiqueAriaLabel}
                            title="Historique"
                            onClick={(e) => {
                                e.stopPropagation();
                                onHistoriqueClick();
                            }}
                        >
                            <FontAwesomeIcon icon={faClockRotateLeft} />
                        </button>
                    </div>
                ) : null}
                <div
                    className={boutonPrincipalClass}
                    style={mainButtonStyle}
                    role="group"
                    aria-label={editAriaLabel}
                >
                    {children}
                </div>
            </div>
        );
    }
    return (
        <div className={styles.carteBloc}>
            <div className={styles.carteSideActions}>
                {onHistoriqueClick ? (
                    <button
                        type="button"
                        className={styles.carteIconBtn}
                        aria-label={historiqueAriaLabel}
                        title="Historique"
                        onClick={(e) => {
                            e.stopPropagation();
                            onHistoriqueClick();
                        }}
                    >
                        <FontAwesomeIcon icon={faClockRotateLeft} />
                    </button>
                ) : null}
                <button
                    className={`${styles.carteIconBtn} ${styles.carteIconBtnDanger}`}
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
            <button
                type="button"
                className={boutonPrincipalClass}
                style={mainButtonStyle}
                onClick={onEdit}
                disabled={editDisabled}
                aria-label={editAriaLabel}
            >
                {children}
            </button>
        </div>
    );
}
