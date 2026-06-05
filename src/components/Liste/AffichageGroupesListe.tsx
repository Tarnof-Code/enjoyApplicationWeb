import React from "react";
import { GroupeDto } from "../../types/api";
import { pastilleCouleursPourGroupe } from "../../helpers/couleurGroupe";
import { groupesParSectionsType } from "../../helpers/groupesParType";
import styles from "./AffichageGroupesListe.module.scss";

export { SECTIONS_TYPE_GROUPE } from "../../helpers/groupesParType";

export function texteFiltreGroupes(groupes: GroupeDto[]): string {
    if (groupes.length === 0) return "—";
    return groupes.map((g) => g.nom).join(", ");
}

interface AffichageGroupesListeProps {
    groupes: GroupeDto[];
}

const AffichageGroupesListe: React.FC<AffichageGroupesListeProps> = ({ groupes }) => {
    if (groupes.length === 0) return "—";

    const lignes = groupesParSectionsType(groupes).map((section) => (
        <span key={section.type} className={styles.groupeLigne}>
            {section.groupes.map((groupe) => {
                const couleurs = pastilleCouleursPourGroupe(groupe.id);
                return (
                    <span
                        key={groupe.id}
                        className={styles.groupePastille}
                        style={{
                            color: couleurs.texte,
                            backgroundColor: couleurs.fond,
                            borderColor: couleurs.bordure,
                        }}
                    >
                        {groupe.nom}
                    </span>
                );
            })}
        </span>
    ));

    return <span className={styles.groupesAffichage}>{lignes}</span>;
};

export default AffichageGroupesListe;
