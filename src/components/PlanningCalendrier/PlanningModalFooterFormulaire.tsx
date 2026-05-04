import { ModalFooter } from "reactstrap";
import type { ReactNode } from "react";
import styles from "./PlanningCalendrier.module.scss";

export type PlanningModalFooterFormulaireProps = {
    /** Message d’erreur ou contenu riche (affiché à gauche, `aria-live`) */
    messageErreur?: ReactNode;
    actions: ReactNode;
};

/** Pied de modal formulaire : zone d’erreur + actions (activités, menus, etc.). */
export function PlanningModalFooterFormulaire({ messageErreur, actions }: PlanningModalFooterFormulaireProps) {
    return (
        <ModalFooter className={styles.modalFooter}>
            <div className={styles.modalFooterMessage} aria-live="polite">
                {messageErreur ? (
                    typeof messageErreur === "string" ? (
                        <span className={styles.modalFooterError}>{messageErreur}</span>
                    ) : (
                        messageErreur
                    )
                ) : null}
            </div>
            <div className={styles.modalFooterActions}>{actions}</div>
        </ModalFooter>
    );
}
