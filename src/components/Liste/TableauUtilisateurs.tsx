import React from "react";
import { useRevalidator } from "react-router-dom";
import Liste, { ColumnConfig } from "./Liste";
import UserForm from "../Forms/UserForm";
import { ProfilUtilisateurDTO } from "../../types/api";
import calculerAge from "../../helpers/calculerAge";
import formaterDate from "../../helpers/formaterDate";
import { utilisateurService } from "../../services/utilisateur.service";
import { RoleSejour, RoleSejourLabels } from "../../enums/RoleSejour";
import { RoleSysteme, RoleSystemeLabels } from "../../enums/RoleSysteme";

interface TableauUtilisateursProps {
  users: ProfilUtilisateurDTO[];
  title?: string;
  excludedRoles?: string[];
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  sejourId?: number;
  onDelete?: (user: ProfilUtilisateurDTO) => Promise<void>;
  deleteConfirmationMessage?: (user: ProfilUtilisateurDTO) => string;
}

const TableauUtilisateurs: React.FC<TableauUtilisateursProps> = ({
  users,
  title = "Liste des Utilisateurs",
  excludedRoles = [],
  canAdd = true,
  canEdit = true,
  canDelete = true,
  sejourId,
  onDelete: customOnDelete,
  deleteConfirmationMessage
}) => {
  
  const revalidator = useRevalidator();

  const handleDefaultDelete = async (user: ProfilUtilisateurDTO) => {
      try {
        if (!user.tokenId) return;
        await utilisateurService.deleteUser(String(user.tokenId));
        revalidator.revalidate();
      } catch (error) {
        console.error("Erreur suppression", error);
      }
  };

  const createColumn = (key: string, label: string, type: ColumnConfig['type'] = 'text', options?: Partial<ColumnConfig>): ColumnConfig => ({
    key, label, type, filterable: true, filterType: type === 'select' ? 'select' : 'text', ...options
  });

  const roleSystemeColumn: ColumnConfig = createColumn('role', 'Rôle système', 'select', {
    filterOptions: [
      { value: '', label: 'Tous' },
      ...Object.values(RoleSysteme).map(role => ({
        value: role,
        label: RoleSystemeLabels[role]
      }))
    ],
    render: (value) => {
      if (!value) return '-';
      return RoleSystemeLabels[value as RoleSysteme] || value;
    }
  });

  const roleSejourColumn: ColumnConfig = createColumn('roleSejour', 'Rôle de séjour', 'custom', {
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'Tous' },
      ...Object.values(RoleSejour).map(role => ({
        value: role,
        label: RoleSejourLabels[role]
      }))
    ],
    render: (value, item) => {
      if (value) {
        return utilisateurService.getRoleSejourByGenre(value as string, item.genre);
      }
      return '-';
    }
  });

  const validiteColumn: ColumnConfig = createColumn('dateExpirationCompte', 'Validité', 'date', {
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'Toutes' },
      { value: 'Valide', label: 'Valides' },
      { value: 'Expiré', label: 'Expirés' }
    ],
    render: (_value, item) => {
      return formaterDate(item.dateExpirationCompte);
    }
  });

  const baseColumns: ColumnConfig[] = [
    createColumn('nom', 'Nom'),
    createColumn('prenom', 'Prénom'),
    createColumn('age', 'Age', 'custom', {
      filterType: 'number',
      render: (_, item) => `${calculerAge(item.dateNaissance)} ans`
    }),
    createColumn('genre', 'Genre', 'select', {
      filterOptions: [
        { value: '', label: 'Tous' },
        { value: 'Masculin', label: 'Masculin' },
        { value: 'Féminin', label: 'Féminin' }
      ]
    }),
    createColumn('email', 'Email', 'email'),
    createColumn('telephone', 'Téléphone', 'tel')
  ];

  // Construire les colonnes selon le contexte
  const columns: ColumnConfig[] = sejourId 
    ? [...baseColumns.slice(0, 3), roleSejourColumn, ...baseColumns.slice(3)]
    : [...baseColumns.slice(0, 3), roleSystemeColumn, ...baseColumns.slice(3), validiteColumn];

  const FormWithProps = (props: any) => (
    <UserForm 
        {...props} 
        excludedRoles={excludedRoles} 
        sejourId={sejourId}
    />
  );

  return (
    <Liste
      title={title}
      columns={columns}
      data={users}
      loading={false}
      onDelete={customOnDelete || handleDefaultDelete}
      canAdd={canAdd}
      canEdit={canEdit}
      canDelete={canDelete}
      formComponent={FormWithProps} 
      addButtonText="Ajouter un membre"
      deleteConfirmationMessage={deleteConfirmationMessage}
    />
  );
};

export default TableauUtilisateurs;
