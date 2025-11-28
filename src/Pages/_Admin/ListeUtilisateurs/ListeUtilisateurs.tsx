import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useLoaderData, useNavigate } from "react-router-dom";
import { utilisateurService } from "../../../services/utilisateur.service";
import formaterDate from "../../../helpers/formaterDate";
import calculerAge from "../../../helpers/calculerAge";
import Acces_non_autorise from "../../../Pages/Erreurs/Acces_non_autorise";
import Liste, { ColumnConfig } from "../../../components/Liste/Liste";
import User_form from "../../../components/Forms/User_form";

interface Utilisateur {
  nom: string;
  prenom: string;
  dateNaissance: number;
  role: string;
  genre: string;
  email: string;
  telephone: string;
  dateExpirationCompte: number;
  tokenId?: string;
}

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

  const users = useLoaderData() as Utilisateur[];
  const navigate = useNavigate();
  
  const [modalState, setModalState] = useState<{
    show: boolean;
    editingUser: Utilisateur | null;
  }>({ show: false, editingUser: null });
  
  const role = useSelector((state: any) => state.auth.role);

  const createColumn = (
    key: string, 
    label: string, 
    type: ColumnConfig['type'] = 'text',
    options?: Partial<ColumnConfig>
  ): ColumnConfig => ({
    key,
    label,
    type,
    filterable: true,
    filterType: type === 'select' ? 'select' : 'text',
    ...options
  });

  const columns: ColumnConfig[] = [
    createColumn('nom', 'Nom'),
    createColumn('prenom', 'Prénom'),
    createColumn('age', 'Age', 'custom', {
      filterType: 'number',
      render: (_, item) => `${calculerAge(item.dateNaissance)} ans`
    }),
    createColumn('role', 'Rôle', 'select', {
      filterOptions: [
        { value: '', label: 'Tous' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'DIRECTION', label: 'Direction' },
        { value: 'ADJ_DIRECTION', label: 'Adjoint' },
        { value: 'ANIM', label: 'Anim' },
        { value: 'ANIM_AS', label: 'Anim_AS' }
      ]
    }),
    createColumn('genre', 'Genre', 'select', {
      filterOptions: [
        { value: '', label: 'Tous' },
        { value: 'Masculin', label: 'Masculin' },
        { value: 'Féminin', label: 'Féminin' }
      ]
    }),
    createColumn('email', 'Email', 'email'),
    createColumn('telephone', 'Téléphone', 'tel'),
    createColumn('dateExpirationCompte', 'Validité', 'date', {
      filterType: 'select',
      filterOptions: [
        { value: '', label: 'Toutes' },
        { value: 'Valide', label: 'Valides' },
        { value: 'Expiré', label: 'Expirés' }
      ],
      render: (value) => formaterDate(value)
    })
  ];

  // Optimisation React 19 : Suppression de useCallback
  const openModal = (user?: Utilisateur) => {
    setModalState({ show: true, editingUser: user || null });
  };

  const closeModal = () => {
    setModalState({ show: false, editingUser: null });
  };

  const refreshList = () => {
    navigate(".", { replace: true });
  };

  const handleDelete = async (user: Utilisateur, _index: number) => {
    try {
      const identifier = user.tokenId;
      if (!identifier) throw new Error("Impossible de trouver l'identifiant");
      
      await utilisateurService.deleteUser(String(identifier));
      refreshList();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  if (role !== "ADMIN") {
    return <Acces_non_autorise />;
  }

  return (
    <Liste
      columns={columns}
      data={users} 
      loading={false} 
      title="Liste des Utilisateurs"
      addButtonText="Ajouter un Utilisateur"
      onAdd={() => openModal()}
      refreshList={refreshList}
      showModal={modalState.show && !modalState.editingUser}
      onCloseModal={closeModal}
      formComponent={User_form}
      canEdit={true}
      canAdd={true}
      canDelete={true}
      onDelete={handleDelete}
      showEditModal={modalState.show && !!modalState.editingUser}
      onCloseEditModal={closeModal}
      editingItem={modalState.editingUser}
      onOpenEditModal={(user) => openModal(user)}
    />
  );
};

export default ListeUtilisateurs;
