import type { FC } from "react";
import { Button } from "reactstrap";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PRINT_GLOBAL_CLASS } from "./printGlobalClasses";
import styles from "./Print.module.scss";

export type PrintTriggerProps = {
    onPrint: () => void;
    /** Libellé accessibilité */
    label?: string;
    disabled?: boolean;
    className?: string;
    /** Variante icône seule (toolbar) ou bouton texte */
    variant?: "icon" | "button";
    buttonText?: string;
};

/** Déclencheur d'impression standard — toujours marqué `enjoy-no-print` */
export const PrintTrigger: FC<PrintTriggerProps> = ({
    onPrint,
    label = "Imprimer",
    disabled,
    className,
    variant = "icon",
    buttonText = "Imprimer",
}) => {
    const classes = [PRINT_GLOBAL_CLASS.noPrint, variant === "icon" ? styles.triggerIcon : undefined, className]
        .filter(Boolean)
        .join(" ");

    if (variant === "button") {
        return (
            <Button
                color="secondary"
                size="sm"
                outline
                type="button"
                onClick={onPrint}
                disabled={disabled}
                className={classes}
                aria-label={label}
            >
                <FontAwesomeIcon icon={faPrint} className="me-1" />
                {buttonText}
            </Button>
        );
    }

    return (
        <Button
            color="secondary"
            size="sm"
            outline
            type="button"
            onClick={onPrint}
            disabled={disabled}
            className={classes}
            aria-label={label}
            title={label}
        >
            <FontAwesomeIcon icon={faPrint} />
        </Button>
    );
};
