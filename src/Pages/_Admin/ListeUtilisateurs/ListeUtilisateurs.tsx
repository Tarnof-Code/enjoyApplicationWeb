import React from "react";
import { useSelector } from "react-redux";
import { useLoaderData } from "react-router-dom";
import { utilisateurService } from "../../../services/utilisateur.service";
import Acces_non_autorise from "../../../Pages/Erreurs/Acces_non_autorise";
import { ProfilUtilisateurDTO } from "../../../types/api";
import TableauUtilisateurs from "../../../components/Liste/TableauUtilisateurs";
import { RoleSysteme } from "../../../enums/RoleSysteme";

export async function utilisateursLoader() {
  try {
    const response = await utilisateurService.getAllUsers();
    return response.data;
  } catch (error) {
    console.error("Erreur chargement utilisateurs", error);
    return [];
  }
}

const ListeUtilisateurs: React.FC = () => {
  const users = useLoaderData() as ProfilUtilisateurDTO[];
  const role = useSelector((state: any) => state.auth.role);
  if (role !== RoleSysteme.ADMIN) {
    return <Acces_non_autorise />;
  }
  return (
    <TableauUtilisateurs
      title="Liste des Utilisateurs"
      users={users}
      canAdd={true}
      canEdit={true}
      canDelete={true}
    />
  );
};

export default ListeUtilisateurs;
