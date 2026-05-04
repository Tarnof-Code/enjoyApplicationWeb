import styles from "./PlanningCalendrier.module.scss";

/** Texte d’aide sous les cases « ajouter » du planning (clavier + souris). */
export function CalendrierCelluleAjoutHint({ texte }: { texte?: string }) {
    return (
        <span className={styles.cellAjoutHint} aria-hidden>
            {texte ?? "Cliquer pour ajouter"}
        </span>
    );
}
