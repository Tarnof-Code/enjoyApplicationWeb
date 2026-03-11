import React from "react";
import { useRevalidator } from "react-router-dom";
import { ProfilUtilisateurDTO } from "../../types/api";
import TableauUtilisateurs from "./TableauUtilisateurs";
import { sejourEquipeService } from "../../services/sejour-equipe.service";
import { RoleSysteme } from "../../enums/RoleSysteme";

interface EquipeProps {
    membres: ProfilUtilisateurDTO[];
    sejourId: number;
}

const Equipe: React.FC<EquipeProps> = ({ membres, sejourId }) => {
    const revalidator = useRevalidator();

    const handleDeleteMembre = async (user: ProfilUtilisateurDTO) => {
        if (!user.tokenId) return;
        try {
            await sejourEquipeService.supprimerMembreEquipe(sejourId, user.tokenId);
            revalidator.revalidate();
        } catch (error) {
            console.error("Erreur lors du retrait du membre", error);
        }
    };

    return (
        <TableauUtilisateurs
            title="Membres de l'équipe"
            users={membres}
            excludedRoles={[RoleSysteme.DIRECTION, RoleSysteme.ADMIN]} 
            canAdd={true}
            canEdit={true}
            canDelete={true}
            sejourId={sejourId}
            onDelete={handleDeleteMembre}
            deleteConfirmationMessage={(user) => `Voulez-vous retirer ${user.prenom} ${user.nom} de l'équipe de ce séjour ?`}
        />
    )
}

export default Equipe;
