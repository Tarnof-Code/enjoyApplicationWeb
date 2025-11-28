import React, { useState } from 'react';
import Liste, { ColumnConfig } from '../../../components/Liste/Liste';
import { sejourService } from '../../../services/sejour.service';
import Sejour_form from '../../../components/Forms/Sejour_form';
import formaterDate from '../../../helpers/formaterDate';
import calculerDureeEnJours from '../../../helpers/calculerDureeEnJours';
import { useLoaderData, useNavigate } from 'react-router-dom';

interface Sejour {
  id: number;
  nom: string;
  description: string;
  lieuDuSejour: string;
  directeur: {
    tokenId: string;
    nom: string;
    prenom: string;
  };
  dateDebut: string;
  dateFin: string;
}

export async function sejoursAdminLoader() {
  try {
    const response = await sejourService.getAllSejours();
    return response;
  } catch (error) {
    console.error("Erreur chargement sejours admin", error);
    return [];
  }
}

const ListeSejoursAdmin: React.FC = () => {

  const sejours = useLoaderData() as Sejour[];
  const navigate = useNavigate();

  const [modalState, setModalState] = useState<{
    show: boolean;
    editingSejour: Sejour | null;
  }>({ show: false, editingSejour: null });

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
    filterType: type === 'select' ? 'select' : type === 'date' ? 'date' : 'text',
    ...options
  });

  const columns: ColumnConfig[] = [
    createColumn('nom', 'Nom'),
    createColumn('description', 'Description'),
    createColumn('lieuDuSejour', 'Lieu'),
    {
      key: 'directeur',
      label: 'Directeur',
      type: 'text',
      filterable: true,
      filterType: 'text',
      render: (value: any) => {
        return value ? `${value.prenom} ${value.nom}` : 'Non assigné';
      }
    },
    createColumn('dateDebut', 'Date de début', 'date', {
      filterable: true,
      filterType: 'date',
      render: (value: Date) => {
        return formaterDate(value);
      }
    }),
    createColumn('dateFin', 'Date de fin', 'date', {
      filterable: true,
      filterType: 'date',
      render: (value: Date) => {
        return formaterDate(value);
      }
    }),
    {
      key: 'duree',
      label: 'Durée',
      type: 'number',
      filterable: true,
      filterType: 'number',
      render: (_value: any, item: Sejour) => {
        return calculerDureeEnJours(item.dateDebut, item.dateFin) + " jours";
      }
    },
  ];

  const openModal = (sejour?: Sejour) => {
    setModalState({ show: true, editingSejour: sejour || null });
  };

  const closeModal = () => {
    setModalState({ show: false, editingSejour: null });
  };

  const refreshList = () => {
    navigate(".", { replace: true });
  };

  const handleDelete = async (sejour: Sejour, _index: number) => {
    try {
      await sejourService.deleteSejour(sejour.id);
    } catch (error) {
      console.error("Erreur lors de la suppression du séjour:", error);
      throw error;
    }
  };

  return (
    <Liste
      columns={columns}
      data={sejours}
      loading={false}
      title="Tous les séjours"
      addButtonText="Ajouter un Séjour"
      onAdd={() => openModal()}
      refreshList={refreshList}
      showModal={modalState.show && !modalState.editingSejour}
      onCloseModal={closeModal}
      formComponent={Sejour_form}
      canEdit={true}
      canAdd={true}
      canDelete={true}
      onDelete={handleDelete}
      showEditModal={modalState.show && !!modalState.editingSejour}
      onCloseEditModal={closeModal}
      editingItem={modalState.editingSejour}
      onOpenEditModal={(sejour) => openModal(sejour)}
    />
  );
};

export default ListeSejoursAdmin;

