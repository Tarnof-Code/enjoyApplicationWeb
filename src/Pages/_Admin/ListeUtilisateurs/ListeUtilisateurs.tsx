import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
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

const Liste_utilisateurs: React.FC = () => {
  const [listUtilisateurs, setListUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalState, setModalState] = useState<{
    show: boolean;
    editingUser: Utilisateur | null;
  }>({ show: false, editingUser: null });
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  
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
        { value: 'ADJ_DIRECTION', label: 'Adj_Direction' },
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

  useEffect(() => {
    async function getUtilisateurs() {
      try {
        const response = await utilisateurService.getAllUsers();
        setListUtilisateurs(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Une erreur s'est produite :", error);
        setLoading(false);
      }
    }

    if (role === "ADMIN") {
      getUtilisateurs();
    }
  }, [refreshTrigger, role]);

  const openModal = useCallback((user?: Utilisateur) => {
    setModalState({ show: true, editingUser: user || null });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ show: false, editingUser: null });
  }, []);

  const refreshList = useCallback(() => {
    setRefreshTrigger(prev => !prev);
  }, []);

  const handleDelete = useCallback(async (user: Utilisateur, _index: number) => {
    try {
      const identifier = user.tokenId;
      if (!identifier) {
        throw new Error("Impossible de trouver l'identifiant de l'utilisateur");
      }
      await utilisateurService.deleteUser(String(identifier));
      // La liste sera rafraîchie automatiquement via refreshList appelé dans Liste.tsx
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      throw error; // Propager l'erreur pour que la modale reste ouverte
    }
  }, []);

  if (role !== "ADMIN") {
    return <Acces_non_autorise />;
  }

  return (
    <Liste
      columns={columns}
      data={listUtilisateurs}
      loading={loading}
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

export default Liste_utilisateurs;
