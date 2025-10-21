import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { utilisateurService } from "../../../services/utilisateur.service";
import formaterDate from "../../../helpers/formaterDate";
import calculerAge from "../../../helpers/calculerAge";
import Acces_non_autorise from "../../Erreurs/Acces_non_autorise";
import Liste, { ColumnConfig } from "../../../components/Liste/Liste";
import User_form from "../../../components/User_form/User_form";

// Interface pour un utilisateur
interface Utilisateur {
  nom: string;
  prenom: string;
  dateNaissance: number;
  role: string;
  genre: string;
  email: string;
  telephone: string;
  dateExpirationCompte: number;
}

const Liste_utilisateurs_refactored: React.FC = () => {
  const [listUtilisateurs, setListUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  
  const role = useSelector((state: any) => state.auth.role);

  // Configuration des colonnes
  const columns: ColumnConfig[] = [
    {
      key: 'nom',
      label: 'Nom',
      type: 'text',
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'prenom',
      label: 'Prénom',
      type: 'text',
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'age',
      label: 'Age',
      type: 'custom',
      filterable: true,
      filterType: 'number',
      render: (_, item) => `${calculerAge(item.dateNaissance)} ans`
    },
    {
      key: 'role',
      label: 'Rôle',
      type: 'select',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: '', label: 'Tous' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'DIRECTION', label: 'Direction' },
        { value: 'ADJ_DIRECTION', label: 'Adj_Direction' },
        { value: 'ANIM', label: 'Anim' },
        { value: 'ANIM_AS', label: 'Anim_AS' }
      ]
    },
    {
      key: 'genre',
      label: 'Genre',
      type: 'select',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: '', label: 'Tous' },
        { value: 'Masculin', label: 'Masculin' },
        { value: 'Féminin', label: 'Féminin' }
      ]
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      type: 'tel',
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'dateExpirationCompte',
      label: 'Validité',
      type: 'date',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: '', label: 'Toutes' },
        { value: 'Valide', label: 'Valides' },
        { value: 'Expiré', label: 'Expirés' }
      ],
      render: (value) => formaterDate(value)
    }
  ];

  // Chargement des données
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

  // Gestion de l'ajout
  const handleOpenModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleOpenEditModal = useCallback((user: Utilisateur) => {
    setEditingUser(user);
    setShowEditModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingUser(null);
  }, []);

  // Fonction de rafraîchissement
  const refreshList = useCallback(() => {
    setRefreshTrigger(prev => !prev);
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
      onAdd={handleOpenModal}
      refreshList={refreshList}
      showModal={showModal}
      onCloseModal={handleCloseModal}
      formComponent={User_form}
      canEdit={true}
      canAdd={true}
      showEditModal={showEditModal}
      onCloseEditModal={handleCloseEditModal}
      editingItem={editingUser}
      onOpenEditModal={handleOpenEditModal}
    />
  );
};

export default Liste_utilisateurs_refactored;
