import React from "react";
import { useRevalidator } from "react-router-dom";
import { ProfilUtilisateurDTO } from "../../types/api";
import TableauUtilisateurs from "./TableauUtilisateurs";
import { sejourEquipeService } from "../../services/sejour-equipe.service";
import { RoleSysteme } from "../../enums/RoleSysteme";

interface EquipeProps {
    membres: ProfilUtilisateurDTO[];
    sejourId: number;
    /** Directeur du séjour ou adjoint : boutons ajout / édition / suppression */
    peutGererMembres: boolean;
}

const Equipe: React.FC<EquipeProps> = ({ membres, sejourId, peutGererMembres }) => {
    const revalidator = useRevalidator();

    const handleDeleteMembre = async (user: ProfilUtilisateurDTO) => {
        if (!user.tokenId) return;
        await sejourEquipeService.supprimerMembreEquipe(sejourId, user.tokenId);
        revalidator.revalidate();
    };

    return (
        <TableauUtilisateurs
            title="Membres de l'équipe"
            users={membres}
            excludedRoles={[RoleSysteme.DIRECTION, RoleSysteme.ADMIN]} 
            canAdd={peutGererMembres}
            canEdit={peutGererMembres}
            canDelete={peutGererMembres}
            sejourId={sejourId}
            onDelete={handleDeleteMembre}
            deleteConfirmationMessage={(user) => `Voulez-vous retirer ${user.prenom} ${user.nom} de l'équipe de ce séjour ?`}
        />
    )
}

export default Equipe;
