import React from "react";
import { GroupeDto, TypeGroupe } from "../../types/api";
import { pastilleCouleursPourGroupe } from "../../helpers/couleurGroupe";
import styles from "./AffichageGroupesListe.module.scss";

export const SECTIONS_TYPE_GROUPE: { type: TypeGroupe; label: string }[] = [
    { type: "THEMATIQUE", label: "Thématique" },
    { type: "AGE", label: "Par âge" },
    { type: "NIVEAU_SCOLAIRE", label: "Par niveau scolaire" },
];

export function texteFiltreGroupes(groupes: GroupeDto[]): string {
    if (groupes.length === 0) return "—";
    return groupes.map((g) => g.nom).join(", ");
}

interface AffichageGroupesListeProps {
    groupes: GroupeDto[];
}

const AffichageGroupesListe: React.FC<AffichageGroupesListeProps> = ({ groupes }) => {
    if (groupes.length === 0) return "—";

    const lignes = SECTIONS_TYPE_GROUPE.map((section) => {
        const groupesSection = groupes
            .filter((g) => g.typeGroupe === section.type)
            .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
        if (groupesSection.length === 0) return null;
        return (
            <span key={section.type} className={styles.groupeLigne}>
                {groupesSection.map((groupe) => {
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
        );
    }).filter((ligne) => ligne != null);

    return <span className={styles.groupesAffichage}>{lignes}</span>;
};

export default AffichageGroupesListe;
