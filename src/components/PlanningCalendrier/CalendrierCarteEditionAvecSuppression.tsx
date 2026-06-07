import { faChild, faClockRotateLeft, faTrash } from "@fortawesome/free-solid-svg-icons";
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
    /** Gérer les enfants participants (toujours hors du clic principal). */
    onEnfantsClick?: () => void;
    enfantsAriaLabel?: string;
};

type CarteActionsSecondairesProps = {
    onEnfantsClick?: () => void;
    enfantsAriaLabel: string;
    onHistoriqueClick?: () => void;
    historiqueAriaLabel: string;
    onDeleteClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    deleteAriaLabel?: string;
    deleteTitle?: string;
    deleteDisabled?: boolean;
};

function CarteActionsSecondaires({
    onEnfantsClick,
    enfantsAriaLabel,
    onHistoriqueClick,
    historiqueAriaLabel,
    onDeleteClick,
    deleteAriaLabel,
    deleteTitle = "Supprimer",
    deleteDisabled,
}: CarteActionsSecondairesProps) {
    if (!onEnfantsClick && !onHistoriqueClick && !onDeleteClick) return null;

    return (
        <div className={styles.carteSideActions}>
            {onEnfantsClick ? (
                <button
                    type="button"
                    className={styles.carteIconBtn}
                    aria-label={enfantsAriaLabel}
                    title="Enfants participants"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEnfantsClick();
                    }}
                >
                    <FontAwesomeIcon icon={faChild} />
                </button>
            ) : null}
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
            {onDeleteClick ? (
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
            ) : null}
        </div>
    );
}

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
    onEnfantsClick,
    enfantsAriaLabel = "Gérer les enfants participants",
}: CalendrierCarteEditionAvecSuppressionProps) {
    const boutonPrincipalClass = [
        styles.carteBtn,
        lectureSeule || carteNonCliquable ? styles.carteBtnLectureSeule : "",
        (lectureSeule || carteNonCliquable) && (onHistoriqueClick || onEnfantsClick)
            ? styles.carteBtnIcons
            : "",
        !lectureSeule &&
        !carteNonCliquable &&
        (onHistoriqueClick || onEnfantsClick)
            ? styles.carteBtnAvecHistorique
            : "",
    ]
        .filter(Boolean)
        .join(" ");

    const actionsCommunes = {
        onEnfantsClick,
        enfantsAriaLabel,
        onHistoriqueClick,
        historiqueAriaLabel,
    };

    if (carteNonCliquable && !lectureSeule) {
        return (
            <div className={styles.carteBloc}>
                <CarteActionsSecondaires
                    {...actionsCommunes}
                    onDeleteClick={onDeleteClick}
                    deleteAriaLabel={deleteAriaLabel}
                    deleteTitle={deleteTitle}
                    deleteDisabled={deleteDisabled}
                />
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
                <CarteActionsSecondaires {...actionsCommunes} />
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
            <CarteActionsSecondaires
                {...actionsCommunes}
                onDeleteClick={onDeleteClick}
                deleteAriaLabel={deleteAriaLabel}
                deleteTitle={deleteTitle}
                deleteDisabled={deleteDisabled}
            />
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
