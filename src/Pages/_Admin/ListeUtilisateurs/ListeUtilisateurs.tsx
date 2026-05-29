import React from "react";
import { useLoaderData } from "react-router-dom";
import { utilisateurService } from "../../../services/utilisateur.service";
import { ProfilUtilisateurDTO } from "../../../types/api";
import TableauUtilisateurs from "../../../components/Liste/TableauUtilisateurs";
import { throwRouteLoaderError } from "../../../helpers/routeError";

export async function utilisateursLoader() {
  try {
    const response = await utilisateurService.getAllUsers();
    return response.data;
  } catch (error) {
    throwRouteLoaderError(error);
  }
}

const ListeUtilisateurs: React.FC = () => {
  const users = useLoaderData() as ProfilUtilisateurDTO[];
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
